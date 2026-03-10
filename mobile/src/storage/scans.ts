import { getDb } from "./db";
import { NewScanRecord, ScanRecord } from "./types";

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "parsed",
  "emissions",
  "error",
  "benchmark",
]);
const BLOCKED_KEYS = new Set([
  "image",
  "dataUrl",
  "base64",
  "raw_ocr",
  "prompt",
  "response",
  "logs",
]);

function sanitizeResult(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) continue;
    if (BLOCKED_KEYS.has(key)) continue;
    out[key] = value;
  }

  return Object.keys(out).length > 0 ? JSON.stringify(out) : null;
}

export function addScan(input: NewScanRecord): string {
  const db = getDb();
  db.runSync(
    `INSERT INTO scans (
      id, created_at, success, co2e_grams, display_name, category, error_code, result_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id,
    input.created_at,
    input.success,
    input.co2e_grams,
    input.display_name,
    input.category,
    input.error_code,
    sanitizeResult(input.result),
  );
  pruneOldScans(100);
  return input.id;
}

export function listScans(limit = 50, offset = 0): ScanRecord[] {
  const db = getDb();
  return db.getAllSync<ScanRecord>(
    `SELECT id, created_at, success, co2e_grams, display_name, category, error_code, result_json, in_closet
     FROM scans
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export function getScanById(id: string): ScanRecord | null {
  const db = getDb();
  return (
    db.getFirstSync<ScanRecord>(
      `SELECT id, created_at, success, co2e_grams, display_name, category, error_code, result_json, in_closet
       FROM scans WHERE id = ?`,
      id,
    ) ?? null
  );
}

export function toggleClosetStatus(scanId: string, inCloset: boolean): void {
  getDb().runSync(
    `UPDATE scans SET in_closet = ? WHERE id = ?`,
    inCloset ? 1 : 0,
    scanId,
  );
}

export function listClosetItems(limit = 50, offset = 0): ScanRecord[] {
  const db = getDb();
  return db.getAllSync<ScanRecord>(
    `SELECT id, created_at, success, co2e_grams, display_name, category, error_code, result_json, in_closet
     FROM scans
     WHERE in_closet = 1
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export function searchScans(
  query: string,
  closetOnly: boolean,
  limit = 50,
): ScanRecord[] {
  const db = getDb();
  const pattern = `%${query}%`;
  if (closetOnly) {
    return db.getAllSync<ScanRecord>(
      `SELECT id, created_at, success, co2e_grams, display_name, category, error_code, result_json, in_closet
       FROM scans
       WHERE in_closet = 1 AND display_name LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
      pattern,
      limit,
    );
  }
  return db.getAllSync<ScanRecord>(
    `SELECT id, created_at, success, co2e_grams, display_name, category, error_code, result_json, in_closet
     FROM scans
     WHERE display_name LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`,
    pattern,
    limit,
  );
}

export function deleteScans(ids: string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  getDb().runSync(`DELETE FROM scans WHERE id IN (${placeholders})`, ...ids);
}

export function clearAllScans(): void {
  getDb().runSync("DELETE FROM scans");
}

export function pruneOldScans(max = 100): void {
  if (max <= 0) return;
  getDb().runSync(
    `DELETE FROM scans
     WHERE id NOT IN (
       SELECT id FROM scans ORDER BY created_at DESC LIMIT ?
     )`,
    max,
  );
}
