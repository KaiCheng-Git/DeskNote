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

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:desknote.db");
  await initSchema(db);
  return db;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL CHECK(length(content) >= 1 AND length(content) <= ${LIMITS.TODO_CONTENT}),
      is_done INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '' CHECK(length(title) <= ${LIMITS.NOTE_TITLE}),
      content TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
