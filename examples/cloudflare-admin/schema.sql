-- D1 schema for tina4-js admin dashboard

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed data
INSERT INTO users (name, email, role) VALUES
  ('Alice Chen', 'alice@example.com', 'admin'),
  ('Bob Smith', 'bob@example.com', 'editor'),
  ('Carol Davis', 'carol@example.com', 'user'),
  ('Dan Wilson', 'dan@example.com', 'user'),
  ('Eve Taylor', 'eve@example.com', 'editor');

INSERT INTO activity_log (user_id, action, detail) VALUES
  (1, 'login', 'Dashboard access'),
  (2, 'update', 'Edited user profile'),
  (1, 'create', 'Added new user'),
  (3, 'login', 'Dashboard access'),
  (4, 'delete', 'Removed expired session');
