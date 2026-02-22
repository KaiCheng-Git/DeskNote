import { writable } from "svelte/store";
import { getDb, newId, now, LIMITS, validateLength } from "../db";

export interface Todo {
  id: string;
  content: string;
  is_done: boolean;
  priority: number; // 0=normal 1=important 2=urgent
  created_at: number;
}

export const todos = writable<Todo[]>([]);

export async function loadTodos() {
  const db = await getDb();
  const rows = await db.select<Todo[]>(
    "SELECT * FROM todos ORDER BY is_done ASC, priority DESC, created_at DESC"
  );
  todos.set(rows.map((r) => ({ ...r, is_done: Boolean(r.is_done) })));
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
  };
  await db.execute(
    "INSERT INTO todos (id, content, is_done, priority, created_at) VALUES (?, ?, ?, ?, ?)",
    [todo.id, todo.content, 0, todo.priority, todo.created_at]
  );
  todos.update((list) => [todo, ...list]);
}

export async function toggleTodo(id: string) {
  const db = await getDb();
  todos.update((list) => {
    const todo = list.find((t) => t.id === id);
    if (todo) {
      todo.is_done = !todo.is_done;
      db.execute("UPDATE todos SET is_done = ? WHERE id = ?", [
        todo.is_done ? 1 : 0,
        id,
      ]);
    }
    return [...list];
  });
}

export async function deleteTodo(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM todos WHERE id = ?", [id]);
  todos.update((list) => list.filter((t) => t.id !== id));
}
