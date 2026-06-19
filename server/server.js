/**
 * FITIA PRO MINER — server.js
 * Express API server for user accounts, transaction history & activity tracking.
 *
 * Start:  node server.js
 * Port:   3001 (default, or set PORT env var)
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const db = require('./database');

const PORT = process.env.PORT || 3001;
const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ── Auth Middleware ─────────────────────────────────────────────
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const session = db.validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.walletAddress = session.wallet_address;
  req.sessionToken = token;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = db.validateSession(token);
    if (session) {
      req.walletAddress = session.wallet_address;
      req.sessionToken = token;
    }
  }
  next();
}

// ════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/challenge
 * Generate a challenge message for wallet signature verification
 */
app.post('/api/auth/challenge', (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const nonce = uuidv4();
    const timestamp = Date.now();
    const challenge = `Sign this message to authenticate with FITIA PRO.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    res.json({ challenge, nonce, timestamp });
  } catch (err) {
    console.error('[Auth] Challenge error:', err.message);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

/**
 * POST /api/auth/login
 * Verify wallet signature and create session
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { walletAddress, signature, challenge } = req.body;
    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ error: 'walletAddress, signature, and challenge are required' });
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(challenge, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user exists, if not auto-register
    let user = db.getUserByAddress(walletAddress);
    const isNewUser = !user;
    if (!user) {
      user = db.createUser(walletAddress, null, null, null);
    }

    // Create session
    const token = uuidv4();
    const session = db.createSession(walletAddress, token, challenge);

    // Update last login
    db.updateUserStats(walletAddress, { last_login: new Date().toISOString() });

    // Log activity
    db.logActivity(walletAddress, isNewUser ? 'register' : 'login',
      isNewUser ? 'New user registered' : 'User logged in',
      { ip: req.ip, userAgent: req.get('user-agent') }
    );

    res.json({
      success: true,
      token: session.token,
      isNewUser,
      user: {
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        level: user.level,
        totalInvested: user.total_invested,
        totalEarned: user.total_earned,
        machinesCount: user.machines_count,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authRequired, (req, res) => {
  db.logoutSession(req.sessionToken);
  db.logActivity(req.walletAddress, 'logout', 'User logged out');
  res.json({ success: true });
});

/**
 * GET /api/auth/session — validate current session
 */
app.get('/api/auth/session', authRequired, (req, res) => {
  const user = db.getUserByAddress(req.walletAddress);
  res.json({
    valid: true,
    walletAddress: req.walletAddress,
    user: user ? {
      username: user.username,
      email: user.email,
      level: user.level,
      totalInvested: user.total_invested,
      totalEarned: user.total_earned,
      machinesCount: user.machines_count
    } : null
  });
});

// ════════════════════════════════════════════════════════════════
//  USER PROFILE ROUTES
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/user/profile
 */
app.get('/api/user/profile', authRequired, (req, res) => {
  const user = db.getUserByAddress(req.walletAddress);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = db.getTransactionStats(req.walletAddress);

  res.json({
    walletAddress: user.wallet_address,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    level: user.level,
    totalInvested: user.total_invested,
    totalEarned: user.total_earned,
    machinesCount: user.machines_count,
    createdAt: user.created_at,
    stats: stats || { total: 0, confirmed: 0, swaps: 0, machines: 0, batteries: 0, claims: 0 }
  });
});

/**
 * PUT /api/user/profile
 */
app.put('/api/user/profile', authRequired, (req, res) => {
  const { username, email, avatarUrl } = req.body;
  const updates = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const user = db.updateUserProfile(req.walletAddress, updates);
  db.logActivity(req.walletAddress, 'profile_update', 'Updated profile');
  res.json({ success: true, user });
});

// ════════════════════════════════════════════════════════════════
//  TRANSACTIONS ROUTES
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/transactions
 * Query params: limit, offset, type (optional filter)
 */
app.get('/api/transactions', authRequired, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type || null;

  const transactions = db.getTransactionsByAddress(req.walletAddress, limit, offset, type);
  const stats = db.getTransactionStats(req.walletAddress);

  // Parse metadata JSON
  const parsed = transactions.map(tx => ({
    ...tx,
    metadata: tx.metadata ? JSON.parse(tx.metadata) : null
  }));

  res.json({ transactions: parsed, stats });
});

/**
 * POST /api/transactions — record a new transaction
 */
app.post('/api/transactions', authRequired, (req, res) => {
  const { type, tokenFrom, tokenTo, amountFrom, amountTo, txHash, metadata } = req.body;

  if (!type) return res.status(400).json({ error: 'Transaction type is required' });

  const validTypes = ['swap', 'buy_machine', 'buy_battery', 'claim', 'send', 'receive', 'plug_in', 'deposit', 'withdraw', 'approve'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  const tx = db.createTransaction({
    walletAddress: req.walletAddress,
    type,
    tokenFrom: tokenFrom || null,
    tokenTo: tokenTo || null,
    amountFrom: amountFrom || null,
    amountTo: amountTo || null,
    txHash: txHash || null,
    status: txHash ? 'pending' : 'confirmed',
    metadata: metadata || null
  });

  // Update user stats
  const user = db.getUserByAddress(req.walletAddress);
  if (user) {
    const updates = {};
    if (type === 'buy_machine') updates.machines_count = (user.machines_count || 0) + 1;
    if (amountTo) {
      if (type === 'claim') updates.total_earned = (user.total_earned || 0) + amountTo;
      if (type === 'buy_machine' || type === 'buy_battery') updates.total_invested = (user.total_invested || 0) + (amountFrom || 0);
    }
    if (Object.keys(updates).length) {
      db.updateUserStats(req.walletAddress, updates);
    }
  }

  // Log activity
  db.logActivity(req.walletAddress, type,
    `${type}: ${tokenFrom||'?'} → ${tokenTo||'?'} (${amountFrom||0})`,
    { ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.json({ success: true, transaction: tx });
});

/**
 * PUT /api/transactions/:txHash — update status (confirm)
 */
app.put('/api/transactions/:txHash', authRequired, (req, res) => {
  const { txHash } = req.params;
  const { status, blockNumber } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required' });

  db.updateTransactionStatus(txHash, status, blockNumber || null);
  res.json({ success: true });
});

/**
 * GET /api/transactions/stats
 */
app.get('/api/transactions/stats', authRequired, (req, res) => {
  const stats = db.getTransactionStats(req.walletAddress);
  res.json(stats);
});

// ════════════════════════════════════════════════════════════════
//  ACTIVITY LOG ROUTES
// ════════════════════════════════════════════════════════════════

app.get('/api/activity', authRequired, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const activities = db.getActivityLog(req.walletAddress, limit, offset);
  res.json({ activities });
});

app.post('/api/activity', authRequired, (req, res) => {
  const { action, details } = req.body;
  if (!action) return res.status(400).json({ error: 'Action is required' });

  db.logActivity(req.walletAddress, action, details || null, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════
//  REFERRAL ROUTES
// ════════════════════════════════════════════════════════════════

app.get('/api/referrals', authRequired, (req, res) => {
  const commissions = db.getReferralCommissions(req.walletAddress, 50);
  res.json({ commissions });
});

// ════════════════════════════════════════════════════════════════
//  LEADERBOARD
// ════════════════════════════════════════════════════════════════

app.get('/api/leaderboard', optionalAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const leaderboard = db.getLeaderboard(limit);
  res.json({ leaderboard });
});

// ════════════════════════════════════════════════════════════════
//  HEALTH
// ════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  const stats = db.getDbStats();
  res.json({
    status: 'healthy',
    version: '1.0.0',
    network: 'polygon',
    ...stats
  });
});

// ════════════════════════════════════════════════════════════════
//  ERROR HANDLER
// ════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  ⚡ FITIA PRO MINER — API Server v1.0  ║
  ║  🚀 Running on http://localhost:${PORT}    ║
  ║  📊 Endpoints:                         ║
  ║    /api/auth/*    — Wallet auth        ║
  ║    /api/user/*    — User profiles      ║
  ║    /api/transactions — Tx history      ║
  ║    /api/activity  — Activity log       ║
  ║    /api/leaderboard — Rankings         ║
  ║    /api/health    — Server status      ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
