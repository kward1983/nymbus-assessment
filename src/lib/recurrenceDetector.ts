import { differenceInDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, RecurringGroup, RecurrenceInterval } from "../types/index";

/**
 * Normalizes a transaction description for grouping purposes.
 * Req 4.1
 */
function normalizeDescription(desc: string): string {
  return desc.toLowerCase().trim();
}

/**
 * Classifies an average day-gap into a RecurrenceInterval.
 * - 6–8 days  → "weekly"
 * - 13–15 days → "biweekly"
 * - 28–31 days → "monthly"
 * Returns null if the gap doesn't match any interval.
 * Req 4.3
 */
function classifyInterval(avgGap: number): RecurrenceInterval | null {
  if (avgGap >= 6 && avgGap <= 8) return "weekly";
  if (avgGap >= 13 && avgGap <= 15) return "biweekly";
  if (avgGap >= 28 && avgGap <= 31) return "monthly";
  return null;
}

/**
 * Detects recurring transaction groups from a list of transactions.
 *
 * Algorithm:
 *   1. Group by normalized description (lowercase + trimmed).
 *   2. Skip groups where any transaction has isRecurringDismissed: true.  (Req 4.8)
 *   3. Compute max absolute amount in the group.
 *   4. Filter transactions where |amount - maxAbsAmount| / maxAbsAmount <= 0.01.  (Req 4.2)
 *   5. Skip if fewer than 2 transactions remain.  (Req 4.5)
 *   6. Sort remaining transactions by date ascending.
 *   7. Compute consecutive day-gaps, then average gap.
 *   8. Classify interval; skip if no valid interval.  (Req 4.3)
 *   9. Create RecurringGroup with status "pending" and a new UUID.  (Req 4.7)
 *
 * Req 4.1, 4.2, 4.3, 4.5, 4.7, 4.8
 */
export function detectRecurring(transactions: Transaction[]): RecurringGroup[] {
  // Step 1: group by normalized description
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = normalizeDescription(tx.description);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }

  const result: RecurringGroup[] = [];

  for (const [normalizedDescription, members] of groups) {
    // Step 2: exclude dismissed groups (Req 4.8)
    if (members.some((tx) => tx.isRecurringDismissed === true)) {
      continue;
    }

    // Step 3: compute max absolute amount in the group
    const maxAbsAmount = Math.max(...members.map((tx) => Math.abs(tx.amount)));

    // Guard: if maxAbsAmount is 0 we can't compute a ratio — skip
    if (maxAbsAmount === 0) {
      continue;
    }

    // Step 4: filter by amount tolerance (within 1% of max absolute value) (Req 4.2)
    const qualifying = members.filter(
      (tx) => Math.abs(Math.abs(tx.amount) - maxAbsAmount) / maxAbsAmount <= 0.01
    );

    // Step 5: need at least 2 transactions (Req 4.5)
    if (qualifying.length < 2) {
      continue;
    }

    // Step 6: sort by date ascending
    const sorted = [...qualifying].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Step 7: compute consecutive day-gaps
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = differenceInDays(
        new Date(sorted[i].date),
        new Date(sorted[i - 1].date)
      );
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

    // Step 8: classify interval (Req 4.3)
    const interval = classifyInterval(avgGap);
    if (interval === null) {
      continue;
    }

    // Step 9: compute averageAmount (raw, not absolute) (Req 4.7)
    const averageAmount =
      qualifying.reduce((sum, tx) => sum + tx.amount, 0) / qualifying.length;

    // Build RecurringGroup with status "pending" and a fresh UUID
    const group: RecurringGroup = {
      id: uuidv4(),
      normalizedDescription,
      interval,
      transactionIds: sorted.map((tx) => tx.id),
      averageAmount,
      status: "pending",
    };

    result.push(group);
  }

  return result;
}
