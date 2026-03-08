import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { getDb } from "./db";
import { TagApiResponse } from "../types/api";
import { SQLiteDatabase } from "expo-sqlite";

// change the max entries for cache here
const CACHE_MAX_ENTRIES = 50;

// inactivity TTL: cache is cleared if no activity for this duration
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_ACTIVITY_KEY = "cache_last_activity";

// get the last activity time for the cache
function getLastActivity(db: SQLiteDatabase): number {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    LAST_ACTIVITY_KEY,
  );
  return row ? parseInt(row.value, 10) : 0;
}

// update the last activity time for the cache
function updateLastActivity(db: SQLiteDatabase): void {
  db.runSync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    LAST_ACTIVITY_KEY,
    String(Date.now()),
  );
}

// clear the cache if it has been inactive for too long
function clearCacheIfExpired(db: SQLiteDatabase): void {
  const lastActivity = getLastActivity(db);
  if (lastActivity > 0 && Date.now() - lastActivity > TTL_MS) {
    db.runSync("DELETE FROM image_cache");
    console.log("[EcoTag Cache] Inactivity TTL expired, cache cleared");
  }
}

// create a hash of the image uri
async function hashImageUri(imageUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: "base64" as any,
  });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
}

// lookup the cache for the image uri
// if the cache is hit, return the response
// if the cache is miss, return null
export async function lookupCache(imageUri: string): Promise<TagApiResponse | null> {
  try {
    const db = getDb();
    clearCacheIfExpired(db);
    const hash = await hashImageUri(imageUri);
    const row = db.getFirstSync<{ response_json: string }>(
      "SELECT response_json FROM image_cache WHERE image_hash = ?",
      hash,
    );
    updateLastActivity(db);
    if (!row) {
      console.log("[EcoTag Cache] MISS", hash.slice(0, 8));
      return null;
    }
    const parsed = JSON.parse(row.response_json) as Partial<TagApiResponse>;
    if (!parsed.parsed || !parsed.emissions) return null;
    console.log("[EcoTag Cache] HIT", hash.slice(0, 8));
    return parsed as TagApiResponse;
  } catch (err) {
    console.warn("[EcoTag] Local cache lookup failed:", err);
    return null;
  }
}

// clears all entries from the image cache and resets the activity timer
export function clearCache(): void {
  try {
    const db = getDb();
    db.runSync("DELETE FROM image_cache");
    db.runSync("DELETE FROM settings WHERE key = ?", LAST_ACTIVITY_KEY);
    console.log("[EcoTag Cache] Cache manually cleared");
  } catch (err) {
    console.warn("[EcoTag] Local cache clear failed:", err);
  }
}

// uses FIFO to evict the oldest cache entry (creation time) when the cache is full
// stores the hash of the image uri, the response, and the creation time
export async function storeCache(imageUri: string, response: TagApiResponse): Promise<void> {
  try {
    const db = getDb();
    clearCacheIfExpired(db);
    const hash = await hashImageUri(imageUri);
    // insert or replace the cache entry
    db.runSync(
      `INSERT OR REPLACE INTO image_cache (image_hash, response_json, created_at)
       VALUES (?, ?, ?)`,
      hash,
      JSON.stringify(response),
      Date.now(),
    );
    // evict the oldest cache entry when the cache is full
    db.runSync(
      `DELETE FROM image_cache WHERE image_hash NOT IN (
         SELECT image_hash FROM image_cache ORDER BY created_at DESC LIMIT ?
       )`,
      CACHE_MAX_ENTRIES,
    );
    updateLastActivity(db);
  } catch (err) {
    console.warn("[EcoTag] Local cache store failed:", err);
  }
}
