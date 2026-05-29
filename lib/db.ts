import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./data/portfolio.db";

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // Create sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );
  `);

  // Create holdings cache table
  database.exec(`
    CREATE TABLE IF NOT EXISTS holdings_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create mutual funds cache table
  database.exec(`
    CREATE TABLE IF NOT EXISTS mf_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT,
      data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create buffett scores table
  database.exec(`
    CREATE TABLE IF NOT EXISTS buffett_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      score REAL,
      breakdown TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create portfolio snapshots table
  database.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date DATE DEFAULT (date('now')),
      total_equity_value REAL,
      total_mf_value REAL,
      total_pnl REAL,
      data TEXT
    );
  `);
}

export interface Session {
  id: number;
  access_token: string;
  user_id?: string;
  user_name?: string;
  email?: string;
  created_at: string;
  expires_at?: string;
}

export function saveSession(accessToken: string, profile?: any): Session {
  const db = getDatabase();

  // Delete old sessions (keep only the latest)
  db.prepare("DELETE FROM sessions").run();

  const stmt = db.prepare(`
    INSERT INTO sessions (access_token, user_id, user_name, email)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    accessToken,
    profile?.user_id || null,
    profile?.user_name || null,
    profile?.email || null,
  );

  return getSession()!;
}

export function getSession(): Session | null {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1",
  );
  return stmt.get() as Session | null;
}

export function deleteSession(): void {
  const db = getDatabase();
  db.prepare("DELETE FROM sessions").run();
}

export function getCache(table: string, key: string): any | null {
  const db = getDatabase();
  const column = table === "holdings_cache" ? "symbol" : "folio";

  const stmt = db.prepare(`
    SELECT data, cached_at FROM ${table}
    WHERE ${column} = ?
    AND datetime(cached_at, '+15 minutes') > datetime('now')
  `);

  const row = stmt.get(key) as { data: string; cached_at: string } | undefined;

  if (row) {
    return JSON.parse(row.data);
  }

  return null;
}

export function setCache(table: string, key: string, data: any): void {
  const db = getDatabase();
  const column = table === "holdings_cache" ? "symbol" : "folio";

  // Delete old cache for this key
  db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(key);

  // Insert new cache
  const stmt = db.prepare(`
    INSERT INTO ${table} (${column}, data)
    VALUES (?, ?)
  `);

  stmt.run(key, JSON.stringify(data));
}

export function getAllCache(table: string): any[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT data FROM ${table}
    WHERE datetime(cached_at, '+15 minutes') > datetime('now')
  `);

  const rows = stmt.all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function clearOldCache(): void {
  const db = getDatabase();

  db.prepare(
    `
    DELETE FROM holdings_cache
    WHERE datetime(cached_at, '+15 minutes') <= datetime('now')
  `,
  ).run();

  db.prepare(
    `
    DELETE FROM mf_cache
    WHERE datetime(cached_at, '+15 minutes') <= datetime('now')
  `,
  ).run();
}

// Made with Bob
