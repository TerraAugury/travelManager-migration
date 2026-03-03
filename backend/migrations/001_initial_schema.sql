-- D1 / SQLite schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  notes TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS passengers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_passengers_name_ci
  ON passengers (name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS trip_passengers (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (trip_id, passenger_id)
);

CREATE TABLE IF NOT EXISTS flight_records (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  flight_number TEXT NOT NULL,
  airline TEXT,
  pnr TEXT,
  departure_airport_name TEXT,
  departure_airport_code TEXT,
  departure_scheduled TEXT,
  arrival_airport_name TEXT,
  arrival_airport_code TEXT,
  arrival_scheduled TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_flight_records_trip_id
  ON flight_records (trip_id);

CREATE INDEX IF NOT EXISTS ix_flight_records_departure_scheduled
  ON flight_records (departure_scheduled);

CREATE TABLE IF NOT EXISTS flight_passengers (
  flight_record_id TEXT NOT NULL REFERENCES flight_records(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (flight_record_id, passenger_id)
);

CREATE TABLE IF NOT EXISTS hotel_records (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  hotel_name TEXT NOT NULL,
  confirmation_id TEXT,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  pax_count INTEGER NOT NULL CHECK (pax_count > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('prepaid', 'pay_at_hotel')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (check_out_date >= check_in_date)
);

CREATE INDEX IF NOT EXISTS ix_hotel_records_trip_id
  ON hotel_records (trip_id);

CREATE TABLE IF NOT EXISTS hotel_passengers (
  hotel_record_id TEXT NOT NULL REFERENCES hotel_records(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hotel_record_id, passenger_id)
);
