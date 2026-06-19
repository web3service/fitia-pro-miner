/**
 * FITIA PRO MINER — Backend Server
 * ============================================================
 * Express + Supabase + Gas Relayer (Polygon meta-tx)
 *
 * Endpoints:
 *   POST /api/auth/challenge     — Get wallet signature challenge
 *   POST /api/auth/login         — Login with signed challenge
 *   GET  /api/auth/session       — Validate session token
 *   POST /api/auth/register      — Email/password registration
 *   POST /api/auth/login-email   — Email/password login
 *   GET  /api/user/profile       — Get user profile
 *   PUT  /api/user/profile       — Update username/email
 *   POST /api/transactions       — Record a transaction
 *   GET  /api/transactions       — List user transactions
 *   POST /api/activity           — Record activity
 *   GET  /api/activity           — List recent activity
 *   GET  /api/leaderboard        — Get leaderboard
 *   POST /api/relay              — Submit meta-tx for relay
 *   GET  /api/relay/status/:id   — Check relay status
 *   GET  /api/health             — Health check
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SESSION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS || '7');
const RELAYER_ENABLED = process.env.RELAYER_ENABLED === 'true';

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key for server-side
);

// Polygon provider
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);

// Gas relayer wallet
let relayerWallet = null;
if (RELAYER_ENABLED && process.env.RELAYER_PRIVATE_KEY) {
  relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  console.log('[Relayer] Wallet loaded:', relayerWallet.address);
  console.log('[Relayer] POL balance check...');
  provider.getBalance(relayerWallet.address).then(bal => {
    const pol = ethers.formatEther(bal);
    console.log(`[Relayer] Balance: ${pol} POL`);
    if (parseFloat(pol) < parseFloat(process.env.RELAYER_MIN_POL_BALANCE || '10')) {
      console.warn(`⚠️  [Relayer] LOW POL BALANCE! Please refill the relayer wallet.`);
    }
  });
}

// Contract ABIs (Core only — what the relayer needs)
const CORE_ABI = [
  "function executeMetaTx(address from, bytes data, uint256 deadline, bytes sig) external",
  "function metaDigest(address from, uint256 nonce, bytes data, uint256 deadline) view returns (bytes32)",
  "function nonce(address) view returns (uint256)",
  "function gasFee() view returns (uint256)",
  "function pol(address) view returns (uint256)",
];
const coreContract = process.env.CORE_CONTRACT
  ? new ethers.Contract(process.env.CORE_CONTRACT, CORE_ABI, provider)
  : null;

// ═══════════════════════════════════════════════════════════
// EXPRESS SETUP
// ═══════════════════════════════════════════════════════════
const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'combined'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts.' }
});
app.use('/api/auth/', authLimiter);

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════

function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      wallet: user.wallet_address,
      username: user.username,
      level: user.level,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = header.slice(7);
  try {
    // Check JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check Supabase session
    const { data: session } = await supabase
      .from('auth_sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ═══════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/auth/challenge
 * Request a challenge for wallet signature
 */
