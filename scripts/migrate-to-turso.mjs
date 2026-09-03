import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import fs from 'fs';

// Configuration
const localDbPath = './data/pea.db';
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!fs.existsSync(localDbPath)) {
  console.error("❌ Fichier de base de données locale introuvable :", localDbPath);
  process.exit(1);
}
if (!tursoUrl || !tursoToken) {
  console.error("❌ Les variables TURSO_DATABASE_URL et TURSO_AUTH_TOKEN doivent être définies.");
  process.exit(1);
}

async function run() {
  console.log("Lecture de la base locale...");
  const localDb = new Database(localDbPath);

  // Read data
  const assets = localDb.prepare('SELECT * FROM assets').all();
  const cashFlows = localDb.prepare('SELECT * FROM cash_flows').all();
  const transactions = localDb.prepare('SELECT * FROM transactions').all();
  const watchlist = localDb.prepare('SELECT * FROM watchlist').all();
  
  console.log(`Données trouvées : ${assets.length} actifs, ${cashFlows.length} cash flows, ${transactions.length} transactions, ${watchlist.length} watchlist.`);

  console.log("Connexion à Turso...");
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken
  });

  // Init tables on Turso just in case
  await turso.execute(`
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
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS cash_flows (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
      amount REAL NOT NULL CHECK (amount > 0),
      date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  await turso.execute(`
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
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      target_price REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("Transfert des données vers Turso...");

  for (const asset of assets) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO assets (id, ticker, name, isin, category, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [asset.id, asset.ticker, asset.name, asset.isin, asset.category, asset.notes, asset.created_at]
    });
  }
  console.log("✅ Actifs transférés");

  for (const cf of cashFlows) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO cash_flows (id, type, amount, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [cf.id, cf.type, cf.amount, cf.date, cf.notes, cf.created_at]
    });
  }
  console.log("✅ Cash flows transférés");

  for (const tx of transactions) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO transactions (id, asset_id, type, shares_count, unit_price, fee, total_cost, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [tx.id, tx.asset_id, tx.type, tx.shares_count, tx.unit_price, tx.fee, tx.total_cost, tx.date, tx.created_at]
    });
  }
  console.log("✅ Transactions transférées");

  for (const wl of watchlist) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO watchlist (id, ticker, name, target_price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [wl.id, wl.ticker, wl.name, wl.target_price, wl.notes, wl.created_at]
    });
  }
  console.log("✅ Watchlist transférée");

  console.log("🎉 Migration terminée avec succès !");
  process.exit(0);
}

run().catch(console.error);
