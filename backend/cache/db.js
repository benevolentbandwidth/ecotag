import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getCacheConfig } from "./config.js";

let dbPath = null;
let db = null;

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      id INTEGER PRIMARY KEY,
      image_hash TEXT UNIQUE NOT NULL,
      fingerprint_version TEXT NOT NULL,
      fingerprint_json TEXT NOT NULL,
      parsed_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_hit_at INTEGER,
      hit_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cache_entries_created_at
      ON cache_entries(created_at);
  `);
}

function ensureDb() {
  const resolvedPath = path.resolve(getCacheConfig().cacheDbPath);
  if (db && dbPath === resolvedPath) {
    return db;
  }

  if (db) {
    db.close();
  }

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  db = new Database(resolvedPath);
  dbPath = resolvedPath;
  initSchema(db);
  return db;
}

export function closeCacheDbForTest() {
  if (!db) return;
  db.close();
  db = null;
  dbPath = null;
}

export function getExactEntry({ imageHash, fingerprintVersion }) {
  const database = ensureDb();
  return database
    .prepare(
      `SELECT id, image_hash, fingerprint_json, parsed_json, created_at, last_hit_at, hit_count
       FROM cache_entries
       WHERE image_hash = ? AND fingerprint_version = ?`,
    )
    .get(imageHash, fingerprintVersion);
}

export function listVersionEntries(fingerprintVersion) {
  const database = ensureDb();
  return database
    .prepare(
      `SELECT id, image_hash, fingerprint_json, parsed_json, created_at, last_hit_at, hit_count
       FROM cache_entries
       WHERE fingerprint_version = ?`,
    )
    .all(fingerprintVersion);
}

export function touchEntry(id) {
  const database = ensureDb();
  database
    .prepare(
      `UPDATE cache_entries
       SET last_hit_at = ?, hit_count = hit_count + 1
       WHERE id = ?`,
    )
    .run(Date.now(), id);
}

export function upsertEntry({
  imageHash,
  fingerprintVersion,
  fingerprintJson,
  parsedJson,
  createdAt = Date.now(),
}) {
  const database = ensureDb();
  database
    .prepare(
      `INSERT INTO cache_entries (
         image_hash,
         fingerprint_version,
         fingerprint_json,
         parsed_json,
         created_at,
         last_hit_at,
         hit_count
       ) VALUES (?, ?, ?, ?, ?, NULL, 0)
       ON CONFLICT(image_hash) DO UPDATE SET
         fingerprint_version = excluded.fingerprint_version,
         fingerprint_json = excluded.fingerprint_json,
         parsed_json = excluded.parsed_json,
         created_at = excluded.created_at`,
    )
    .run(imageHash, fingerprintVersion, fingerprintJson, parsedJson, createdAt);
}

export function countEntries() {
  const database = ensureDb();
  const row = database.prepare("SELECT COUNT(*) AS count FROM cache_entries").get();
  return Number(row?.count ?? 0);
}

export function pruneOldestEntries(excessCount) {
  if (!Number.isInteger(excessCount) || excessCount <= 0) return;
  const database = ensureDb();
  database
    .prepare(
      `DELETE FROM cache_entries
       WHERE id IN (
         SELECT id
         FROM cache_entries
         ORDER BY created_at ASC, id ASC
         LIMIT ?
       )`,
    )
    .run(excessCount);
}

export function clearEntries() {
  const database = ensureDb();
  database.prepare("DELETE FROM cache_entries").run();
}

export function insertEntryForTest({
  imageHash,
  fingerprintVersion,
  fingerprint,
  parsed,
  createdAt = Date.now(),
}) {
  const fingerprintJson = JSON.stringify(fingerprint);
  const parsedJson = JSON.stringify(parsed);
  const database = ensureDb();
  database
    .prepare(
      `INSERT OR REPLACE INTO cache_entries (
         image_hash,
         fingerprint_version,
         fingerprint_json,
         parsed_json,
         created_at,
         last_hit_at,
         hit_count
       ) VALUES (?, ?, ?, ?, ?, NULL, 0)`,
    )
    .run(imageHash, fingerprintVersion, fingerprintJson, parsedJson, createdAt);
}
