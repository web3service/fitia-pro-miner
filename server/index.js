/**
 * FITIA PRO MINER — Backend Server v2
 * Safe startup — shows clear errors if env vars missing
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// ═══ REQUIRED ENV CHECK ═══
const REQUIRED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY',
  'CORE_CONTRACT', 'POLYGON_RPC_URL',
  'JWT_SECRET'
];

const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ MISSING ENVIRONMENT VARIABLES:');
  missing.forEach(k => console.error(`   - ${k}`));
  console.error('\nAvailable SUPABASE/CORE/POLYGON/JWT vars: ' + 
    Object.keys(process.env).filter(k => 
      k.startsWith('SUPABASE') || k.startsWith('CORE') || 
      k.startsWith('POLYGON') || k.startsWith('JWT') || 
      k.startsWith('RELAYER') || k.startsWith('FTA') ||
      k.startsWith('MINE') || k.startsWith('USDT') ||
      k.startsWith('NODE') || k.startsWith('PORT') ||
      k.startsWith('SESSION') || k.startsWith('LOG') ||
      k.startsWith('API') || k.startsWith('CORS')
    ).join(', ') || '(NONE FOUND)'
  );
  console.error('\n⚠️  Check Render Dashboard → Environment');
  process.exit(1);
}

console.log('✅ All required env vars present');

// ═══ CONFIG ═══
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS || '7');
const RELAYER_ENABLED = process.env.RELAYER_ENABLED === 'true';

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
console.log('[DB] Supabase:', process.env.SUPABASE_URL);

// Polygon
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
console.log('[RPC] Polygon:', process.env.POLYGON_RPC_URL);

// Relayer
let relayerWallet = null;
if (RELAYER_ENABLED && process.env.RELAYER_PRIVATE_KEY) {
  try {
    relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    console.log('[Relayer] Wallet:', relayerWallet.address);
    provider.getBalance(relayerWallet.address).then(bal => {
      console.log('[Relayer] Balance:', ethers.formatEther(bal), 'POL');
    });
  } catch(e) {
    console.error('[Relayer] Invalid key:', e.message);
  }
} else {
  console.log('[Relayer] Disabled');
}

// ═══ EXPRESS ═══
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ═══ HELPERS ═══
function generateToken(user) {
  return jwt.sign(
    { sub: user.id, wallet: user.wallet_address, username: user.username, level: user.level, iat: Math.floor(Date.now()/1000) },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: session } = await supabase.from('auth_sessions').select('user_id, expires_at').eq('token', token).single();
    if (!session || new Date(session.expires_at) < new Date()) return res.status(401).json({ error: 'Session expired' });
    const { data: user } = await supabase.from('users').select('*').eq('id', session.user_id).single();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ═══ HEALTH ═══
app.get('/api/health', async (req, res) => {
  res.json({ server: 'ok', supabase: 'connected', port: PORT, relayer: relayerWallet ? relayerWallet.address : 'disabled' });
});

// ═══ AUTH ═══
app.post('/api/auth/challenge', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) return res.status(400).json({ error: 'Invalid wallet' });
    const challenge = 'Fitia Pro Auth: ' + crypto.randomBytes(32).toString('hex');
    await supabase.from('auth_challenges').insert({
      wallet_address: walletAddress.toLowerCase(),
      challenge,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    res.json({ challenge });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { walletAddress, signature, challenge } = req.body;
    if (!walletAddress || !signature || !challenge) return res.status(400).json({ error: 'Missing fields' });
    const addr = walletAddress.toLowerCase();
    const { data: chal } = await supabase.from('auth_challenges').select('*').eq('wallet_address', addr).eq('challenge', challenge).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single();
    if (!chal) return res.status(400).json({ error: 'Invalid challenge' });
    const recovered = ethers.verifyMessage(challenge, signature);
    if (recovered.toLowerCase() !== addr) return res.status(401).json({ error: 'Bad signature' });
    await supabase.from('auth_challenges').update({ used: true }).eq('id', chal.id);
    let { data: user } = await supabase.from('users').select('*').eq('wallet_address', addr).single();
    const isNewUser = !user;
    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        wallet_address: addr, username: 'Miner_' + addr.slice(2,8), level: 0, total_invested: 0, total_earned: 0, machines_count: 0
      }).select().single();
      user = newUser;
    }
    const token = generateToken(user);
    await supabase.from('auth_sessions').insert({
      token, user_id: user.id, wallet_address: addr,
      expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
    });
    res.json({ token, isNewUser, user: { id: user.id, walletAddress: user.wallet_address, username: user.username, email: user.email, level: user.level, totalInvested: user.total_invested, totalEarned: user.total_earned, machinesCount: user.machines_count } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/session', authMiddleware, async (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, walletAddress: req.user.wallet_address, username: req.user.username, email: req.user.email, level: req.user.level, totalInvested: req.user.total_invested, totalEarned: req.user.total_earned, machinesCount: req.user.machines_count } });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || password.length < 8) return res.status(400).json({ error: 'Email + password (8+ chars) required' });
    const { data: exists } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
    if (exists) return res.status(409).json({ error: 'Email exists' });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const wa = ethers.Wallet.createRandom().address;
    const { data: user } = await supabase.from('users').insert({
      wallet_address: wa, email: email.toLowerCase(), password_hash: salt + ':' + hash, username: username || email.split('@')[0], level: 0
    }).select().single();
    const token = generateToken(user);
    await supabase.from('auth_sessions').insert({ token, user_id: user.id, wallet_address: wa, expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
    res.status(201).json({ token, user: { id: user.id, walletAddress: user.wallet_address, username: user.username, email: user.email, level: user.level } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email + password required' });
    const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Bad credentials' });
    const parts = user.password_hash.split(':');
    if (crypto.pbkdf2Sync(password, parts[0], 100000, 64, 'sha512').toString('hex') !== parts[1]) return res.status(401).json({ error: 'Bad credentials' });
    const token = generateToken(user);
    await supabase.from('auth_sessions').insert({ token, user_id: user.id, wallet_address: user.wallet_address, expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
    res.json({ token, user: { id: user.id, walletAddress: user.wallet_address, username: user.username, email: user.email, level: user.level, totalInvested: user.total_invested, totalEarned: user.total_earned, machinesCount: user.machines_count } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══ USER ═══
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};
    if (username && username.trim()) updates.username = username.trim();
    if (email && email.trim()) updates.email = email.trim().toLowerCase();
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
    const { data: user } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    res.json({ user: { id: user.id, walletAddress: user.wallet_address, username: user.username, email: user.email, level: user.level, totalInvested: user.total_invested, totalEarned: user.total_earned, machinesCount: user.machines_count } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  res.json({ user: { id: req.user.id, walletAddress: req.user.wallet_address, username: req.user.username, email: req.user.email, level: req.user.level, totalInvested: req.user.total_invested, totalEarned: req.user.total_earned, machinesCount: req.user.machines_count } });
});

// ═══ TRANSACTIONS ═══
app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, tokenFrom, tokenTo, amountFrom, amountTo, txHash, metadata } = req.body;
    if (!type) return res.status(400).json({ error: 'Type required' });
    const { data: tx } = await supabase.from('transactions').insert({
      user_id: req.user.id, wallet_address: req.user.wallet_address, tx_type: type,
      token_from: tokenFrom || '', token_to: tokenTo || '',
      amount_from: amountFrom || 0, amount_to: amountTo || 0,
      tx_hash: txHash || 'local', status: txHash ? 'confirmed' : 'pending', metadata: metadata || {}
    }).select().single();
    res.status(201).json({ transaction: tx });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, limit } = req.query;
    const lim = Math.min(parseInt(limit || '100'), 200);
    let query = supabase.from('transactions').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(lim);
    if (type && type !== 'all') query = query.eq('tx_type', type);
    const { data: txns } = await query;
    const stats = {
      total: txns.length,
      swaps: txns.filter(t => t.tx_type === 'swap').length,
      machines: txns.filter(t => t.tx_type === 'buy_machine').length,
      batteries: txns.filter(t => t.tx_type === 'buy_battery').length,
      claims: txns.filter(t => t.tx_type === 'claim').length,
      confirmed: txns.filter(t => t.status === 'confirmed').length
    };
    res.json({ transactions: txns, stats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══ ACTIVITY ═══
app.post('/api/activity', authMiddleware, async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });
    await supabase.from('activity_log').insert({ user_id: req.user.id, wallet_address: req.user.wallet_address, action, details: details || action });
    res.status(201).json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/activity', authMiddleware, async (req, res) => {
  try {
    const { limit } = req.query;
    const lim = Math.min(parseInt(limit || '20'), 50);
    const { data: activities } = await supabase.from('activity_log').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(lim);
    res.json({ activities });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══ LEADERBOARD ═══
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { limit } = req.query;
    const lim = Math.min(parseInt(limit || '20'), 100);
    const { data: users } = await supabase.from('users').select('username, wallet_address, level, total_earned, machines_count').order('total_earned', { ascending: false }).limit(lim);
    res.json({ leaderboard: (users || []).map((u, i) => ({ rank: i + 1, username: u.username, wallet_address: u.wallet_address, level: u.level, total_earned: u.total_earned, machines_count: u.machines_count })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══ RELAY ═══
app.post('/api/relay', authMiddleware, async (req, res) => {
  if (!relayerWallet) return res.status(503).json({ error: 'Relayer disabled' });
  try {
    const { data, deadline, signature } = req.body;
    if (!data || !deadline || !signature) return res.status(400).json({ error: 'Missing fields' });
    const coreContract = new ethers.Contract(process.env.CORE_CONTRACT, [
      "function executeMetaTx(address,bytes,uint256,bytes) external",
      "function pol(address) view returns (uint256)",
      "function gasFee() view returns (uint256)",
      "function nonce(address) view returns (uint256)"
    ], relayerWallet);
    const userPolBal = await coreContract.pol(req.user.wallet_address);
    const gasFee = await coreContract.gasFee();
    if (userPolBal < gasFee) return res.status(400).json({ error: 'Insufficient POL. Need ' + ethers.formatEther(gasFee) + ', have ' + ethers.formatEther(userPolBal) });
    const tx = await coreContract.executeMetaTx(req.user.wallet_address, data, parseInt(deadline), signature, { gasLimit: 500000n });
    await supabase.from('relay_log').insert({ user_id: req.user.id, wallet_address: req.user.wallet_address, tx_hash: tx.hash, gas_reimbursed: parseFloat(ethers.formatEther(gasFee)), status: 'pending', raw_tx: data });
    res.json({ txHash: tx.hash, status: 'pending' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/relay/status/:txHash', authMiddleware, async (req, res) => {
  try {
    const { data: relay } = await supabase.from('relay_log').select('*').eq('tx_hash', req.params.txHash).eq('user_id', req.user.id).single();
    if (!relay) return res.status(404).json({ error: 'Not found' });
    res.json(relay);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══ START ═══
app.listen(PORT, () => {
  console.log('Fitia API Server on port', PORT);
  console.log('DB:', process.env.SUPABASE_URL ? 'Supabase connected' : 'NO DB');
  console.log('RPC:', process.env.POLYGON_RPC_URL || 'NO RPC');
  console.log('Relayer:', relayerWallet ? relayerWallet.address : 'disabled');
});
fix startup
