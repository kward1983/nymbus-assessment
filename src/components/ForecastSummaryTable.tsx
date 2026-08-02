import type { DayProjection, Classification } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ForecastSummaryTableProps {
  data: DayProjection[];
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Displays a summary table of all projected transactions sorted ascending
 * by date, showing date, description, amount, classification, and cumulative
 * running balance. Rows with a negative running balance are highlighted.
 *
 * Validates: Requirements 5.7, 5.8
 */
export function ForecastSummaryTable({ data }: ForecastSummaryTableProps) {
  // Flatten DayProjection[] into individual table rows
  const rows = flattenProjections(data);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No projected transactions to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-700">Date</th>
            <th className="px-4 py-3 font-medium text-slate-700">Description</th>
            <th className="px-4 py-3 font-medium text-slate-700">Amount</th>
            <th className="px-4 py-3 font-medium text-slate-700">Classification</th>
            <th className="px-4 py-3 font-medium text-slate-700">Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.date}-${row.transactionId}-${index}`}
              className={`border-b border-slate-100 transition-colors ${
                row.isNegative
                  ? "bg-red-50 hover:bg-red-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
              <td className="px-4 py-3">
                <span className="block truncate max-w-xs">{row.description}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums">
                {formatAmount(row.amount)}
              </td>
              <td className="px-4 py-3">
                <ClassificationBadge classification={row.classification} />
              </td>
              <td
                className={`px-4 py-3 whitespace-nowrap font-medium tabular-nums ${
                  row.isNegative ? "text-red-600" : "text-slate-900"
                }`}
              >
                {formatAmount(row.runningBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Flattened row type ───────────────────────────────────────────────────────

interface FlatRow {
  date: string;
  transactionId: string;
  description: string;
  amount: number;
  classification: Classification;
  runningBalance: number;
  isNegative: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenProjections(data: DayProjection[]): FlatRow[] {
  const rows: FlatRow[] = [];

  // Data should already be sorted ascending by date
  for (const day of data) {
    for (const txn of day.transactions) {
      rows.push({
        date: day.date,
        transactionId: txn.id,
        description: txn.description,
        amount: txn.amount,
        classification: txn.classification,
        runningBalance: day.runningBalance,
        isNegative: day.isNegative,
      });
    }
  }

  return rows;
}

function ClassificationBadge({
  classification,
}: {
  classification: Classification;
}) {
  const styles: Record<Classification, string> = {
    inflow: "bg-emerald-100 text-emerald-700",
    outflow: "bg-red-100 text-red-700",
    unclassified: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded capitalize ${styles[classification]}`}
    >
      {classification}
    </span>
  );
}

function formatAmount(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

export default ForecastSummaryTable;
