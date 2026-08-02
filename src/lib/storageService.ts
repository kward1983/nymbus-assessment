import { Transaction } from "../types/index";

export const STORAGE_KEY = "cashflow_transactions_v1";

/**
 * Serializes and persists the given transactions to localStorage synchronously.
 * Requirement 7.1
 */
export function save(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * Reads and deserializes transactions from localStorage.
 * Returns null if the key is absent.
 * Rethrows any JSON.parse error so the caller can handle corruption.
 * Requirements 7.2, 7.3
 */
export function load(): Transaction[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  // JSON.parse throws SyntaxError on corrupt data — let it propagate
  return JSON.parse(raw) as Transaction[];
}

/**
 * Removes the storage key from localStorage, effectively clearing all persisted
 * transaction data.
 * Requirement 7.3 (clear path), 7.6
 */
export function clear(): void {
  localStorage.removeItem(STORAGE_KEY);
}