app.post('/api/auth/challenge', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const challenge = `Fitia Pro Auth: ${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean old challenges
    await supabase.rpc('clean_expired_challenges');

    // Store challenge
    const { error } = await supabase
      .from('auth_challenges')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        challenge,
        expires_at: expiresAt.toISOString(),
      });

    if (error) throw error;

    res.json({ challenge, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error('[Challenge] Error:', err.message);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * POST /api/auth/login
 * Login with wallet signature
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { walletAddress, signature, challenge } = req.body;
    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const addr = walletAddress.toLowerCase();

    // Verify challenge exists and is valid
    const { data: chal } = await supabase
      .from('auth_challenges')
      .select('*')
      .eq('wallet_address', addr)
      .eq('challenge', challenge)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!chal) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    // Verify signature
    const recovered = ethers.verifyMessage(challenge, signature);
    if (recovered.toLowerCase() !== addr) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Mark challenge as used
    await supabase
      .from('auth_challenges')
      .update({ used: true })
      .eq('id', chal.id);

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', addr)
      .single();

    const isNewUser = !user;

    if (!user) {
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({
          wallet_address: addr,
          username: `Miner_${addr.slice(2, 8)}`,
          level: 0,
          total_invested: 0,
          total_earned: 0,
          machines_count: 0,
        })
        .select()
        .single();

      if (createErr) throw createErr;
      user = newUser;
    }

    // Create session
    const token = generateToken(user);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await supabase.from('auth_sessions').insert({
      token,
      user_id: user.id,
      wallet_address: addr,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      expires_at: expiresAt.toISOString(),
    });

    res.json({
      token,
      isNewUser,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        level: user.level,
        totalInvested: user.total_invested,
        totalEarned: user.total_earned,
        machinesCount: user.machines_count,
      },
    });
  } catch (err) {
    console.error('[Login] Error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/session
 * Validate current session
 */
app.get('/api/auth/session', authMiddleware, async (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      walletAddress: req.user.wallet_address,
      username: req.user.username,
      email: req.user.email,
      level: req.user.level,
      totalInvested: req.user.total_invested,
      totalEarned: req.user.total_earned,
      machinesCount: req.user.machines_count,
    },
  });
});

/**
 * POST /api/auth/register
 * Email/password registration
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }

    // Check existing
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    // Create user (no wallet yet)
    const wallet_address = ethers.Wallet.createRandom().address; // placeholder until wallet linked

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        wallet_address,
        email: email.toLowerCase(),
        password_hash: `${salt}:${password_hash}`,
        username: username || email.split('@')[0],
        level: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Create session
    const token = generateToken(user);

    await supabase.from('auth_sessions').insert({
      token,
      user_id: user.id,
      wallet_address,
      expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        level: user.level,
      },
    });
  } catch (err) {
    console.error('[Register] Error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login-email
 * Email/password login
 */
app.post('/api/auth/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const [salt, storedHash] = user.password_hash.split(':');
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    if (computedHash !== storedHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const token = generateToken(user);

    await supabase.from('auth_sessions').insert({
      token,
      user_id: user.id,
      wallet_address: user.wallet_address,
      expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        level: user.level,
        totalInvested: user.total_invested,
        totalEarned: user.total_earned,
        machinesCount: user.machines_count,
      },
    });
  } catch (err) {
    console.error('[LoginEmail] Error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ═══════════════════════════════════════════════════════════
// USER ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * PUT /api/user/profile
 * Update username and email
 */
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};

    if (username && username.trim()) {
      updates.username = username.trim();
    }
    if (email && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        level: user.level,
        totalInvested: user.total_invested,
        totalEarned: user.total_earned,
        machinesCount: user.machines_count,
      },
    });
  } catch (err) {
    console.error('[Profile] Error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/user/profile
 */
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      walletAddress: req.user.wallet_address,
      username: req.user.username,
      email: req.user.email,
      level: req.user.level,
      totalInvested: req.user.total_invested,
      totalEarned: req.user.total_earned,
      machinesCount: req.user.machines_count,
    },
  });
});

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/transactions
 * Record a new transaction
 */
app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, tokenFrom, tokenTo, amountFrom, amountTo, txHash, metadata } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Transaction type required' });
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.user.id,
        wallet_address: req.user.wallet_address,
        tx_type: type,
        token_from: tokenFrom || '',
        token_to: tokenTo || '',
        amount_from: amountFrom || 0,
        amount_to: amountTo || 0,
        tx_hash: txHash || 'local',
        status: txHash ? 'confirmed' : 'pending',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Update user stats if needed
    const updates = {};
    if (type === 'buy_machine' || type === 'buy_battery') {
      if (amountFrom > 0) updates.total_invested = req.user.total_invested + parseFloat(amountFrom);
    }
    if (type === 'claim') {
      if (amountTo > 0) updates.total_earned = req.user.total_earned + parseFloat(amountTo);
    }
    if (type === 'buy_machine') {
      updates.machines_count = req.user.machines_count + 1;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', req.user.id);
    }

    res.status(201).json({ transaction: tx });
  } catch (err) {
    console.error('[Tx] Error:', err.message);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
});

/**
 * GET /api/transactions
 * List user transactions with optional type filter
 */
app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;

    // Aggregate stats
    const { data: stats, error: statsErr } = await supabase
      .rpc('get_tx_stats', { user_id_param: req.user.id });

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 200));

    if (type && type !== 'all') {
      query = query.eq('tx_type', type);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Compute stats if RPC not available
    const txStats = stats || {
      total: transactions.length,
      swaps: transactions.filter(t => t.tx_type === 'swap').length,
      machines: transactions.filter(t => t.tx_type === 'buy_machine').length,
      batteries: transactions.filter(t => t.tx_type === 'buy_battery').length,
      claims: transactions.filter(t => t.tx_type === 'claim').length,
      confirmed: transactions.filter(t => t.status === 'confirmed').length,
    };

    res.json({ transactions, stats: txStats });
  } catch (err) {
    console.error('[TxList] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ═══════════════════════════════════════════════════════════
// ACTIVITY ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/activity
 * Record user activity
 */
app.post('/api/activity', authMiddleware, async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });

    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: req.user.id,
        wallet_address: req.user.wallet_address,
        action,
        details: details || action,
      });

    if (error) throw error;

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[Activity] Error:', err.message);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * GET /api/activity
 * Get recent activity
 */
app.get('/api/activity', authMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data: activities, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 50));

    if (error) throw error;

    res.json({ activities });
  } catch (err) {
    console.error('[ActivityList] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ═══════════════════════════════════════════════════════════
// LEADERBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/leaderboard
 * Get leaderboard (top earners)
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Try materialized view first, fallback to direct query
    const { data: lb, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(Math.min(parseInt(limit), 100));

    if (error) {
      // Fallback: direct query
      const { data: users } = await supabase
        .from('users')
        .select('username, wallet_address, level, total_earned, machines_count')
        .order('total_earned', { ascending: false })
        .limit(Math.min(parseInt(limit), 100));

      return res.json({
        leaderboard: (users || []).map((u, i) => ({
          rank: i + 1,
          username: u.username,
          wallet_address: u.wallet_address,
          level: u.level,
          total_earned: u.total_earned,
          machines_count: u.machines_count,
        })),
      });
    }

    res.json({
      leaderboard: (lb || []).map(row => ({
        rank: row.rank,
        username: row.username,
        wallet_address: row.wallet_address,
        level: row.level,
        total_earned: row.total_earned,
        machines_count: row.machines_count,
        total_claims: row.total_claims,
        total_swaps: row.total_swaps,
      })),
    });
  } catch (err) {
    console.error('[Leaderboard] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ═══════════════════════════════════════════════════════════
// GAS RELAYER ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/relay
 * Submit a meta-transaction for gasless relay
 *
 * The Core contract's executeMetaTx allows a relayer to submit
 * transactions on behalf of users, debiting POL from their
 * internal balance as gas payment.
 */
app.post('/api/relay', authMiddleware, async (req, res) => {
  if (!RELAYER_ENABLED || !relayerWallet) {
    return res.status(503).json({ error: 'Gas relayer is not available' });
  }

  if (!coreContract) {
    return res.status(503).json({ error: 'Core contract not configured' });
  }

  try {
    const { data, deadline } = req.body;
    if (!data || !deadline) {
      return res.status(400).json({ error: 'Missing data or deadline' });
    }

    const userAddr = req.user.wallet_address;
    const deadlineTs = parseInt(deadline);

    if (deadlineTs < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ error: 'Deadline expired' });
    }

    // Check relayer POL balance
    const relayerBal = await provider.getBalance(relayerWallet.address);
    const minBal = ethers.parseEther(process.env.RELAYER_MIN_POL_BALANCE || '10');
    if (relayerBal < minBal) {
      console.error('[Relayer] Insufficient POL balance');
      return res.status(503).json({ error: 'Relayer temporarily unavailable — low gas balance' });
    }

    // Check user has enough POL in Core for gas
    const userPolBal = await coreContract.pol(userAddr);
    const gasFee = await coreContract.gasFee();
    if (userPolBal < gasFee) {
      return res.status(400).json({
        error: 'Insufficient POL balance for gas fees. Please deposit POL to Core first.',
        required: ethers.formatEther(gasFee),
        available: ethers.formatEther(userPolBal),
      });
    }

    // Get user nonce
    const nonce = await coreContract.nonce(userAddr);

    // Compute meta-tx digest
    const digest = await coreContract.metaDigest(userAddr, nonce, data, deadlineTs);

    // Sign with relayer's key (the signature proves relayer authorizes this)
    // NOTE: In the Core contract, the relayer doesn't sign — the USER signs the meta-tx.
    // The relayer just submits it and gets reimbursed via gasFee from the user's pol balance.
    // The frontend should have the user sign the metaDigest and send the signature here.

    const { signature } = req.body; // User's signature of the metaDigest
    if (!signature) {
      return res.status(400).json({ error: 'Missing user signature for meta-tx' });
    }

    // Submit meta-tx via relayer
    const coreWithSigner = coreContract.connect(relayerWallet);

    // Estimate gas
    let gasLimit;
    try {
      gasLimit = await coreWithSigner.executeMetaTx.estimateGas(
        userAddr, data, deadlineTs, signature
      );
      // Add 20% buffer
      gasLimit = gasLimit * 120n / 100n;
    } catch (estErr) {
      console.error('[Relayer] Gas estimation failed:', estErr.message);
      return res.status(400).json({
        error: 'Transaction would fail. Check parameters and retry.',
        details: estErr.shortMessage || estErr.message,
      });
    }

    // Execute
    const tx = await coreWithSigner.executeMetaTx(
      userAddr, data, deadlineTs, signature,
      { gasLimit }
    );

    // Log relay
    const { error: logErr } = await supabase
      .from('relay_log')
      .insert({
        user_id: req.user.id,
        wallet_address: userAddr,
        tx_hash: tx.hash,
        gas_spent: 0, // Will update after receipt
        gas_reimbursed: parseFloat(ethers.formatEther(gasFee)),
        status: 'pending',
        raw_tx: data,
      });

    if (logErr) console.error('[RelayLog] Error:', logErr.message);

    // Wait for receipt in background
    tx.wait().then(async (receipt) => {
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      await supabase
        .from('relay_log')
        .update({
          gas_spent: parseFloat(ethers.formatEther(gasUsed)),
          status: receipt.status === 1 ? 'relayed' : 'failed',
        })
        .eq('tx_hash', tx.hash);

      console.log(`[Relayer] Tx ${tx.hash.slice(0,10)}... ${receipt.status === 1 ? '✅' : '❌'} Gas: ${ethers.formatEther(gasUsed)} POL`);
    }).catch(err => {
      console.error('[Relayer] Receipt error:', err.message);
    });

    res.json({
      txHash: tx.hash,
      status: 'pending',
      polygonscan: `https://polygonscan.com/tx/${tx.hash}`,
    });
  } catch (err) {
    console.error('[Relayer] Error:', err.message);
    res.status(500).json({
      error: 'Relay failed',
      details: err.shortMessage || err.message,
    });
  }
});

