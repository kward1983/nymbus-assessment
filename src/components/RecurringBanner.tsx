import type { RecurringGroup } from "../types";

interface RecurringBannerProps {
  groups: RecurringGroup[];
  onConfirm: (groupId: string) => void;
  onDismiss: (groupId: string) => void;
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatInterval(interval: string): string {
  switch (interval) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Biweekly";
    case "monthly":
      return "Monthly";
    default:
      return interval;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
}

export default function RecurringBanner({
  groups,
  onConfirm,
  onDismiss,
}: RecurringBannerProps) {
  const pendingGroups = groups.filter((g) => g.status === "pending");

  if (pendingGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingGroups.map((group) => (
        <div
          key={group.id}
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-900">
                {capitalize(group.normalizedDescription)}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {formatInterval(group.interval)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {group.transactionIds.length} occurrence
              {group.transactionIds.length !== 1 ? "s" : ""} &middot; avg{" "}
              {formatCurrency(group.averageAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onConfirm(group.id)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => onDismiss(group.id)}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
