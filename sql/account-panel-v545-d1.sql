CREATE TABLE IF NOT EXISTS vf_account_features(user_id TEXT PRIMARY KEY,features_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vf_account_passwords(user_id TEXT PRIMARY KEY,email TEXT NOT NULL,encrypted TEXT NOT NULL,recorded_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vf_account_handoffs(token_hash TEXT PRIMARY KEY,actor_id TEXT NOT NULL,target_id TEXT NOT NULL,maintenance_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
