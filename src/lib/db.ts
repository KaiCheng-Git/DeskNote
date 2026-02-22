import Database from "@tauri-apps/plugin-sql";

// Input length limits — enforced at TypeScript layer (SQL CHECK on new DBs)
export const LIMITS = {
  TODO_CONTENT: 500,
  NOTE_TITLE: 200,
  NOTE_CONTENT: 50_000,
  WORKLOG_CONTENT: 10_000,
} as const;

export function validateLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length of ${max} characters`);
  }
}

/** Current target DB schema version — bump here when adding new migrations. */
export const DB_VERSION = 2;

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:desknote.db");
  await runMigrations(db);
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  // WAL mode for better concurrent read/write performance
  await database.execute("PRAGMA journal_mode=WAL");
  await database.execute("PRAGMA synchronous=NORMAL");

  const rows = await database.select<Array<{ user_version: number }>>(
    "PRAGMA user_version"
  );
  const version = rows[0]?.user_version ?? 0;

  if (version < 1) {
    // v1: Initial schema
    await database.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL CHECK(length(content) >= 1 AND length(content) <= ${LIMITS.TODO_CONTENT}),
        is_done INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT '' CHECK(length(title) <= ${LIMITS.NOTE_TITLE}),
        content TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS work_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        content TEXT DEFAULT '',
        created_at INTEGER NOT NULL
      )
    `);
  }

  if (version < 2) {
    // v2: Track completion time on todos + archive table for old done todos
    const cols = await database.select<Array<{ name: string }>>(
      "PRAGMA table_info(todos)"
    );
    if (!cols.some((c) => c.name === "done_at")) {
      await database.execute("ALTER TABLE todos ADD COLUMN done_at INTEGER");
    }
    await database.execute(`
      CREATE TABLE IF NOT EXISTS todos_archive (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        done_at INTEGER NOT NULL,
        archived_at INTEGER NOT NULL
      )
    `);
  }

  if (version < DB_VERSION) {
    // DB_VERSION is a compile-time constant — no injection risk
    await database.execute(`PRAGMA user_version = ${DB_VERSION}`);
  }
}

/** Reclaim up to 100 pages of deleted-row space. Call once at startup. */
export async function vacuumDb(): Promise<void> {
  const database = await getDb();
  await database.execute("PRAGMA incremental_vacuum(100)");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
