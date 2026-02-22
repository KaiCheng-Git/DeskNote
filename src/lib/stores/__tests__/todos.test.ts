import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";

// ─── Hoist mock references so they're available inside vi.mock factory ───────
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
  todos,
  archivedCount,
  loadTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  archiveOldTodos,
} from "../todos";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTodo(overrides = {}) {
  return {
    id: "t1",
    content: "Test todo",
    is_done: false,
    priority: 0,
    created_at: 1_000_000,
    done_at: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("todos store", () => {
  beforeEach(() => {
    todos.set([]);
    archivedCount.set(0);
    mockExecute.mockClear();
    mockSelect.mockClear();
  });

  // ── loadTodos ──────────────────────────────────────────────────────────────

  describe("loadTodos", () => {
    it("populates the store from DB rows", async () => {
      // archiveOldTodos: check for old done todos (none)
      mockSelect.mockResolvedValueOnce([]);
      // archiveOldTodos: count archived
      mockSelect.mockResolvedValueOnce([{ count: 0 }]);
      // loadTodos: actual todos
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Buy milk", is_done: 0, priority: 0, created_at: 1000, done_at: null },
        { id: "t2", content: "Call mom", is_done: 1, priority: 0, created_at: 2000, done_at: 1000 },
      ]);

      await loadTodos();

      const state = get(todos);
      expect(state).toHaveLength(2);
      expect(state[0].content).toBe("Buy milk");
    });

    it("converts is_done integer to boolean", async () => {
      mockSelect.mockResolvedValueOnce([]); // archive check
      mockSelect.mockResolvedValueOnce([{ count: 0 }]); // archive count
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Done item", is_done: 1, priority: 0, created_at: 1000, done_at: 999 },
        { id: "t2", content: "Pending", is_done: 0, priority: 0, created_at: 2000, done_at: null },
      ]);

      await loadTodos();
      const [done, pending] = get(todos);

      expect(done.is_done).toBe(true);
      expect(pending.is_done).toBe(false);
    });

    it("sets an empty store when DB has no rows", async () => {
      mockSelect.mockResolvedValueOnce([]); // archive check
      mockSelect.mockResolvedValueOnce([{ count: 0 }]); // archive count
      mockSelect.mockResolvedValueOnce([]); // loadTodos
      await loadTodos();
      expect(get(todos)).toHaveLength(0);
    });

    it("normalises missing done_at to null", async () => {
      mockSelect.mockResolvedValueOnce([]); // archive check
      mockSelect.mockResolvedValueOnce([{ count: 0 }]); // archive count
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Old row", is_done: 0, priority: 0, created_at: 1000, done_at: undefined },
      ]);

      await loadTodos();

      expect(get(todos)[0].done_at).toBeNull();
    });
  });

  // ── addTodo ────────────────────────────────────────────────────────────────

  describe("addTodo", () => {
    it("adds a new todo to the store", async () => {
      await addTodo("Write tests");

      const state = get(todos);
      expect(state).toHaveLength(1);
      expect(state[0].content).toBe("Write tests");
      expect(state[0].is_done).toBe(false);
      expect(state[0].done_at).toBeNull();
    });

    it("executes an INSERT statement with done_at = null", async () => {
      await addTodo("Write tests");
      expect(mockExecute).toHaveBeenCalledOnce();
      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain("INSERT INTO todos");
      expect(sql).toContain("done_at");
      expect(params[params.length - 1]).toBeNull(); // done_at is last param, must be null
    });

    it("trims surrounding whitespace", async () => {
      await addTodo("  trimmed  ");
      expect(get(todos)[0].content).toBe("trimmed");
    });

    it("ignores content that is only whitespace", async () => {
      await addTodo("   ");
      expect(get(todos)).toHaveLength(0);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("ignores an empty string", async () => {
      await addTodo("");
      expect(get(todos)).toHaveLength(0);
    });

    it("accepts content of exactly 500 characters", async () => {
      await addTodo("a".repeat(500));
      expect(get(todos)).toHaveLength(1);
    });

    it("throws when content exceeds 500 characters", async () => {
      await expect(addTodo("a".repeat(501))).rejects.toThrow(
        "Todo exceeds maximum length of 500 characters"
      );
      expect(get(todos)).toHaveLength(0);
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  // ── toggleTodo ─────────────────────────────────────────────────────────────

  describe("toggleTodo", () => {
    it("marks an incomplete todo as done", async () => {
      todos.set([makeTodo({ id: "t1", is_done: false })]);

      await toggleTodo("t1");

      expect(get(todos)[0].is_done).toBe(true);
    });

    it("sets done_at timestamp when marking as done", async () => {
      const before = Date.now();
      todos.set([makeTodo({ id: "t1", is_done: false })]);

      await toggleTodo("t1");

      const doneAt = get(todos)[0].done_at;
      expect(typeof doneAt).toBe("number");
      expect(doneAt as number).toBeGreaterThanOrEqual(before);
    });

    it("marks a done todo as incomplete", async () => {
      todos.set([makeTodo({ id: "t1", is_done: true, done_at: 1234 })]);

      await toggleTodo("t1");

      expect(get(todos)[0].is_done).toBe(false);
    });

    it("clears done_at when marking as incomplete", async () => {
      todos.set([makeTodo({ id: "t1", is_done: true, done_at: 1234 })]);

      await toggleTodo("t1");

      expect(get(todos)[0].done_at).toBeNull();
    });

    it("executes UPDATE with is_done=1 and a done_at timestamp when toggling to done", async () => {
      todos.set([makeTodo({ id: "t1", is_done: false })]);

      await toggleTodo("t1");

      expect(mockExecute).toHaveBeenCalledOnce();
      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toBe("UPDATE todos SET is_done = ?, done_at = ? WHERE id = ?");
      expect(params[0]).toBe(1);
      expect(typeof params[1]).toBe("number"); // done_at timestamp
      expect(params[2]).toBe("t1");
    });

    it("executes UPDATE with is_done=0 and done_at=null when toggling to undone", async () => {
      todos.set([makeTodo({ id: "t1", is_done: true, done_at: 1234 })]);

      await toggleTodo("t1");

      expect(mockExecute).toHaveBeenCalledWith(
        "UPDATE todos SET is_done = ?, done_at = ? WHERE id = ?",
        [0, null, "t1"]
      );
    });

    it("does nothing when the id does not exist", async () => {
      todos.set([makeTodo({ id: "t1" })]);

      await toggleTodo("nonexistent");

      expect(get(todos)[0].is_done).toBe(false);
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  // ── deleteTodo ─────────────────────────────────────────────────────────────

  describe("deleteTodo", () => {
    it("removes the todo from the store", async () => {
      todos.set([
        makeTodo({ id: "t1", content: "First" }),
        makeTodo({ id: "t2", content: "Second" }),
      ]);

      await deleteTodo("t1");

      const state = get(todos);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe("t2");
    });

    it("executes a DELETE statement with correct id", async () => {
      todos.set([makeTodo({ id: "t1" })]);

      await deleteTodo("t1");

      expect(mockExecute).toHaveBeenCalledWith(
        "DELETE FROM todos WHERE id = ?",
        ["t1"]
      );
    });

    it("leaves store unchanged when id does not exist", async () => {
      todos.set([makeTodo({ id: "t1" })]);

      await deleteTodo("nonexistent");

      expect(get(todos)).toHaveLength(1);
    });
  });

  // ── archiveOldTodos ────────────────────────────────────────────────────────

  describe("archiveOldTodos", () => {
    it("sets archivedCount from DB even when nothing to archive", async () => {
      mockSelect.mockResolvedValueOnce([]); // no old done todos
      mockSelect.mockResolvedValueOnce([{ count: 3 }]); // archive count

      await archiveOldTodos();

      expect(get(archivedCount)).toBe(3);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("archives todos completed more than 30 days ago", async () => {
      const oldDoneAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Old done", priority: 0, created_at: 1000, done_at: oldDoneAt },
      ]); // 1 todo to archive
      mockSelect.mockResolvedValueOnce([{ count: 1 }]); // archive count after

      await archiveOldTodos();

      // INSERT into archive + DELETE from todos
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute.mock.calls[0][0]).toContain("INSERT OR IGNORE INTO todos_archive");
      expect(mockExecute.mock.calls[1][0]).toContain("DELETE FROM todos WHERE id = ?");
      expect(mockExecute.mock.calls[1][1]).toEqual(["t1"]);
      expect(get(archivedCount)).toBe(1);
    });

    it("archives multiple old todos in a single call", async () => {
      const oldDoneAt = Date.now() - 35 * 24 * 60 * 60 * 1000;
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Old 1", priority: 0, created_at: 1000, done_at: oldDoneAt },
        { id: "t2", content: "Old 2", priority: 0, created_at: 2000, done_at: oldDoneAt },
      ]);
      mockSelect.mockResolvedValueOnce([{ count: 2 }]);

      await archiveOldTodos();

      // 2 todos × (INSERT + DELETE) = 4 execute calls
      expect(mockExecute).toHaveBeenCalledTimes(4);
      expect(get(archivedCount)).toBe(2);
    });

    it("defaults archivedCount to 0 when count row is missing", async () => {
      mockSelect.mockResolvedValueOnce([]); // nothing to archive
      mockSelect.mockResolvedValueOnce([]); // count row missing

      await archiveOldTodos();

      expect(get(archivedCount)).toBe(0);
    });
  });
});