/**
 * GET /api/relay/status/:txHash
 * Check relay transaction status
 */
app.get('/api/relay/status/:txHash', authMiddleware, async (req, res) => {
  try {
    const { data: relay } = await supabase
      .from('relay_log')
      .select('*')
      .eq('tx_hash', req.params.txHash)
      .eq('user_id', req.user.id)
      .single();

    if (!relay) {
      return res.status(404).json({ error: 'Relay transaction not found' });
    }

    // Check on-chain status
    const receipt = await provider.getTransactionReceipt(req.params.txHash);
    const status = receipt
      ? (receipt.status === 1 ? 'relayed' : 'failed')
      : relay.status;

    res.json({ ...relay, onchain_status: status });
  } catch (err) {
    console.error('[RelayStatus] Error:', err.message);
    res.status(500).json({ error: 'Failed to check relay status' });
  }
});

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  const checks = {
    server: 'ok',
    supabase: 'unknown',
    rpc: 'unknown',
    relayer: RELAYER_ENABLED ? 'disabled' : 'disabled',
  };

  try {
    const { data } = await supabase.from('server_config').select('value').eq('key', 'api_version').single();
    checks.supabase = data ? 'ok' : 'degraded';
  } catch (e) {
    checks.supabase = 'error: ' + e.message;
  }

  try {
    const bn = await provider.getBlockNumber();
    checks.rpc = `ok (block ${bn})`;
  } catch (e) {
    checks.rpc = 'error: ' + e.message;
  }

  if (RELAYER_ENABLED && relayerWallet) {
    try {
      const bal = await provider.getBalance(relayerWallet.address);
      checks.relayer = `active (${ethers.formatEther(bal)} POL)`;
    } catch (e) {
      checks.relayer = 'error: ' + e.message;
    }
  }

  res.json(checks);
});

// ═══════════════════════════════════════════════════════════
// CRON JOBS (via Supabase pg_cron or external)
// ═══════════════════════════════════════════════════════════
async function runMaintenance() {
  try {
    await supabase.rpc('clean_expired_challenges');
    await supabase.rpc('clean_expired_sessions');
    console.log('[Cron] Maintenance complete');
  } catch (err) {
    console.error('[Cron] Error:', err.message);
  }
}

// Run every 15 minutes
setInterval(runMaintenance, 15 * 60 * 1000);

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       FITIA PRO MINER — Backend Server       ║
╠══════════════════════════════════════════════╣
║  Port:     ${String(PORT).padEnd(36)}║
║  Supabase: ${(process.env.SUPABASE_URL || 'not set').slice(0, 36).padEnd(36)}║
║  Relayer:  ${(RELAYER_ENABLED ? 'ENABLED' : 'disabled').padEnd(36)}║
║  Network:  Polygon Mainnet (137)         ║
╚══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  process.exit(0);
});
