-- ============================================================
-- FITIA PRO MINER — Supabase Database Schema
-- ============================================================

-- ═══ Enable required extensions ═══
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══ USERS ═══
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username      TEXT,
  email         TEXT UNIQUE,
  password_hash TEXT,
  avatar_url    TEXT,
  level         INTEGER DEFAULT 0,
  total_invested NUMERIC(18,2) DEFAULT 0,
  total_earned   NUMERIC(18,2) DEFAULT 0,
  machines_count INTEGER DEFAULT 0,
  referrer_id   UUID REFERENCES users(id),
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referrer ON users(referrer_id);

-- ═══ AUTH CHALLENGES (wallet signature) ═══
CREATE TABLE auth_challenges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  challenge     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_wallet ON auth_challenges(wallet_address);
CREATE INDEX idx_challenges_expires ON auth_challenges(expires_at);

-- ═══ AUTH SESSIONS ═══
CREATE TABLE auth_sessions (
  token         TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON auth_sessions(token);
CREATE INDEX idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_sessions_expires ON auth_sessions(expires_at);

-- ═══ TRANSACTIONS ═══
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  tx_type       TEXT NOT NULL,         -- swap, buy_machine, buy_battery, claim, send, receive, deposit, withdraw, plug_in, referral
  token_from    TEXT,                  -- USDT, FTA, POL
  token_to      TEXT,                  -- USDT, FTA, POL
  amount_from   NUMERIC(24,8),
  amount_to     NUMERIC(24,8),
  tx_hash       TEXT,                  -- Polygon transaction hash
  status        TEXT DEFAULT 'pending', -- pending, confirmed, failed
  metadata      JSONB DEFAULT '{}',    -- Extra info (machineTypeId, batteryTypeId, etc.)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_user ON transactions(user_id);
CREATE INDEX idx_tx_wallet ON transactions(wallet_address);
CREATE INDEX idx_tx_type ON transactions(tx_type);
CREATE INDEX idx_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_tx_created ON transactions(created_at DESC);

-- ═══ ACTIVITY LOG ═══
CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  action        TEXT NOT NULL,         -- login, register, logout, profile_update, swap, buy_machine, etc.
  details       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_action ON activity_log(action);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ═══ LEADERBOARD (materialized view, refreshed via cron) ═══
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  u.id AS user_id,
  u.username,
  u.wallet_address,
  u.level,
  u.total_earned,
  u.machines_count,
  COUNT(t.id) FILTER (WHERE t.tx_type = 'claim') AS total_claims,
  COUNT(t.id) FILTER (WHERE t.tx_type = 'swap') AS total_swaps,
  RANK() OVER (ORDER BY u.total_earned DESC) AS rank
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'confirmed'
GROUP BY u.id, u.username, u.wallet_address, u.level, u.total_earned, u.machines_count
ORDER BY u.total_earned DESC
LIMIT 100;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_lb_user_id ON leaderboard(user_id);
CREATE INDEX idx_lb_rank ON leaderboard(rank);

-- ═══ REFERRAL TRACKING ═══
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id   UUID NOT NULL REFERENCES users(id),
  referred_id   UUID NOT NULL REFERENCES users(id) UNIQUE,
  level         INTEGER DEFAULT 0,     -- 0 = direct
  commission_paid NUMERIC(18,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ref_referrer ON referrals(referrer_id);
CREATE INDEX idx_ref_referred ON referrals(referred_id);

-- ═══ GAS RELAY LOG ═══
CREATE TABLE relay_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  tx_hash       TEXT NOT NULL,
  gas_spent     NUMERIC(18,8),         -- POL spent
  gas_reimbursed NUMERIC(18,8),         -- POL reimbursed from user balance
  status        TEXT DEFAULT 'pending', -- pending, relayed, failed
  raw_tx        TEXT,                   -- The meta-tx payload
  error_msg     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_relay_user ON relay_log(user_id);
CREATE INDEX idx_relay_status ON relay_log(status);

-- ═══ SERVER WALLET (encrypted at rest) ═══
CREATE TABLE server_config (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ FUNCTIONS ═══

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Clean expired challenges
CREATE OR REPLACE FUNCTION clean_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_log ENABLE ROW LEVEL SECURITY;

-- Users: can read own, admin can read all
CREATE POLICY users_self ON users
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet' OR is_admin = true);

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet');

-- Transactions: user sees own
CREATE POLICY tx_self ON transactions
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet');

CREATE POLICY tx_insert_self ON transactions
  FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet');

-- Activity: user sees own
CREATE POLICY activity_self ON activity_log
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet');

-- Leaderboard: public (materialized view — RLS not supported, access controlled via API)
-- No RLS policy needed — the server uses service_role key and controls access in code

-- ═══ SAMPLE DATA ═══
-- Insert default server config
INSERT INTO server_config (key, value, description) VALUES
  ('relayer_enabled', 'true', 'Whether meta-tx relay is active'),
  ('relayer_max_gas_per_tx', '0.05', 'Max POL to spend per relayed tx'),
  ('relayer_min_pol_balance', '10', 'Min POL balance before refill alert'),
  ('api_version', '1.0.0', 'Current API version');
