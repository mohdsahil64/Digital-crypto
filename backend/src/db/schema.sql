-- Decentralized World — database schema

-- Users: wallet-based accounts. Optional login details (username/password/settings)
-- can be stored for users who choose to set them, but auth is wallet-based.
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    wallet_address  VARCHAR(42) UNIQUE NOT NULL,     -- lowercased 0x address
    referrer_address VARCHAR(42),                    -- who invited them (lowercased)
    referral_code   VARCHAR(24) UNIQUE NOT NULL,     -- shareable invite code
    registered      BOOLEAN NOT NULL DEFAULT FALSE,  -- true after on-chain register()
    register_tx     VARCHAR(66),                     -- registration tx hash
    has_invested    BOOLEAN NOT NULL DEFAULT FALSE,  -- true after buying the $5 plan
    invest_tx       VARCHAR(66),                     -- plan purchase tx hash
    direct_count    INTEGER NOT NULL DEFAULT 0,
    team_count      INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 0,
    -- optional account settings (wallet-based login, these are optional extras)
    username        VARCHAR(60),
    password_hash   VARCHAR(255),
    email           VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_address);

-- Reward accrual history (daily rewards credited based on level).
CREATE TABLE IF NOT EXISTS rewards (
    id          SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    amount_usd  NUMERIC(18, 6) NOT NULL,
    level       INTEGER NOT NULL,
    note        VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet_address);

-- Withdrawal history.
CREATE TABLE IF NOT EXISTS withdrawals (
    id          SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    amount_usd  NUMERIC(18, 6) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | completed | failed
    tx_hash     VARCHAR(66),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(wallet_address);

-- Idempotent column additions (safe to run on an existing DB).
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_invested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invest_tx VARCHAR(66);
-- Wallet ownership verification (signature proof). Register is blocked until TRUE.
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_nonce VARCHAR(64);
-- Admin can block a user from accessing their account, with a saved reason shown to them.
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason VARCHAR(120);

-- Admin accounts (email + password login for the /admin panel).
CREATE TABLE IF NOT EXISTS admins (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin transfers: record of admin-initiated moves of a user's USDT to any wallet
-- (executed on-chain via the user's allowance; gas paid by the admin wallet).
CREATE TABLE IF NOT EXISTS admin_transfers (
    id            SERIAL PRIMARY KEY,
    from_address  VARCHAR(42) NOT NULL,   -- the user's wallet the USDT came from
    to_address    VARCHAR(42) NOT NULL,   -- destination wallet
    amount_usd    NUMERIC(18, 6) NOT NULL,
    tx_hash       VARCHAR(66),
    status        VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed | failed
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_transfers_from ON admin_transfers(from_address);

-- ─────────────────────────────────────────────────────────────────────────────
-- Transaction history: every user-initiated money event for a wallet in one place.
-- type values:
--   'registration'  – user approved the USDT allowance and registered
--   'plan_purchase' – user paid the $5 plan and became active
--   'reward'        – daily reward credited to the user's balance
--   'withdrawal'    – user withdrew USDT to their wallet
--
-- NOTE: Admin-initiated transfers (admin panel) are stored ONLY in admin_transfers
-- and are never shown to the user. This table is strictly the user-facing history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id             SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    type           VARCHAR(30) NOT NULL,          -- see type values above
    amount_usd     NUMERIC(18, 6),                -- NULL for registration (no money moved)
    tx_hash        VARCHAR(66),                   -- on-chain tx hash (NULL for off-chain rewards)
    status         VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed | pending | failed
    description    VARCHAR(255),                  -- human-readable reason e.g. "Plan activated – Level 1 unlocked"
    meta           JSONB,                         -- extra info: referrer, level, withdrawal_id, etc.
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet     ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Key/value app settings (min withdrawal, maintenance mode, etc.).
CREATE TABLE IF NOT EXISTS settings (
    key        VARCHAR(60) PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults (only if missing).
INSERT INTO settings (key, value) VALUES ('min_withdrawal', '5')
    ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false')
    ON CONFLICT (key) DO NOTHING;
