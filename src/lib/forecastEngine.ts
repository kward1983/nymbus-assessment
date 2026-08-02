import {
  addDays,
  addWeeks,
  addMonths,
  parseISO,
  format,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, DayProjection, ProjectedTransaction } from "../types/index";

/**
 * Generates a daily cash flow forecast for the given projection window.
 *
 * Algorithm:
 *   1. Establish startDate = today (midnight), endDate = today + projectionDays.
 *   2. Compute initialBalance = sum of all past transactions (date < startDate).
 *   3. Build a map of date-string → ProjectedTransaction[].
 *        a. Confirmed recurring transactions: extrapolate future occurrences from
 *           the last known date up to endDate.
 *        b. One-time manual future transactions: insert directly if date ≤ endDate.
 *   4. Walk each day from startDate to endDate, accumulating runningBalance.
 *   5. Return DayProjection[] sorted ascending by date.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.9, 5.10
 */
export function generateForecast(
  transactions: Transaction[],
  projectionDays: 30 | 60 | 90
): DayProjection[] {
  const today = startOfDay(new Date());
  const startDate = today;
  const endDate = addDays(today, projectionDays);

  // ── Step 2: initial balance from all historical (past) transactions ──────────
  // "past" = date strictly before today
  let initialBalance = 0;
  for (const tx of transactions) {
    const txDate = startOfDay(parseISO(tx.date));
    if (isBefore(txDate, startDate)) {
      initialBalance += tx.amount;
    }
  }

  // ── Step 3: build date → ProjectedTransaction[] map ─────────────────────────
  const projectionMap = new Map<string, ProjectedTransaction[]>();

  /** Inserts a projected transaction into the map for the given date string */
  function insertProjected(dateStr: string, pt: ProjectedTransaction): void {
    if (!projectionMap.has(dateStr)) {
      projectionMap.set(dateStr, []);
    }
    projectionMap.get(dateStr)!.push(pt);
  }

  // ── 3a: confirmed recurring transactions ─────────────────────────────────
  // Group confirmed recurring transactions by normalized description + interval
  // to prevent duplicate extrapolation from multiple members of the same group.
  const processedRecurringGroups = new Set<string>();

  for (const tx of transactions) {
    const txDate = startOfDay(parseISO(tx.date));

    if (tx.isRecurringConfirmed && tx.recurrence && tx.recurrence.confirmedByUser) {
      const interval = tx.recurrence.interval;
      const groupKey = `${tx.description.toLowerCase().trim()}|${interval}`;

      // Skip if we already processed this recurring group
      if (processedRecurringGroups.has(groupKey)) {
        continue;
      }
      processedRecurringGroups.add(groupKey);

      // Find the last known occurrence date within this group
      const sameGroup = transactions.filter(
        (t) =>
          t.isRecurringConfirmed &&
          t.recurrence?.interval === interval &&
          t.description.toLowerCase().trim() === tx.description.toLowerCase().trim()
      );

      const lastKnownDate = sameGroup.reduce<Date>((latest, t) => {
        const d = startOfDay(parseISO(t.date));
        return isAfter(d, latest) ? d : latest;
      }, txDate);

      // Extrapolate future occurrences starting from the next occurrence after lastKnownDate
      let nextDate = advanceByInterval(lastKnownDate, interval);

      while (!isAfter(nextDate, endDate)) {
        // Only include occurrences that fall within the projection window
        if (!isBefore(nextDate, startDate)) {
          const dateStr = format(nextDate, "yyyy-MM-dd");
          insertProjected(dateStr, {
            id: uuidv4(),
            description: tx.description,
            amount: tx.amount,
            classification: tx.classification,
            isRecurring: true,
            isFuture: true,
            sourceId: tx.id,
          });
        }
        nextDate = advanceByInterval(nextDate, interval);
      }
    }

    // ── 3b: one-time future manual transactions ───────────────────────────────
    if (
      tx.source === "manual" &&
      !tx.isRecurringConfirmed &&
      !isBefore(txDate, startDate) &&
      !isAfter(txDate, endDate)
    ) {
      const dateStr = format(txDate, "yyyy-MM-dd");
      insertProjected(dateStr, {
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        classification: tx.classification,
        isRecurring: false,
        isFuture: true,
        sourceId: tx.id,
      });
    }
  }

  // ── Step 4: walk day by day accumulating running balance ─────────────────────
  const result: DayProjection[] = [];
  let runningBalance = initialBalance;
  let current = startDate;

  while (!isAfter(current, endDate)) {
    const dateStr = format(current, "yyyy-MM-dd");
    const dayTransactions = projectionMap.get(dateStr) ?? [];

    for (const pt of dayTransactions) {
      runningBalance += pt.amount;
    }

    result.push({
      date: dateStr,
      transactions: dayTransactions,
      runningBalance,
      isNegative: runningBalance < 0,
    });

    current = addDays(current, 1);
  }

  // ── Step 5: return sorted ascending by date (already in order) ───────────────
  return result;
}

/**
 * Advances a date by a single occurrence of the given recurrence interval.
 */
function advanceByInterval(date: Date, interval: "weekly" | "biweekly" | "monthly"): Date {
  switch (interval) {
    case "weekly":
      return addWeeks(date, 1);
    case "biweekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
  }
}
