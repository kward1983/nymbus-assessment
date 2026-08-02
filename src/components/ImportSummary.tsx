import type { ParseResult } from "../types/index";

interface ImportSummaryProps {
  result: ParseResult;
}

/**
 * Displays a summary of CSV import results: total rows, imported count (green),
 * skipped count (amber), error details, and success/failure messaging.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7
 */
export default function ImportSummary({ result }: ImportSummaryProps) {
  const importedCount = result.transactions.length;
  const skippedCount = result.skippedRows.length;

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-medium mb-3">Import Summary</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-2xl font-semibold text-slate-800">
            {result.totalRows}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total rows</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <p className="text-2xl font-semibold text-emerald-700">
            {importedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Imported</p>
        </div>
        <div className="rounded-md bg-amber-50 p-3">
          <p className="text-2xl font-semibold text-amber-700">
            {skippedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Skipped</p>
        </div>
      </div>

      {/* No valid transactions error */}
      {importedCount === 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No valid transactions were found in the file.
        </div>
      )}

      {/* Skipped rows table */}
      {skippedCount > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            Skipped Rows
          </h3>
          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Row
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Reason
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Field
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.skippedRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-slate-700">
                      {row.rowNumber}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.reason.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.fieldName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success message */}
      {importedCount > 0 && (
        <p className="mt-3 text-sm text-emerald-700">
          Successfully imported {importedCount} transaction
          {importedCount !== 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}
