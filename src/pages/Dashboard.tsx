import { useMemo } from "react";
import { useTransactionStore } from "../context/TransactionStore";
import { generateForecast } from "../lib/forecastEngine";
import ForecastChart from "../components/ForecastChart";
import type { DayProjection } from "../types";

/**
 * Formats a number as USD currency.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Dashboard() {
  const { state } = useTransactionStore();
  const { transactions } = state;

  const totalInflows = useMemo(
    () =>
      transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const totalOutflows = useMemo(
    () =>
      transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const currentBalance = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const forecastData: DayProjection[] = useMemo(() => {
    try {
      return generateForecast(transactions, 30);
    } catch {
      return [];
    }
  }, [transactions]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Inflows */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Inflows</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">
            {formatCurrency(totalInflows)}
          </p>
        </div>

        {/* Total Outflows */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Outflows</p>
          <p className="mt-1 text-2xl font-semibold text-red-500">
            {formatCurrency(totalOutflows)}
          </p>
        </div>

        {/* Current Balance */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Current Balance</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      {/* 30-Day Forecast */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">30-Day Forecast</h2>
        <ForecastChart data={forecastData} />
      </div>
    </div>
  );
}
