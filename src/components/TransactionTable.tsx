import { useState, useMemo } from "react";
import type { Transaction } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

// ─── Sort state ───────────────────────────────────────────────────────────────

type SortColumn = "date" | "description" | "amount" | "classification";
type SortDirection = "asc" | "desc";

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ROWS = 500;

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const [sort, setSort] = useState<SortState>({
    column: "date",
    direction: "desc",
  });

  // Handle column header click
  const handleSort = (column: SortColumn) => {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  // Sort and slice transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      let comparison = 0;

      switch (sort.column) {
        case "date":
          comparison = a.date.localeCompare(b.date);
          break;
        case "description":
          comparison = a.description
            .toLowerCase()
            .localeCompare(b.description.toLowerCase());
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "classification":
          comparison = a.classification.localeCompare(b.classification);
          break;
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });

    return sorted.slice(0, MAX_ROWS);
  }, [transactions, sort]);

  // Sort indicator arrow
  const sortIndicator = (column: SortColumn) => {
    if (sort.column !== column) return null;
    return (
      <span className="ml-1 inline-block" aria-label={`sorted ${sort.direction}ending`}>
        {sort.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No transactions to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th
              className="px-4 py-3 font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort("date")}
            >
              Date{sortIndicator("date")}
            </th>
            <th
              className="px-4 py-3 font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort("description")}
            >
              Description{sortIndicator("description")}
            </th>
            <th
              className="px-4 py-3 font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort("amount")}
            >
              Amount{sortIndicator("amount")}
            </th>
            <th
              className="px-4 py-3 font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              onClick={() => handleSort("classification")}
            >
              Classification{sortIndicator("classification")}
            </th>
            <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.map((txn) => (
            <tr
              key={txn.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap">{txn.date}</td>
              <td className="px-4 py-3">
                <span className="block truncate max-w-xs">{txn.description}</span>
                {txn.isRecurringConfirmed && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                    Recurring
                  </span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums">
                {formatAmount(txn.amount)}
              </td>
              <td className="px-4 py-3">
                <ClassificationBadge classification={txn.classification} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(txn)}
                    className="px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded transition-colors"
                    aria-label={`Edit transaction: ${txn.description}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(txn.id)}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Delete transaction: ${txn.description}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ClassificationBadge({
  classification,
}: {
  classification: Transaction["classification"];
}) {
  const styles: Record<typeof classification, string> = {
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

export default TransactionTable;
