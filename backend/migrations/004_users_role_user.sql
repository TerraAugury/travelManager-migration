-- Normalize users.role values to admin/user and update role constraint.
PRAGMA foreign_keys = OFF;

CREATE TABLE users__new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users__new (
  id,
  email,
  display_name,
  password_hash,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  display_name,
  password_hash,
  CASE
    WHEN LOWER(COALESCE(role, '')) = 'admin' THEN 'admin'
    ELSE 'user'
  END,
  is_active,
  created_at,
  updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users__new RENAME TO users;

PRAGMA foreign_keys = ON;
