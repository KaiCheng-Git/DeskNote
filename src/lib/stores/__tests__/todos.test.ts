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

import { todos, loadTodos, addTodo, toggleTodo, deleteTodo } from "../todos";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTodo(overrides = {}) {
  return {
    id: "t1",
    content: "Test todo",
    is_done: false,
    priority: 0,
    created_at: 1_000_000,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("todos store", () => {
  beforeEach(() => {
    todos.set([]);
    mockExecute.mockClear();
    mockSelect.mockClear();
  });

  // ── loadTodos ──────────────────────────────────────────────────────────────

  describe("loadTodos", () => {
    it("populates the store from DB rows", async () => {
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Buy milk", is_done: 0, priority: 0, created_at: 1000 },
        { id: "t2", content: "Call mom", is_done: 1, priority: 0, created_at: 2000 },
      ]);

      await loadTodos();

      const state = get(todos);
      expect(state).toHaveLength(2);
      expect(state[0].content).toBe("Buy milk");
    });

    it("converts is_done integer to boolean", async () => {
      mockSelect.mockResolvedValueOnce([
        { id: "t1", content: "Done item", is_done: 1, priority: 0, created_at: 1000 },
        { id: "t2", content: "Pending", is_done: 0, priority: 0, created_at: 2000 },
      ]);

      await loadTodos();
      const [done, pending] = get(todos);

      expect(done.is_done).toBe(true);
      expect(pending.is_done).toBe(false);
    });

    it("sets an empty store when DB has no rows", async () => {
      mockSelect.mockResolvedValueOnce([]);
      await loadTodos();
      expect(get(todos)).toHaveLength(0);
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
    });

    it("executes an INSERT statement", async () => {
      await addTodo("Write tests");
      expect(mockExecute).toHaveBeenCalledOnce();
      expect(mockExecute.mock.calls[0][0]).toContain("INSERT INTO todos");
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

    it("marks a done todo as incomplete", async () => {
      todos.set([makeTodo({ id: "t1", is_done: true })]);

      await toggleTodo("t1");

      expect(get(todos)[0].is_done).toBe(false);
    });

    it("executes an UPDATE with is_done = 1 when toggling to done", async () => {
      todos.set([makeTodo({ id: "t1", is_done: false })]);

      await toggleTodo("t1");

      expect(mockExecute).toHaveBeenCalledWith(
        "UPDATE todos SET is_done = ? WHERE id = ?",
        [1, "t1"]
      );
    });

    it("executes an UPDATE with is_done = 0 when toggling to undone", async () => {
      todos.set([makeTodo({ id: "t1", is_done: true })]);

      await toggleTodo("t1");

      expect(mockExecute).toHaveBeenCalledWith(
        "UPDATE todos SET is_done = ? WHERE id = ?",
        [0, "t1"]
      );
    });

    it("does nothing when the id does not exist", async () => {
      todos.set([makeTodo({ id: "t1" })]);

      await toggleTodo("nonexistent");

      expect(get(todos)[0].is_done).toBe(false);
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
});
