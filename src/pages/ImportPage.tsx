import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { parseCSV } from "../lib/csvImporter";
import { useTransactionStore } from "../context/TransactionStore";
import ImportSummary from "../components/ImportSummary";
import type { ParseResult } from "../types/index";

const MAX_FILE_SIZE = 10_485_760; // 10 MB

export default function ImportPage() {
  const { dispatch } = useTransactionStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setError(null);
    setParseResult(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      resetState();

      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Invalid file type. Only .csv files are accepted.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File exceeds the 10 MB size limit. Please upload a smaller file.");
        return;
      }

      setIsLoading(true);

      try {
        const result = await parseCSV(file);
        setParseResult(result);

        if (result.transactions.length > 0) {
          dispatch({ type: "ADD_TRANSACTIONS", payload: result.transactions });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred while parsing the file.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, resetState]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Import Transactions</h1>

      {/* Error Banner */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`
          relative flex flex-col items-center justify-center
          rounded-lg border-2 border-dashed p-12 text-center
          cursor-pointer transition-colors duration-200
          ${
            isDragOver
              ? "border-primary bg-blue-50"
              : "border-slate-300 bg-white hover:border-slate-400"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-primary"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-slate-600">Parsing your CSV file...</p>
          </div>
        ) : (
          <>
            <svg
              className="mb-3 h-10 w-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-slate-700">
              Drag and drop your CSV file here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              or click to browse &middot; .csv files only &middot; max 10 MB
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Collapsible CSV Format Help */}
      <details className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <span className="ml-1">CSV Format Help</span>
        </summary>
        <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600 space-y-3">
          <p>
            Your CSV file should have <strong>3 columns</strong> in this order:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Required</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Format</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 font-mono">date</td>
                  <td className="px-3 py-2">Yes</td>
                  <td className="px-3 py-2">Most common formats accepted (see below)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">description</td>
                  <td className="px-3 py-2">Yes</td>
                  <td className="px-3 py-2">Text, max 255 characters</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">amount</td>
                  <td className="px-3 py-2">Yes</td>
                  <td className="px-3 py-2">Number (negative for outflows, commas OK)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-medium text-slate-700 mb-1">Accepted date formats:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono bg-slate-50 rounded border border-slate-200 px-3 py-2">
              <span>2024-03-15</span>
              <span>03/15/2024</span>
              <span>3/15/2024</span>
              <span>15/03/2024</span>
              <span>Mar 15, 2024</span>
              <span>March 15, 2024</span>
              <span>15 Mar 2024</span>
              <span>2024/03/15</span>
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-700 mb-1">Example:</p>
            <pre className="rounded bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono overflow-x-auto">
{`date,description,amount
03/15/2024,Client Invoice,5000.00
03/18/2024,Office Rent,-1500.00
Mar 20 2024,Software Subscription,-49.99`}
            </pre>
          </div>

          <div className="space-y-1 text-xs text-slate-500">
            <p>• The first row is treated as a header and skipped automatically.</p>
            <p>• Dates are automatically normalized — use whatever format your bank exports.</p>
            <p>• Amounts can include commas (1,500.00), currency symbols ($, £, €), or parentheses for negatives (1500.00).</p>
            <p>• Use positive numbers for income and negative for expenses.</p>
            <p>• Whitespace around values is trimmed automatically.</p>
            <p>• File limits: .csv extension, max 10 MB, max 10,000 data rows.</p>
          </div>
        </div>
      </details>

      {/* Parse Result Summary */}
      {parseResult && <ImportSummary result={parseResult} />}
    </div>
  );
}
