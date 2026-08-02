import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { parse as dateParse, isValid, format } from "date-fns";
import type { ParseResult, SkippedRow, Transaction } from "../types/index";
import { classify } from "./classifier";

const MAX_FILE_SIZE = 10_485_760; // 10 MB
const MAX_ROW_COUNT = 10_000;
const MAX_DESCRIPTION_LENGTH = 255;

/**
 * Common date formats found in bank/accounting CSV exports.
 * Ordered from most specific to least specific to avoid ambiguity.
 */
const DATE_FORMATS = [
  "yyyy-MM-dd",      // 2024-03-15 (ISO 8601)
  "MM/dd/yyyy",      // 03/15/2024 (US standard)
  "M/d/yyyy",        // 3/15/2024 (US short)
  "MM-dd-yyyy",      // 03-15-2024
  "M-d-yyyy",        // 3-15-2024
  "dd/MM/yyyy",      // 15/03/2024 (EU standard)
  "d/M/yyyy",        // 15/3/2024 (EU short)
  "dd-MM-yyyy",      // 15-03-2024
  "yyyy/MM/dd",      // 2024/03/15
  "MMM d, yyyy",     // Mar 15, 2024
  "MMMM d, yyyy",    // March 15, 2024
  "MMM dd, yyyy",    // Mar 15, 2024
  "d MMM yyyy",      // 15 Mar 2024
  "dd MMM yyyy",     // 15 Mar 2024
  "MM.dd.yyyy",      // 03.15.2024
  "dd.MM.yyyy",      // 15.03.2024
];

/**
 * Attempts to parse a date string using multiple common formats.
 * Returns a normalized YYYY-MM-DD string if successful, or null if
 * no format matches or the date is invalid.
 */
function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const referenceDate = new Date(2000, 0, 1);

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = dateParse(trimmed, fmt, referenceDate);
      if (isValid(parsed)) {
        // Sanity check: year should be reasonable (1900-2100)
        const year = parsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          return format(parsed, "yyyy-MM-dd");
        }
      }
    } catch {
      // Format didn't match, try next
    }
  }

  return null;
}

/**
 * Parses a CSV File and returns a ParseResult with validated Transaction[]
 * and SkippedRow[] for rows that failed validation.
 *
 * Rejects (throws) when:
 *  - file is not a .csv extension  (Req 1.2)
 *  - file.size > 10 MB             (Req 1.2)
 *  - data rows (excluding header) > 10,000  (Req 1.9)
 */
export function parseCSV(file: File): Promise<ParseResult> {
  // Guard: file type (Req 1.2)
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return Promise.reject(
      new Error("Invalid file type. Only .csv files are accepted.")
    );
  }

  // Guard: file size (Req 1.2)
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(
      new Error("File exceeds the 10 MB size limit.")
    );
  }

  return new Promise<ParseResult>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as string[][];

        // Row 0 is the header; data rows start at index 1
        const dataRows = rows.slice(1);

        // Guard: row count (Req 1.9)
        if (dataRows.length > MAX_ROW_COUNT) {
          reject(
            new Error(
              `File contains more than ${MAX_ROW_COUNT} data rows.`
            )
          );
          return;
        }

        const transactions: Transaction[] = [];
        const skippedRows: SkippedRow[] = [];
        const createdAt = new Date().toISOString();

        dataRows.forEach((row, index) => {
          // 1-based row number in the original file (row 0 was header, so +2)
          const rowNumber = index + 2;

          const rawDate = row[0] ?? "";
          const rawDescription = row[1] ?? "";
          const rawAmount = row[2] ?? "";

          // Validate date (Req 1.4)
          const dateValue = rawDate.trim();
          if (!dateValue) {
            skippedRows.push({
              rowNumber,
              reason: "missing_field",
              fieldName: "date",
            });
            return;
          }

          const normalizedDate = parseDate(dateValue);
          if (!normalizedDate) {
            skippedRows.push({
              rowNumber,
              reason: "unparseable_date",
              fieldName: "date",
            });
            return;
          }

          // Validate description (Req 1.3, 1.5)
          const descriptionValue = rawDescription.trim();
          if (!descriptionValue) {
            skippedRows.push({
              rowNumber,
              reason: "missing_field",
              fieldName: "description",
            });
            return;
          }
          if (descriptionValue.length > MAX_DESCRIPTION_LENGTH) {
            skippedRows.push({
              rowNumber,
              reason: "missing_field",
              fieldName: "description",
            });
            return;
          }

          // Validate amount (Req 1.6)
          const amountRaw = rawAmount.trim();
          if (!amountRaw) {
            skippedRows.push({
              rowNumber,
              reason: "missing_field",
              fieldName: "amount",
            });
            return;
          }
          // Strip commas from amounts like "1,500.00" or "(1500.00)" for negatives
          let cleanedAmount = amountRaw.replace(/,/g, "");
          // Handle parentheses notation for negatives: (1500.00) → -1500.00
          if (/^\([\d.]+\)$/.test(cleanedAmount)) {
            cleanedAmount = "-" + cleanedAmount.slice(1, -1);
          }
          // Strip leading currency symbols ($, £, €)
          cleanedAmount = cleanedAmount.replace(/^[£$€]/, "");

          const amountValue = parseFloat(cleanedAmount);
          if (isNaN(amountValue)) {
            skippedRows.push({
              rowNumber,
              reason: "unparseable_amount",
              fieldName: "amount",
            });
            return;
          }

          // Build valid Transaction (Req 1.1, 1.7, 1.8, 1.10)
          transactions.push({
            id: uuidv4(),
            date: normalizedDate,
            description: descriptionValue,
            amount: amountValue,
            classification: classify(amountValue),
            source: "csv",
            createdAt,
          });
        });

        resolve({
          transactions,
          skippedRows,
          totalRows: dataRows.length,
        });
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`));
      },
    });
  });
}
