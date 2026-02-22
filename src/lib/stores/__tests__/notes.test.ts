import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";

// ─── Hoist mock references ────────────────────────────────────────────────────
const { mockExecute, mockSelect } = vi.hoisted(() => ({
  mockExecute: vi.fn().mockResolvedValue(undefined),
  mockSelect: vi.fn().mockResolvedValue([]),
}));

// Replace $lib/db: keep pure helpers real, stub out getDb()
vi.mock("$lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({
      execute: mockExecute,
      select: mockSelect,
    }),
  };
});

import {
  notes,
  activeNoteId,
  loadNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../notes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNote(overrides = {}) {
  return {
    id: "n1",
    title: "My note",
    content: "Some content",
    created_at: 1_000_000,
    updated_at: 1_000_000,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("notes store", () => {
  beforeEach(() => {
    notes.set([]);
    activeNoteId.set(null);
    mockExecute.mockClear();
    mockSelect.mockClear();
  });

  // ── loadNotes ──────────────────────────────────────────────────────────────

  describe("loadNotes", () => {
    it("populates the store from DB rows", async () => {
      mockSelect.mockResolvedValueOnce([
        makeNote({ id: "n1", title: "First" }),
        makeNote({ id: "n2", title: "Second" }),
      ]);

      await loadNotes();

      expect(get(notes)).toHaveLength(2);
      expect(get(notes)[0].title).toBe("First");
    });

    it("sets the first note as active", async () => {
      mockSelect.mockResolvedValueOnce([
        makeNote({ id: "n1" }),
        makeNote({ id: "n2" }),
      ]);

      await loadNotes();

      expect(get(activeNoteId)).toBe("n1");
    });

    it("does not set activeNoteId when there are no notes", async () => {
      mockSelect.mockResolvedValueOnce([]);
      await loadNotes();
      expect(get(activeNoteId)).toBeNull();
    });
  });

  // ── createNote ─────────────────────────────────────────────────────────────

  describe("createNote", () => {
    it("adds a new empty note to the store", async () => {
      await createNote();

      const state = get(notes);
      expect(state).toHaveLength(1);
      expect(state[0].title).toBe("");
      expect(state[0].content).toBe("");
    });

    it("sets the new note as active", async () => {
      const id = await createNote();
      expect(get(activeNoteId)).toBe(id);
    });

    it("returns the new note's id", async () => {
      const id = await createNote();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("executes an INSERT statement", async () => {
      await createNote();
      expect(mockExecute).toHaveBeenCalledOnce();
      expect(mockExecute.mock.calls[0][0]).toContain("INSERT INTO notes");
    });
  });

  // ── updateNote ─────────────────────────────────────────────────────────────

  describe("updateNote", () => {
    it("updates title and content in the store", async () => {
      notes.set([makeNote({ id: "n1", title: "Old title", content: "Old" })]);

      await updateNote("n1", "New title", "New content");

      const updated = get(notes).find((n) => n.id === "n1")!;
      expect(updated.title).toBe("New title");
      expect(updated.content).toBe("New content");
    });

    it("updates updated_at timestamp", async () => {
      const originalTs = 1_000_000;
      notes.set([makeNote({ id: "n1", updated_at: originalTs })]);
      const before = Date.now();

      await updateNote("n1", "Title", "Content");

      const updated = get(notes).find((n) => n.id === "n1")!;
      expect(updated.updated_at).toBeGreaterThanOrEqual(before);
    });

    it("executes an UPDATE statement", async () => {
      notes.set([makeNote({ id: "n1" })]);
      await updateNote("n1", "Title", "Content");

      expect(mockExecute).toHaveBeenCalledOnce();
      expect(mockExecute.mock.calls[0][0]).toContain("UPDATE notes SET");
    });

    it("accepts title at exactly 200 characters", async () => {
      notes.set([makeNote({ id: "n1" })]);
      await expect(
        updateNote("n1", "a".repeat(200), "content")
      ).resolves.not.toThrow();
    });

    it("throws when title exceeds 200 characters", async () => {
      notes.set([makeNote({ id: "n1" })]);

      await expect(
        updateNote("n1", "a".repeat(201), "content")
      ).rejects.toThrow("Note title exceeds maximum length of 200 characters");

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("accepts content at exactly 50 000 characters", async () => {
      notes.set([makeNote({ id: "n1" })]);
      await expect(
        updateNote("n1", "title", "a".repeat(50_000))
      ).resolves.not.toThrow();
    });

    it("throws when content exceeds 50 000 characters", async () => {
      notes.set([makeNote({ id: "n1" })]);

      await expect(
        updateNote("n1", "title", "a".repeat(50_001))
      ).rejects.toThrow(
        "Note content exceeds maximum length of 50000 characters"
      );

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  // ── deleteNote ─────────────────────────────────────────────────────────────

  describe("deleteNote", () => {
    it("removes the note from the store", async () => {
      notes.set([makeNote({ id: "n1" }), makeNote({ id: "n2" })]);

      await deleteNote("n1");

      expect(get(notes)).toHaveLength(1);
      expect(get(notes)[0].id).toBe("n2");
    });

    it("executes a DELETE statement with correct id", async () => {
      notes.set([makeNote({ id: "n1" })]);

      await deleteNote("n1");

      expect(mockExecute).toHaveBeenCalledWith(
        "DELETE FROM notes WHERE id = ?",
        ["n1"]
      );
    });

    it("sets activeNoteId to the next note after deletion", async () => {
      notes.set([makeNote({ id: "n1" }), makeNote({ id: "n2" })]);
      activeNoteId.set("n1");

      await deleteNote("n1");

      expect(get(activeNoteId)).toBe("n2");
    });

    it("sets activeNoteId to null when deleting the last note", async () => {
      notes.set([makeNote({ id: "n1" })]);
      activeNoteId.set("n1");

      await deleteNote("n1");

      expect(get(notes)).toHaveLength(0);
      expect(get(activeNoteId)).toBeNull();
    });
  });
});
