CREATE TABLE IF NOT EXISTS trip_shares (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'readwrite' CHECK (permission IN ('readwrite', 'readonly')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (owner_user_id != shared_with_user_id),
  UNIQUE (owner_user_id, shared_with_user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS ix_trip_shares_shared_with
  ON trip_shares (shared_with_user_id);
