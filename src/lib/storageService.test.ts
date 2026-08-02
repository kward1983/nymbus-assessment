import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { save, load, clear, STORAGE_KEY } from "./storageService";
import { Transaction } from "../types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "test-id-1",
    date: "2024-01-15",
    description: "Test transaction",
    amount: 100.0,
    classification: "inflow",
    source: "manual",
    createdAt: "2024-01-15T10:00:00.000Z",
    ...overrides,
  };
}

const transactionArb = (): fc.Arbitrary<Transaction> =>
  fc
    .record({
      id: fc.uuid(),
      date: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }).map(
        (d) => d.toISOString().slice(0, 10)
      ),
      description: fc.string({ minLength: 1, maxLength: 255 }),
      amount: fc.float({ min: -999_999_999, max: 999_999_999, noNaN: true }),
      classification: fc.constantFrom("inflow", "outflow", "unclassified") as fc.Arbitrary<
        "inflow" | "outflow" | "unclassified"
      >,
      source: fc.constantFrom("csv", "manual") as fc.Arbitrary<"csv" | "manual">,
      createdAt: fc.date().map((d) => d.toISOString()),
    })
    .map((t) => t as Transaction);

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("storageService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("STORAGE_KEY", () => {
    it("should be the expected versioned key", () => {
      expect(STORAGE_KEY).toBe("cashflow_transactions_v1");
    });
  });

  describe("save", () => {
    it("writes transactions as JSON to localStorage under STORAGE_KEY", () => {
      const txns = [makeTransaction()];
      save(txns);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual(txns);
    });

    it("writes an empty array without error", () => {
      save([]);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBe("[]");
    });

    it("overwrites previously saved data", () => {
      const first = [makeTransaction({ id: "first" })];
      const second = [makeTransaction({ id: "second" }), makeTransaction({ id: "third" })];
      save(first);
      save(second);
      const loaded = load();
      expect(loaded).toHaveLength(2);
      expect(loaded![0].id).toBe("second");
    });
  });

  describe("load", () => {
    it("returns null when no data has been saved", () => {
      expect(load()).toBeNull();
    });

    it("returns the previously saved transactions", () => {
      const txns = [makeTransaction({ id: "abc" }), makeTransaction({ id: "def" })];
      save(txns);
      const result = load();
      expect(result).toEqual(txns);
    });

    it("throws when localStorage contains corrupted (non-JSON) data", () => {
      localStorage.setItem(STORAGE_KEY, "not valid json {{{{");
      expect(() => load()).toThrow();
    });

    it("throws when localStorage contains a truncated JSON string", () => {
      localStorage.setItem(STORAGE_KEY, '[{"id":"abc","date":"2024-01-01"');
      expect(() => load()).toThrow();
    });
  });

  describe("clear", () => {
    it("removes the STORAGE_KEY from localStorage", () => {
      save([makeTransaction()]);
      clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("does not throw when called with no data present", () => {
      expect(() => clear()).not.toThrow();
    });

    it("causes load() to return null after clearing", () => {
      save([makeTransaction()]);
      clear();
      expect(load()).toBeNull();
    });
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

/**
 * Property 8: Transaction persistence round-trip
 * Validates: Requirements 7.1, 7.2
 *
 * For any set of transactions added to the Transaction_Store, serializing to
 * localStorage and then deserializing should produce an equivalent set of
 * transactions (same ids, dates, amounts, descriptions, classifications).
 */
describe("storageService — Property 8: Transaction persistence round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("save → load produces an equivalent transaction array", () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 0, maxLength: 500 }),
        (transactions) => {
          save(transactions);
          const loaded = load();
          if (transactions.length === 0) {
            // Empty array round-trips to an empty array (not null)
            return Array.isArray(loaded) && loaded.length === 0;
          }
          if (loaded === null) return false;
          if (loaded.length !== transactions.length) return false;
          return transactions.every((original, i) => {
            const restored = loaded[i];
            return (
              restored.id === original.id &&
              restored.date === original.date &&
              restored.description === original.description &&
              restored.amount === original.amount &&
              restored.classification === original.classification
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
