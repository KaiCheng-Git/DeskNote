import { describe, it, expect, vi } from "vitest";

// Mock @tauri-apps/plugin-sql so the db module can be imported in Node/jsdom
vi.mock("@tauri-apps/plugin-sql", () => ({
  default: class MockDatabase {
    static async load() {
      return new MockDatabase();
    }
    async execute() {}
    async select() {
      return [];
    }
  },
}));

import { LIMITS, validateLength, newId, now, DB_VERSION } from "$lib/db";

// ─── LIMITS ────────────────────────────────────────────────────────────────

describe("LIMITS", () => {
  it("TODO_CONTENT is 500", () => {
    expect(LIMITS.TODO_CONTENT).toBe(500);
  });

  it("NOTE_TITLE is 200", () => {
    expect(LIMITS.NOTE_TITLE).toBe(200);
  });

  it("NOTE_CONTENT is 50 000", () => {
    expect(LIMITS.NOTE_CONTENT).toBe(50_000);
  });

  it("WORKLOG_CONTENT is 10 000", () => {
    expect(LIMITS.WORKLOG_CONTENT).toBe(10_000);
  });
});

// ─── validateLength ─────────────────────────────────────────────────────────

describe("validateLength", () => {
  it("does not throw when value is within limit", () => {
    expect(() => validateLength("hello", 500, "Todo")).not.toThrow();
  });

  it("does not throw when value is empty string", () => {
    expect(() => validateLength("", 500, "Todo")).not.toThrow();
  });

  it("does not throw when value is exactly at the limit", () => {
    expect(() => validateLength("a".repeat(500), 500, "Todo")).not.toThrow();
  });

  it("throws when value exceeds the limit", () => {
    expect(() => validateLength("a".repeat(501), 500, "Todo")).toThrow(
      "Todo exceeds maximum length of 500 characters"
    );
  });

  it("includes the field name in the error message", () => {
    expect(() => validateLength("a".repeat(201), 200, "Note title")).toThrow(
      "Note title exceeds maximum length of 200 characters"
    );
  });

  it("includes the max value in the error message", () => {
    expect(() => validateLength("x".repeat(51), 50, "Tag")).toThrow(
      "maximum length of 50"
    );
  });
});

// ─── newId ──────────────────────────────────────────────────────────────────

describe("newId", () => {
  it("returns a valid UUID v4 format", () => {
    const id = newId();
    // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns a unique value on each call", () => {
    const ids = new Set(Array.from({ length: 20 }, () => newId()));
    expect(ids.size).toBe(20);
  });
});

// ─── now ────────────────────────────────────────────────────────────────────

describe("now", () => {
  it("returns a number", () => {
    expect(typeof now()).toBe("number");
  });

  it("returns a timestamp close to Date.now()", () => {
    const before = Date.now();
    const ts = now();
    const after = Date.now();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── DB_VERSION ─────────────────────────────────────────────────────────────

describe("DB_VERSION", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(DB_VERSION)).toBe(true);
    expect(DB_VERSION).toBeGreaterThan(0);
  });

  it("is currently 2 (v1: initial schema, v2: done_at + archive table)", () => {
    expect(DB_VERSION).toBe(2);
  });
});
