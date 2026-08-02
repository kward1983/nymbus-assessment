import { useState, useEffect, useRef } from "react";
import { useTransactionStore } from "../context/TransactionStore";
import { generateForecast } from "../lib/forecastEngine";
import { ProjectionWindowSelector } from "../components/ProjectionWindowSelector";
import ForecastChart from "../components/ForecastChart";
import ForecastSummaryTable from "../components/ForecastSummaryTable";
import type { DayProjection } from "../types";

/**
 * ForecastPage — wires together ProjectionWindowSelector, ForecastChart,
 * and ForecastSummaryTable. On window change, regenerates the forecast;
 * on error, preserves the prior projection and shows an error toast.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */
export default function ForecastPage() {
  const { state } = useTransactionStore();
  const [projectionDays, setProjectionDays] = useState<30 | 60 | 90>(30);
  const [forecastData, setForecastData] = useState<DayProjection[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the last valid forecast so we can preserve it on error
  const lastValidForecast = useRef<DayProjection[]>([]);

  useEffect(() => {
    try {
      const result = generateForecast(state.transactions, projectionDays);
      lastValidForecast.current = result;
      setForecastData(result);
      setError(null);
    } catch (err) {
      // Preserve prior projection on error (Requirement 5.10)
      setForecastData(lastValidForecast.current);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while generating the forecast."
      );
    }
  }, [state.transactions, projectionDays]);

  return (
    <div className="space-y-6">
      {/* Error toast banner */}
      {error && (
        <div
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
        >
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            className="ml-4 text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--ui-black)]">
          Cash Flow Forecast
        </h1>
      </div>

      {/* Projection window selector */}
      <ProjectionWindowSelector
        value={projectionDays}
        onChange={setProjectionDays}
      />

      {/* Forecast chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ForecastChart data={forecastData} />
      </div>

      {/* Forecast summary table */}
      <ForecastSummaryTable data={forecastData} />
    </div>
  );
}
