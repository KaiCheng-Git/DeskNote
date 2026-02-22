import { writable } from "svelte/store";
import { getDb, newId, now, LIMITS, validateLength } from "../db";

export interface Todo {
  id: string;
  content: string;
  is_done: boolean;
  priority: number; // 0=normal 1=important 2=urgent
  created_at: number;
  done_at: number | null; // set when marked done; null when pending
}

export const todos = writable<Todo[]>([]);

/** Number of todos moved to archive (done > 30 days ago). */
export const archivedCount = writable<number>(0);

const ARCHIVE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Move todos completed more than 30 days ago into todos_archive and update
 * the archivedCount store. Called automatically by loadTodos.
 */
export async function archiveOldTodos(): Promise<void> {
  const db = await getDb();
  const cutoff = now() - ARCHIVE_MS;

  type DoneRow = {
    id: string;
    content: string;
    priority: number;
    created_at: number;
    done_at: number;
  };

  const toArchive = await db.select<DoneRow[]>(
    "SELECT id, content, priority, created_at, done_at FROM todos WHERE is_done = 1 AND done_at IS NOT NULL AND done_at < ?",
    [cutoff]
  );

  if (toArchive.length > 0) {
    const archiveTs = now();
    for (const t of toArchive) {
      await db.execute(
        "INSERT OR IGNORE INTO todos_archive (id, content, priority, created_at, done_at, archived_at) VALUES (?, ?, ?, ?, ?, ?)",
        [t.id, t.content, t.priority, t.created_at, t.done_at, archiveTs]
      );
      await db.execute("DELETE FROM todos WHERE id = ?", [t.id]);
    }
  }

  const countRows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM todos_archive"
  );
  archivedCount.set(countRows[0]?.count ?? 0);
}

export async function loadTodos() {
  await archiveOldTodos();
  const db = await getDb();
  const rows = await db.select<Array<Todo & { is_done: 0 | 1 }>>(
    "SELECT * FROM todos ORDER BY is_done ASC, priority DESC, created_at DESC"
  );
  todos.set(
    rows.map((r) => ({ ...r, is_done: Boolean(r.is_done), done_at: r.done_at ?? null }))
  );
}

export async function addTodo(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;
  validateLength(trimmed, LIMITS.TODO_CONTENT, "Todo");
  const db = await getDb();
  const todo: Todo = {
    id: newId(),
    content: trimmed,
    is_done: false,
    priority: 0,
    created_at: now(),
    done_at: null,
  };
  await db.execute(
    "INSERT INTO todos (id, content, is_done, priority, created_at, done_at) VALUES (?, ?, ?, ?, ?, ?)",
    [todo.id, todo.content, 0, todo.priority, todo.created_at, null]
  );
  todos.update((list) => [todo, ...list]);
}

export async function toggleTodo(id: string) {
  const db = await getDb();
  let newDone: boolean | undefined;
  let doneAt: number | null = null;

  todos.update((list) => {
    const todo = list.find((t) => t.id === id);
    if (todo) {
      todo.is_done = !todo.is_done;
      newDone = todo.is_done;
      doneAt = newDone ? now() : null;
      todo.done_at = doneAt;
    }
    return [...list];
  });

  if (newDone !== undefined) {
    await db.execute(
      "UPDATE todos SET is_done = ?, done_at = ? WHERE id = ?",
      [newDone ? 1 : 0, doneAt, id]
    );
  }
}

export async function deleteTodo(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE id = ?", [id]);
  todos.update((list) => list.filter((t) => t.id !== id));
}
