import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Si pas de TURSO_DATABASE_URL, on utilise la DB locale
const isLocal = !process.env.TURSO_DATABASE_URL;

if (isLocal) {
  const DB_DIR = path.join(process.cwd(), 'data')
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/pea.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

export async function getDb() {
  if (!initialized) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        isin TEXT,
        category TEXT DEFAULT 'Action/ETF',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cash_flows (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
        amount REAL NOT NULL CHECK (amount > 0),
        date TEXT NOT NULL DEFAULT (date('now')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
        shares_count REAL NOT NULL,
        unit_price REAL NOT NULL,
        fee REAL DEFAULT 0.0,
        total_cost REAL NOT NULL,
        date TEXT NOT NULL DEFAULT (date('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        target_price REAL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    
    // Note: SQLite indexes can be created with executeMultiple or just sequentially
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date);');

    try {
      await db.execute('ALTER TABLE assets ADD COLUMN notes TEXT');
    } catch {
      // Column already exists — ignore
    }
    initialized = true;
  }
  return db;
}
