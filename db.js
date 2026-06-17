const Database = require('better-sqlite3');
const path = require('path');
const dbPath = process.env.VERCEL ? '/tmp/oferty.db' : path.join(__dirname, 'oferty.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS oferty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    otodom_id TEXT UNIQUE,
    tytul TEXT,
    cena REAL,
    cena_m2 REAL,
    metraz REAL,
    miasto TEXT,
    wojewodztwo TEXT,
    url TEXT,
    pobrano_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
