import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'pea.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      isin TEXT,
      category TEXT DEFAULT 'Action/ETF',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_flows (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
      amount REAL NOT NULL CHECK (amount > 0),
      date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
      shares_count REAL NOT NULL,
      unit_price REAL NOT NULL,
      fee REAL DEFAULT 0.0,
      total_cost REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      target_price REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);
    CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date);
  `)

  // Safe migration: add notes column to assets if not present
  try { _db.exec(`ALTER TABLE assets ADD COLUMN notes TEXT`) } catch { /* already exists */ }

  return _db
}
