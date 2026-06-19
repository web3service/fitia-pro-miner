/**
 * FITIA PRO — database.js
 * SQLite database layer for user accounts, transaction history & activity logs.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'fitia.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address  TEXT    NOT NULL UNIQUE,
      username        TEXT,
      email           TEXT,
      avatar_url      TEXT,
      referral_code   TEXT    UNIQUE,
      referred_by     TEXT,
      level           INTEGER DEFAULT 0,
      total_invested  REAL    DEFAULT 0,
      total_earned    REAL    DEFAULT 0,
      machines_count  INTEGER DEFAULT 0,
      is_active       INTEGER DEFAULT 1,
      last_login      TEXT,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address  TEXT    NOT NULL,
      token           TEXT    NOT NULL UNIQUE,
      challenge       TEXT,
      expires_at      TEXT    NOT NULL,
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address  TEXT    NOT NULL,
      tx_type         TEXT    NOT NULL,  -- swap, buy_machine, buy_battery, claim, send, receive, plug_in, deposit, withdraw
      token_from      TEXT,              -- USDT, FTA, POL
      token_to        TEXT,              -- USDT, FTA, POL
      amount_from     REAL,
      amount_to       REAL,
      tx_hash         TEXT,
      status          TEXT    DEFAULT 'pending',  -- pending, confirmed, failed
      block_number    INTEGER,
      metadata        TEXT,              -- JSON: machine_type, battery_type, etc.
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address  TEXT    NOT NULL,
      action          TEXT    NOT NULL,  -- login, register, profile_update, view_page, etc.
      details         TEXT,
      ip_address      TEXT,
      user_agent      TEXT,
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_commissions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_addr   TEXT    NOT NULL,
      referred_addr   TEXT    NOT NULL,
      tx_hash         TEXT,
      commission_type TEXT,              -- machine_purchase, battery_purchase, swap
      amount_fta      REAL,
      amount_usdt     REAL,
      status          TEXT    DEFAULT 'pending',
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_wallet    ON transactions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_tx_type      ON transactions(tx_type);
    CREATE INDEX IF NOT EXISTS idx_tx_created   ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_wallet ON activity_log(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referral_commissions(referrer_addr);
  `);

  // Stats views
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_user_stats AS
    SELECT
      wallet_address,
      COUNT(*) AS total_tx,
      SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) AS confirmed_tx,
      SUM(CASE WHEN tx_type='swap'     AND status='confirmed' THEN 1 ELSE 0 END) AS total_swaps,
      SUM(CASE WHEN tx_type='buy_machine' AND status='confirmed' THEN 1 ELSE 0 END) AS total_machines,
      SUM(CASE WHEN tx_type='buy_battery' AND status='confirmed' THEN 1 ELSE 0 END) AS total_batteries,
      SUM(CASE WHEN tx_type='claim'    AND status='confirmed' THEN 1 ELSE 0 END) AS total_claims,
      MAX(created_at) AS last_activity
    FROM transactions
    GROUP BY wallet_address;
  `);

  console.log('[DB] Schema initialized successfully');
}

// ═══════════ USER ════════════════════════════════════════════════

function getUserByAddress(walletAddress) {
  return getDb().prepare('SELECT * FROM users WHERE wallet_address = ?').get(walletAddress.toLowerCase());
}

function createUser(walletAddress, username, email, referralCode) {
  const addr = walletAddress.toLowerCase();
  const stmt = getDb().prepare(`
    INSERT INTO users (wallet_address, username, email, referral_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  const result = stmt.run(addr, username || null, email || null, referralCode || null);
  return getUserByAddress(addr);
}

function updateUserProfile(walletAddress, updates) {
  const addr = walletAddress.toLowerCase();
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    const allowed = ['username', 'email', 'avatar_url', 'level'];
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) return getUserByAddress(addr);
  fields.push("updated_at = datetime('now')");
  values.push(addr);
  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE wallet_address = ?`).run(...values);
  return getUserByAddress(addr);
}

function updateUserStats(walletAddress, stats) {
  const addr = walletAddress.toLowerCase();
  const fields = [];
  const values = [];
  const allowed = ['total_invested', 'total_earned', 'machines_count', 'is_active', 'last_login'];
  for (const [key, val] of Object.entries(stats)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) return;
  fields.push("updated_at = datetime('now')");
  values.push(addr);
  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE wallet_address = ?`).run(...values);
}

function getAllUsers(limit = 100, offset = 0) {
  return getDb().prepare('SELECT wallet_address, username, level, total_invested, total_earned, machines_count, last_login FROM users WHERE is_active = 1 ORDER BY total_earned DESC LIMIT ? OFFSET ?').all(limit, offset);
}

// ═══════════ SESSIONS (Wallet Auth) ══════════════════════════════

function createSession(walletAddress, token, challenge) {
  const addr = walletAddress.toLowerCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  getDb().prepare(`DELETE FROM user_sessions WHERE wallet_address = ?`).run(addr);
  getDb().prepare(`
    INSERT INTO user_sessions (wallet_address, token, challenge, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(addr, token, challenge, expiresAt);
  return { token, expiresAt };
}

function validateSession(token) {
  const session = getDb().prepare(`
    SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime('now')
  `).get(token);
  if (session) {
    // Extend session
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    getDb().prepare('UPDATE user_sessions SET expires_at = ? WHERE token = ?').run(newExpiry, token);
  }
  return session;
}

function logoutSession(token) {
  getDb().prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
}

// ═══════════ TRANSACTIONS ════════════════════════════════════════

function createTransaction(tx) {
  const stmt = getDb().prepare(`
    INSERT INTO transactions (wallet_address, tx_type, token_from, token_to, amount_from, amount_to, tx_hash, status, block_number, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    (tx.walletAddress||'').toLowerCase(),
    tx.type,
    tx.tokenFrom || null,
    tx.tokenTo || null,
    tx.amountFrom || null,
    tx.amountTo || null,
    tx.txHash || null,
    tx.status || 'pending',
    tx.blockNumber || null,
    tx.metadata ? JSON.stringify(tx.metadata) : null
  );
  return getTransactionById(result.lastInsertRowid);
}

function getTransactionById(id) {
  return getDb().prepare('SELECT * FROM transactions WHERE id = ?').get(id);
}

function updateTransactionStatus(txHash, status, blockNumber) {
  getDb().prepare('UPDATE transactions SET status = ?, block_number = ?, created_at = datetime(\'now\') WHERE tx_hash = ?')
    .run(status, blockNumber, txHash);
}

function getTransactionsByAddress(walletAddress, limit = 50, offset = 0, typeFilter = null) {
  const addr = walletAddress.toLowerCase();
  if (typeFilter) {
    return getDb().prepare(`
      SELECT * FROM transactions WHERE wallet_address = ? AND tx_type = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(addr, typeFilter, limit, offset);
  }
  return getDb().prepare(`
    SELECT * FROM transactions WHERE wallet_address = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(addr, limit, offset);
}

function getTransactionStats(address) {
  const addr = address.toLowerCase();
  const stats = getDb().prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN tx_type='swap' THEN 1 ELSE 0 END) as swaps,
      SUM(CASE WHEN tx_type='buy_machine' THEN 1 ELSE 0 END) as machines,
      SUM(CASE WHEN tx_type='buy_battery' THEN 1 ELSE 0 END) as batteries,
      SUM(CASE WHEN tx_type='claim' THEN 1 ELSE 0 END) as claims,
      SUM(CASE WHEN tx_type='send' THEN 1 ELSE 0 END) as sends
    FROM transactions WHERE wallet_address = ?
  `).get(addr);
  return stats;
}

// ═══════════ ACTIVITY LOG ════════════════════════════════════════

function logActivity(walletAddress, action, details, metadata = {}) {
  const stmt = getDb().prepare(`
    INSERT INTO activity_log (wallet_address, action, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    walletAddress.toLowerCase(),
    action,
    details || null,
    metadata.ip || null,
    metadata.userAgent || null
  );
}

function getActivityLog(walletAddress, limit = 100, offset = 0) {
  return getDb().prepare(`
    SELECT * FROM activity_log WHERE wallet_address = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(walletAddress.toLowerCase(), limit, offset);
}

// ═══════════ REFERRAL ════════════════════════════════════════════

function recordReferralCommission(referrer, referred, txHash, type, amountFta, amountUsdt) {
  getDb().prepare(`
    INSERT INTO referral_commissions (referrer_addr, referred_addr, tx_hash, commission_type, amount_fta, amount_usdt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(referrer.toLowerCase(), referred.toLowerCase(), txHash, type, amountFta||0, amountUsdt||0);
}

function getReferralCommissions(referrer, limit = 50) {
  return getDb().prepare(`
    SELECT * FROM referral_commissions WHERE referrer_addr = ? ORDER BY created_at DESC LIMIT ?
  `).all(referrer.toLowerCase(), limit);
}

// ═══════════ LEADERBOARD ═════════════════════════════════════════

function getLeaderboard(limit = 50) {
  return getDb().prepare(`
    SELECT wallet_address, username, total_earned, total_invested, machines_count, level
    FROM users WHERE is_active = 1
    ORDER BY total_earned DESC LIMIT ?
  `).all(limit);
}

// ═══════════ HEALTH ══════════════════════════════════════════════

function getDbStats() {
  const users = getDb().prepare('SELECT COUNT(*) as count FROM users').get();
  const tx = getDb().prepare('SELECT COUNT(*) as count FROM transactions').get();
  const active24h = getDb().prepare(`
    SELECT COUNT(DISTINCT wallet_address) as count
    FROM activity_log WHERE created_at > datetime('now', '-1 day')
  `).get();
  return {
    totalUsers: users.count,
    totalTransactions: tx.count,
    activeUsers24h: active24h.count,
    database: DB_PATH
  };
}

module.exports = {
  // Users
  getUserByAddress,
  createUser,
  updateUserProfile,
  updateUserStats,
  getAllUsers,
  // Sessions
  createSession,
  validateSession,
  logoutSession,
  // Transactions
  createTransaction,
  getTransactionById,
  updateTransactionStatus,
  getTransactionsByAddress,
  getTransactionStats,
  // Activity
  logActivity,
  getActivityLog,
  // Referral
  recordReferralCommission,
  getReferralCommissions,
  // Leaderboard
  getLeaderboard,
  // Health
  getDbStats,
  getDb
};
