CREATE TABLE IF NOT EXISTS vf_access_config (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT, salt TEXT, revision TEXT NOT NULL, bootstrap_hash TEXT, bootstrap_expires INTEGER);
CREATE TABLE IF NOT EXISTS vf_maintenance_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, revision TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS vf_maintenance_user ON vf_maintenance_sessions(user_id);
CREATE TABLE IF NOT EXISTS vf_access_attempts (bucket TEXT PRIMARY KEY, tries INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vf_accounts (user_id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL, product TEXT NOT NULL CHECK(product IN ('diy','icons','all')), status TEXT NOT NULL CHECK(status IN ('active','disabled')), role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), revision TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vf_account_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, target_id TEXT NOT NULL, action TEXT NOT NULL, created_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS vf_account_features(user_id TEXT PRIMARY KEY,features_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vf_account_passwords(user_id TEXT PRIMARY KEY,email TEXT NOT NULL,encrypted TEXT NOT NULL,recorded_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vf_account_handoffs(token_hash TEXT PRIMARY KEY,actor_id TEXT NOT NULL,target_id TEXT NOT NULL,maintenance_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
