// ─── Primitive type aliases ───────────────────────────────────────────────────

export type Classification = "inflow" | "outflow" | "unclassified";

export type RecurrenceInterval = "weekly" | "biweekly" | "monthly";

// ─── Recurrence ───────────────────────────────────────────────────────────────

export interface RecurrenceConfig {
  interval: RecurrenceInterval;
  confirmedByUser: boolean;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;                          // UUID v4, generated at import/entry time
  date: string;                        // ISO 8601 (YYYY-MM-DD)
  description: string;                 // max 255 chars
  amount: number;                      // positive = inflow, negative = outflow
  classification: Classification;
  classificationOverride?: {
    value: Classification;
    timestamp: string;                 // ISO 8601 datetime
  };
  recurrence?: RecurrenceConfig;
  isRecurringConfirmed?: boolean;
  isRecurringDismissed?: boolean;
  recurringGroupId?: string;
  source: "csv" | "manual";
  createdAt: string;                   // ISO 8601 datetime
}

// ─── Recurring group ──────────────────────────────────────────────────────────

export interface RecurringGroup {
  id: string;                          // UUID v4
  normalizedDescription: string;
  interval: RecurrenceInterval;
  transactionIds: string[];
  averageAmount: number;
  status: "pending" | "confirmed" | "dismissed";
}

// ─── CSV import ───────────────────────────────────────────────────────────────

export type SkipReason =
  | "missing_field"
  | "unparseable_amount"
  | "unparseable_date";

export interface SkippedRow {
  rowNumber: number;
  reason: SkipReason;
  fieldName?: string;
}

export interface ParseResult {
  transactions: Transaction[];
  skippedRows: SkippedRow[];
  totalRows: number;
}

export interface ValidationSummary {
  importedCount: number;
  skippedCount: number;
  skippedRows: SkippedRow[];
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface ProjectedTransaction {
  id: string;
  description: string;
  amount: number;
  classification: Classification;
  isRecurring: boolean;
  isFuture: boolean;
  sourceId?: string;
}

export interface DayProjection {
  date: string;                        // ISO 8601 (YYYY-MM-DD)
  transactions: ProjectedTransaction[];
  runningBalance: number;
  isNegative: boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface StoreState {
  transactions: Transaction[];
  recurringGroups: RecurringGroup[];
  loadError: string | null;
}

export type StoreAction =
  | { type: "ADD_TRANSACTIONS"; payload: Transaction[] }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }         // transaction id
  | { type: "CONFIRM_RECURRING"; payload: string }          // groupId
  | { type: "DISMISS_RECURRING"; payload: string }          // groupId
  | { type: "OVERRIDE_CLASSIFICATION"; payload: { id: string; classification: Classification } }
  | { type: "CLEAR_ALL" }
  | { type: "LOAD_FROM_STORAGE"; payload: Transaction[] }
  | { type: "STORAGE_LOAD_ERROR" };
