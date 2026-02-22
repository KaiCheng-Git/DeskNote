import { writable } from "svelte/store";
import { getDb, newId, now } from "../db";

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export const notes = writable<Note[]>([]);
export const activeNoteId = writable<string | null>(null);

export async function loadNotes() {
  const db = await getDb();
  const rows = await db.select<Note[]>(
    "SELECT * FROM notes ORDER BY updated_at DESC"
  );
  notes.set(rows);
  // Auto-select first note or create one if empty
  if (rows.length > 0) {
    activeNoteId.set(rows[0].id);
  }
}

export async function createNote() {
  const db = await getDb();
  const note: Note = {
    id: newId(),
    title: "",
    content: "",
    created_at: now(),
    updated_at: now(),
  };
  await db.execute(
    "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [note.id, note.title, note.content, note.created_at, note.updated_at]
  );
  notes.update((list) => [note, ...list]);
  activeNoteId.set(note.id);
  return note.id;
}

export async function updateNote(id: string, title: string, content: string) {
  const db = await getDb();
  const ts = now();
  await db.execute(
    "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
    [title, content, ts, id]
  );
  notes.update((list) =>
    list.map((n) => (n.id === id ? { ...n, title, content, updated_at: ts } : n))
  );
}

export async function deleteNote(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = ?", [id]);
  notes.update((list) => {
    const filtered = list.filter((n) => n.id !== id);
    activeNoteId.set(filtered.length > 0 ? filtered[0].id : null);
    return filtered;
  });
}
