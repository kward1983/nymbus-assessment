import type { Classification } from "../types/index";

/**
 * Classifies a transaction amount as "inflow", "outflow", or "unclassified".
 *
 * - Strictly positive → "inflow"     (Req 3.1)
 * - Strictly negative → "outflow"    (Req 3.2)
 * - Zero, null, undefined, NaN       → "unclassified" (Req 3.3, 3.6)
 */
export function classify(amount: number | null | undefined): Classification {
  if (amount === null || amount === undefined) return "unclassified";
  if (typeof amount === "number" && isNaN(amount)) return "unclassified";
  if (amount > 0) return "inflow";
  if (amount < 0) return "outflow";
  // amount === 0
  return "unclassified";
}

/**
 * Validates that a classification is consistent with the amount sign.
 *
 * Returns false when:
 *   - amount is positive and classification is "outflow"
 *   - amount is negative and classification is "inflow"
 *
 * Returns true for all other combinations, including "unclassified". (Req 3.8)
 */
export function validateClassificationConsistency(
  amount: number,
  classification: Classification
): boolean {
  if (amount > 0 && classification === "outflow") return false;
  if (amount < 0 && classification === "inflow") return false;
  return true;
}
