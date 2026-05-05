import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cognitive_support_cache.db';

let _db: SQLite.SQLiteDatabase | null = null;

// In-memory fallback for web where SQLite is unavailable
const _memoryCache = new Map<string, any>();

/**
 * Minimal local SQLite cache.
 * This is NOT a mirror of the full backend schema.
 * Used only for offline resilience and fast reads.
 * On web, falls back to a simple in-memory Map.
 */
export const localDb = {
  /** Get or create the database connection. */
  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (Platform.OS === 'web') {
      throw new Error('SQLite is not available on web');
    }
    if (!_db) {
      _db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.initialize();
    }
    return _db;
  },

  /** Create cache tables if they don't exist. */
  async initialize(): Promise<void> {
    if (Platform.OS === 'web') return;
    const db = _db!;

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_reminders (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_checklists (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },

  /** Store a JSON-serialized reminder in cache. */
  async cacheReminder(id: string, data: object): Promise<void> {
    if (Platform.OS === 'web') {
      _memoryCache.set(`reminder_${id}`, data);
      return;
    }
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO cached_reminders (id, data, synced_at) VALUES (?, ?, ?)`,
      [id, JSON.stringify(data), new Date().toISOString()],
    );
  },

  /** Retrieve all cached reminders. */
  async getCachedReminders(): Promise<object[]> {
    if (Platform.OS === 'web') {
      const results: object[] = [];
      for (const [key, value] of _memoryCache) {
        if (key.startsWith('reminder_')) results.push(value);
      }
      return results;
    }
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM cached_reminders ORDER BY synced_at DESC`,
    );
    return rows.map((row) => JSON.parse(row.data));
  },

  /** Get the last sync timestamp. */
  async getLastSyncTime(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return _memoryCache.get('last_sync') ?? null;
    }
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = ?`,
      ['last_sync'],
    );
    return row?.value ?? null;
  },

  /** Update the last sync timestamp. */
  async setLastSyncTime(iso: string): Promise<void> {
    if (Platform.OS === 'web') {
      _memoryCache.set('last_sync', iso);
      return;
    }
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
      ['last_sync', iso],
    );
  },

  /** Clear all cached data. */
  async clearAll(): Promise<void> {
    if (Platform.OS === 'web') {
      _memoryCache.clear();
      return;
    }
    const db = await this.getDb();
    await db.execAsync(`
      DELETE FROM cached_reminders;
      DELETE FROM cached_checklists;
      DELETE FROM sync_meta;
    `);
  },
};
