import { describe, it, expect } from "vitest";
import { detectRecurring } from "./recurrenceDetector";
import type { Transaction } from "../types/index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function makeTx(overrides: Partial<Transaction> & { date: string; amount: number; description: string }): Transaction {
  return {
    id: `tx-${++idCounter}`,
    date: overrides.date,
    description: overrides.description,
    amount: overrides.amount,
    classification: overrides.amount >= 0 ? "inflow" : "outflow",
    source: "csv",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("detectRecurring", () => {
  describe("description normalization (Req 4.1)", () => {
    it("groups transactions with same description after lowercase + trim", () => {
      const txs = [
        makeTx({ description: "  Netflix  ", date: "2024-01-07", amount: -15.99 }),
        makeTx({ description: "netflix", date: "2024-01-14", amount: -15.99 }),
        makeTx({ description: "NETFLIX", date: "2024-01-21", amount: -15.99 }),
        makeTx({ description: "NETFLIX", date: "2024-01-28", amount: -15.99 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].normalizedDescription).toBe("netflix");
    });
  });

  describe("amount tolerance (Req 4.2)", () => {
    it("includes transactions within 1% of max absolute amount", () => {
      // max = 100, tolerance = ±1 → 99.5 is within range
      const txs = [
        makeTx({ description: "gym", date: "2024-01-07", amount: -100 }),
        makeTx({ description: "gym", date: "2024-01-14", amount: -99.5 }),
        makeTx({ description: "gym", date: "2024-01-21", amount: -100 }),
        makeTx({ description: "gym", date: "2024-01-28", amount: -100 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].transactionIds).toHaveLength(4);
    });

    it("excludes transactions more than 1% away from max absolute amount", () => {
      // max = 100; 97 is 3% away → excluded
      // Only 2 remain (the 100s) which qualify
      const txs = [
        makeTx({ description: "gym", date: "2024-01-07", amount: -100 }),
        makeTx({ description: "gym", date: "2024-01-14", amount: -97 }),  // excluded
        makeTx({ description: "gym", date: "2024-01-21", amount: -100 }),
        makeTx({ description: "gym", date: "2024-01-28", amount: -100 }),
      ];
      const groups = detectRecurring(txs);
      // 3 qualifying (100, 100, 100) with 28-day span → monthly
      expect(groups).toHaveLength(1);
      expect(groups[0].transactionIds).toHaveLength(3);
    });
  });

  describe("interval classification (Req 4.3)", () => {
    it("classifies 7-day gaps as weekly", () => {
      const txs = [
        makeTx({ description: "coffee", date: "2024-01-01", amount: -5 }),
        makeTx({ description: "coffee", date: "2024-01-08", amount: -5 }),
        makeTx({ description: "coffee", date: "2024-01-15", amount: -5 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].interval).toBe("weekly");
    });

    it("classifies 14-day gaps as biweekly", () => {
      const txs = [
        makeTx({ description: "paycheck", date: "2024-01-01", amount: 1000 }),
        makeTx({ description: "paycheck", date: "2024-01-15", amount: 1000 }),
        makeTx({ description: "paycheck", date: "2024-01-29", amount: 1000 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].interval).toBe("biweekly");
    });

    it("classifies 30-day gaps as monthly", () => {
      const txs = [
        makeTx({ description: "rent", date: "2024-01-01", amount: -1200 }),
        makeTx({ description: "rent", date: "2024-01-31", amount: -1200 }),
        makeTx({ description: "rent", date: "2024-03-01", amount: -1200 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
      expect(groups[0].interval).toBe("monthly");
    });

    it("skips groups with unrecognized intervals (e.g. 20-day gaps)", () => {
      const txs = [
        makeTx({ description: "random", date: "2024-01-01", amount: -50 }),
        makeTx({ description: "random", date: "2024-01-21", amount: -50 }),
        makeTx({ description: "random", date: "2024-02-10", amount: -50 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(0);
    });
  });

  describe("minimum occurrences (Req 4.5)", () => {
    it("skips groups with only 1 transaction", () => {
      const txs = [
        makeTx({ description: "onetime", date: "2024-01-01", amount: -100 }),
      ];
      expect(detectRecurring(txs)).toHaveLength(0);
    });

    it("includes groups with exactly 2 transactions and a valid interval", () => {
      const txs = [
        makeTx({ description: "sub", date: "2024-01-01", amount: -9.99 }),
        makeTx({ description: "sub", date: "2024-01-31", amount: -9.99 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
    });
  });

  describe("group properties (Req 4.7)", () => {
    it("assigns a UUID id to each group", () => {
      const txs = [
        makeTx({ description: "netflix", date: "2024-01-01", amount: -15.99 }),
        makeTx({ description: "netflix", date: "2024-02-01", amount: -15.99 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("sets status to 'pending'", () => {
      const txs = [
        makeTx({ description: "netflix", date: "2024-01-01", amount: -15.99 }),
        makeTx({ description: "netflix", date: "2024-02-01", amount: -15.99 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups[0].status).toBe("pending");
    });

    it("computes averageAmount as mean of raw amounts (not absolute)", () => {
      const txs = [
        makeTx({ description: "sub", date: "2024-01-01", amount: -10 }),
        makeTx({ description: "sub", date: "2024-01-31", amount: -10 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups[0].averageAmount).toBe(-10);
    });

    it("averageAmount reflects mixed positive amounts correctly", () => {
      const txs = [
        makeTx({ description: "salary", date: "2024-01-01", amount: 2000 }),
        makeTx({ description: "salary", date: "2024-01-31", amount: 2000 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups[0].averageAmount).toBe(2000);
    });

    it("transactionIds are sorted by date ascending", () => {
      const t1 = makeTx({ description: "rent", date: "2024-03-01", amount: -1200 });
      const t2 = makeTx({ description: "rent", date: "2024-01-01", amount: -1200 });
      const t3 = makeTx({ description: "rent", date: "2024-02-01", amount: -1200 });
      const groups = detectRecurring([t1, t2, t3]);
      expect(groups[0].transactionIds).toEqual([t2.id, t3.id, t1.id]);
    });
  });

  describe("dismissed group exclusion (Req 4.8)", () => {
    it("excludes groups where any transaction has isRecurringDismissed: true", () => {
      const txs = [
        makeTx({ description: "gym", date: "2024-01-01", amount: -50, isRecurringDismissed: true }),
        makeTx({ description: "gym", date: "2024-01-31", amount: -50 }),
        makeTx({ description: "gym", date: "2024-03-01", amount: -50 }),
      ];
      expect(detectRecurring(txs)).toHaveLength(0);
    });

    it("does not exclude groups where isRecurringDismissed is false or undefined", () => {
      const txs = [
        makeTx({ description: "gym", date: "2024-01-01", amount: -50, isRecurringDismissed: false }),
        makeTx({ description: "gym", date: "2024-01-31", amount: -50 }),
        makeTx({ description: "gym", date: "2024-03-01", amount: -50 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(1);
    });
  });

  describe("multiple groups", () => {
    it("returns separate groups for different descriptions", () => {
      const txs = [
        makeTx({ description: "netflix", date: "2024-01-01", amount: -15.99 }),
        makeTx({ description: "netflix", date: "2024-02-01", amount: -15.99 }),
        makeTx({ description: "spotify", date: "2024-01-07", amount: -9.99 }),
        makeTx({ description: "spotify", date: "2024-01-14", amount: -9.99 }),
        makeTx({ description: "spotify", date: "2024-01-21", amount: -9.99 }),
      ];
      const groups = detectRecurring(txs);
      expect(groups).toHaveLength(2);
      const descriptions = groups.map((g) => g.normalizedDescription).sort();
      expect(descriptions).toEqual(["netflix", "spotify"]);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      expect(detectRecurring([])).toEqual([]);
    });

    it("returns unique UUIDs for each group", () => {
      const txs = [
        makeTx({ description: "netflix", date: "2024-01-01", amount: -15.99 }),
        makeTx({ description: "netflix", date: "2024-02-01", amount: -15.99 }),
        makeTx({ description: "spotify", date: "2024-01-07", amount: -9.99 }),
        makeTx({ description: "spotify", date: "2024-01-14", amount: -9.99 }),
        makeTx({ description: "spotify", date: "2024-01-21", amount: -9.99 }),
      ];
      const groups = detectRecurring(txs);
      const ids = groups.map((g) => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
