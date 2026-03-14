import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cognitive_support_cache.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Minimal local SQLite cache.
 * This is NOT a mirror of the full backend schema.
 * Used only for offline resilience and fast reads.
 */
export const localDb = {
  /** Get or create the database connection. */
  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!_db) {
      _db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.initialize();
    }
    return _db;
  },

  /** Create cache tables if they don't exist. */
  async initialize(): Promise<void> {
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
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO cached_reminders (id, data, synced_at) VALUES (?, ?, ?)`,
      [id, JSON.stringify(data), new Date().toISOString()],
    );
  },

  /** Retrieve all cached reminders. */
  async getCachedReminders(): Promise<object[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM cached_reminders ORDER BY synced_at DESC`,
    );
    return rows.map((row) => JSON.parse(row.data));
  },

  /** Get the last sync timestamp. */
  async getLastSyncTime(): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = ?`,
      ['last_sync'],
    );
    return row?.value ?? null;
  },

  /** Update the last sync timestamp. */
  async setLastSyncTime(iso: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
      ['last_sync', iso],
    );
  },

  /** Clear all cached data. */
  async clearAll(): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(`
      DELETE FROM cached_reminders;
      DELETE FROM cached_checklists;
      DELETE FROM sync_meta;
    `);
  },
};
