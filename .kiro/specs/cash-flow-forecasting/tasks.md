# Implementation Plan: Cash Flow Forecasting

## Overview

Build a frontend-only React 18 + Vite 5 + TypeScript SPA with Tailwind CSS, Recharts, PapaParse, and date-fns. All data lives in browser `localStorage`. The implementation proceeds from project scaffolding through core logic modules, state management, UI pages, integration tests, and finally deployment configuration.

## Tasks

- [x] 1. Scaffold project structure and install dependencies
  - [x] 1.1 Initialize Vite project with React + TypeScript template, install all dependencies (tailwindcss, postcss, autoprefixer, react-router-dom, recharts, papaparse, date-fns, fast-check, vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, uuid, @types/uuid, @types/papaparse)
    - Run `npm create vite@latest . -- --template react-ts` and install all packages listed in the design's stack summary
    - _Requirements: none (scaffolding)_
  - [x] 1.2 Configure Tailwind CSS (tailwind.config.ts, postcss.config.js, update index.css with @tailwind directives)
    - Initialize Tailwind with `npx tailwindcss init -p`, set content paths to `./index.html` and `./src/**/*.{ts,tsx}`
    - _Requirements: none (scaffolding)_
  - [x] 1.3 Configure Vitest (vitest.config.ts with jsdom environment, setup file for jest-dom matchers, coverage provider v8)
    - Create `vitest.config.ts` importing `defineConfig` from vitest, set `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`
    - Create `src/test/setup.ts` importing `@testing-library/jest-dom`
    - Add `"test": "vitest"` and `"test:run": "vitest --run"` scripts to package.json
    - _Requirements: none (scaffolding)_
  - [x] 1.4 Set up React Router v6 with HashRouter in main.tsx and create page stub files
    - Wrap `<App />` in `<HashRouter>` in `main.tsx`
    - Create stub files: `src/pages/Dashboard.tsx`, `src/pages/ImportPage.tsx`, `src/pages/TransactionsPage.tsx`, `src/pages/ForecastPage.tsx`
    - Define routes in `App.tsx`: `/` → Dashboard, `/import` → ImportPage, `/transactions` → TransactionsPage, `/forecast` → ForecastPage
    - _Requirements: none (scaffolding)_

- [x] 2. Define core TypeScript data models and shared types
  - [x] 2.1 Create `src/types/index.ts` with all interfaces and type aliases from the design
    - Define `Classification`, `RecurrenceInterval`, `RecurrenceConfig`, `Transaction`, `RecurringGroup`, `ValidationSummary`, `SkippedRow`, `SkipReason`, `ParseResult`, `DayProjection`, `ProjectedTransaction`, `StoreState`, `StoreAction`
    - Export all types; no runtime logic in this file
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 3. Implement `storageService.ts` and its tests
  - [x] 3.1 Implement `src/lib/storageService.ts`
    - Export `STORAGE_KEY = "cashflow_transactions_v1"`
    - `save(transactions: Transaction[]): void` — JSON.stringify and write to localStorage synchronously
    - `load(): Transaction[] | null` — JSON.parse; return null if key absent; rethrow if JSON.parse throws
    - `clear(): void` — remove STORAGE_KEY from localStorage
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 3.2 Write unit tests for `storageService.ts` (`src/lib/storageService.test.ts`)
    - Save then load returns same data
    - Load returns null when key absent
    - Load with corrupted JSON throws
    - Clear removes key from localStorage
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 3.3 Write property test for storageService — Property 8: Transaction persistence round-trip
    - **Property 8: Transaction persistence round-trip**
    - Use `fc.array(transactionArb(), { minLength: 0, maxLength: 500 })` to generate random transaction arrays, save them, load them, and assert deep equality
    - **Validates: Requirements 7.1, 7.2**
    - _Requirements: 7.1, 7.2_

- [x] 4. Implement `classifier.ts` and its tests
  - [x] 4.1 Implement `src/lib/classifier.ts`
    - `classify(amount: number | null | undefined): Classification` — positive → "inflow", negative → "outflow", zero/null/NaN/undefined → "unclassified"
    - `validateClassificationConsistency(amount: number, classification: Classification): boolean` — returns false if positive+outflow or negative+inflow
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.8_
  - [ ]* 4.2 Write unit tests for `classifier.ts` (`src/lib/classifier.test.ts`)
    - classify(100) → "inflow", classify(-50) → "outflow", classify(0) → "unclassified"
    - classify(NaN) → "unclassified", classify(null) → "unclassified"
    - validateClassificationConsistency(100, "outflow") → false
    - validateClassificationConsistency(-50, "inflow") → false
    - validateClassificationConsistency(100, "inflow") → true
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.8_
  - [ ]* 4.3 Write property test for classifier — Property 3: Classification consistent with amount sign
    - **Property 3: Classification is consistent with amount sign**
    - Use `fc.oneof(fc.float({ min: 0.01 }), fc.float({ max: -0.01 }), fc.constant(0))` and assert classify returns "inflow"/"outflow"/"unclassified" per sign
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.8**
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.8_

- [x] 5. Implement `csvImporter.ts` and its tests
  - [x] 5.1 Implement `src/lib/csvImporter.ts`
    - `parseCSV(file: File): Promise<ParseResult>` using PapaParse with `header: false`
    - Guard: reject if `file.size > 10_485_760` or not `.csv` extension
    - Row 0 is header — skip it; validate all subsequent rows for date (ISO 8601), description (≤255 chars), amount (decimal)
    - Accumulate valid `Transaction[]` (with UUID, source: "csv", createdAt) and `SkippedRow[]`
    - Guard: reject if row count > 10,000
    - Assign classification via `classify()` for each parsed amount
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  - [ ]* 5.2 Write unit tests for `csvImporter.ts` (`src/lib/csvImporter.test.ts`)
    - Parses well-formed 3-row CSV; skips header row 0
    - Skips row missing description; records correct rowNumber and fieldName
    - Skips row with "abc" as amount; records "unparseable_amount"
    - Skips row with "2024-13-01" as date; records "unparseable_date"
    - Rejects file > 10 MB; rejects .txt file
    - Returns zero valid rows → ParseResult with empty transactions array
    - Handles negative amounts ("-1500.00") and unsigned positive amounts ("2000")
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  - [ ]* 5.3 Write property tests for csvImporter — Properties 1 and 2
    - **Property 1: CSV round-trip preserves transaction data**
    - Generate `fc.array(validTransactionArb())`, serialize to CSV string, parse back, assert (date, description, amount) tuples match
    - **Property 2: Invalid rows are always skipped and counted**
    - Generate mixed CSV with known valid/invalid row counts; assert `transactions.length + skippedRows.length === totalNonHeaderRows`
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.7, 1.8**
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7, 1.8_

- [x] 6. Implement `recurrenceDetector.ts` and its tests
  - [x] 6.1 Implement `src/lib/recurrenceDetector.ts`
    - `detectRecurring(transactions: Transaction[]): RecurringGroup[]`
    - Step 1: group by normalized description (lowercase, trimmed)
    - Step 2: filter candidates where all amounts are within 1% of group max
    - Step 3: sort dates ascending; compute consecutive day-gaps
    - Step 4: classify interval — 6–8 days → weekly, 13–15 days → biweekly, 28–31 days → monthly
    - Step 5: return groups with ≥ 2 qualifying occurrences and consistent interval; exclude dismissed groups
    - Assign UUID to each RecurringGroup; set status to "pending"
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 4.8_
  - [ ]* 6.2 Write unit tests for `recurrenceDetector.ts` (`src/lib/recurrenceDetector.test.ts`)
    - Detects weekly (7-day), biweekly (14-day), monthly (30-day) patterns from ≥ 2 transactions
    - Does NOT flag group with only 1 transaction
    - Treats "RENT" and "rent" as same description; treats " Rent " and "Rent" as same
    - Amounts within 1% are grouped; amounts >1% apart are not
    - Dismissed group (isRecurringDismissed: true) excluded from detection results
    - _Requirements: 4.1, 4.2, 4.5, 4.7, 4.8_
  - [ ]* 6.3 Write property test for recurrenceDetector — Property 5: Case-insensitive and whitespace-agnostic
    - **Property 5: Recurring detection is case-insensitive and whitespace-agnostic**
    - Generate description + amount + dates; compare detectRecurring on uppercase vs lowercase+trimmed variants — group counts must match
    - **Validates: Requirements 4.1, 4.7**
    - _Requirements: 4.1, 4.7_

- [x] 7. Implement `forecastEngine.ts` and its tests
  - [x] 7.1 Implement `src/lib/forecastEngine.ts`
    - `generateForecast(transactions: Transaction[], projectionDays: 30 | 60 | 90): DayProjection[]`
    - Establish startDate = today, endDate = today + projectionDays
    - Compute initialBalance = sum of all historical (past) transactions; 0 if none
    - Build date → ProjectedTransaction[] map: insert confirmed recurring future occurrences (extrapolated from last known date by interval) and one-time future manual transactions where date ≤ endDate
    - Walk day by day startDate → endDate accumulating runningBalance; set `isNegative` when runningBalance < 0
    - Return DayProjection[] sorted ascending by date
    - Use date-fns for all date arithmetic (addDays, addWeeks, addMonths, parseISO, format)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.9, 5.10_
  - [ ]* 7.2 Write unit tests for `forecastEngine.ts` (`src/lib/forecastEngine.test.ts`)
    - 30-day forecast starts today, ends today+30 (inclusive, 31 entries)
    - Running balance starts at 0 when no history
    - Confirmed weekly recurring transaction appears 4 times in 30-day window
    - One-time future transaction on day 15 appears exactly once
    - Negative balance correctly flagged on DayProjection.isNegative
    - Changing window from 30 to 60 doubles confirmed weekly recurring occurrences
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 7.3 Write property tests for forecastEngine — Properties 6 and 7
    - **Property 6: Running balance is the cumulative sum of projections**
    - For each day D, assert runningBalance[D] equals initialBalance + sum of all projected amounts through day D (tolerance 0.001)
    - **Property 7: Forecast includes all confirmed recurring future occurrences**
    - For a confirmed recurring transaction and projection window in {30, 60, 90}, assert occurrence count equals expected count per interval within window
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 8. Checkpoint — core logic complete
  - Ensure all tests pass with `npm run test:run`. Resolve any failures before proceeding.

- [x] 9. Implement `TransactionStoreContext`
  - [x] 9.1 Implement `src/context/TransactionStore.tsx`
    - Define `StoreState`, `StoreAction` types (re-export from `src/types/index.ts`)
    - Implement `storeReducer` handling all action types: ADD_TRANSACTIONS, UPDATE_TRANSACTION, DELETE_TRANSACTION, CONFIRM_RECURRING, DISMISS_RECURRING, OVERRIDE_CLASSIFICATION, CLEAR_ALL, LOAD_FROM_STORAGE, STORAGE_LOAD_ERROR
    - After every mutating action (all except LOAD_FROM_STORAGE and STORAGE_LOAD_ERROR), call `storageService.save()`
    - In the reducer, recompute `recurringGroups` via `detectRecurring()` after mutations that change transactions
    - `TransactionStoreProvider` component: use `useReducer(storeReducer, initialState)`; on mount `useEffect` calls `storageService.load()`, dispatches LOAD_FROM_STORAGE or STORAGE_LOAD_ERROR
    - Export `useTransactionStore()` custom hook that throws if used outside provider
    - _Requirements: 2.1, 3.4, 4.4, 4.5, 7.1, 7.2, 7.3_
  - [ ]* 9.2 Write unit tests for TransactionStoreContext (`src/context/TransactionStore.test.tsx`)
    - ADD_TRANSACTIONS dispatches and renders updated list
    - STORAGE_LOAD_ERROR sets loadError in state
    - OVERRIDE_CLASSIFICATION persists override and is not reverted on re-render
    - CONFIRM_RECURRING / DISMISS_RECURRING update group status
    - localStorage is written after ADD_TRANSACTIONS (spy on storageService.save)
    - _Requirements: 2.1, 3.4, 4.4, 4.5, 7.1_
  - [ ]* 9.3 Write property test for classification override persistence — Property 4
    - **Property 4: User classification override persists and is not reverted**
    - Generate random transaction + override classification; apply override via OVERRIDE_CLASSIFICATION action; dispatch any subsequent mutation; assert classification remains the override value
    - **Validates: Requirements 3.4**
    - _Requirements: 3.4_
  - [ ]* 9.4 Write property test for whitespace description rejection — Property 9
    - **Property 9: Whitespace-only descriptions are rejected as invalid**
    - Generate `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))`; pass to manual entry validator; assert `result.valid === false` and `result.fieldErrors.description` is defined
    - **Validates: Requirements 2.2**
    - _Requirements: 2.2_

- [x] 10. Build Layout/navigation shell
  - [x] 10.1 Implement `src/components/Layout.tsx` — persistent nav sidebar/top-bar with links to all four routes
    - Use Tailwind for a clean fintech aesthetic: neutral slate/gray palette, clear typographic hierarchy
    - Active route highlighted; nav items: Dashboard, Import, Transactions, Forecast
    - Wrap layout with `<Outlet />` for nested routes
    - _Requirements: none (shell UI)_
  - [x] 10.2 Wire Layout into App.tsx as the root layout route; update all page stubs to render meaningful headings
    - _Requirements: none (shell UI)_

- [x] 11. Implement `ImportPage`
  - [x] 11.1 Implement `src/pages/ImportPage.tsx` with drag-and-drop CSV upload zone
    - File input with `accept=".csv"`, drag-and-drop via `onDragOver`/`onDrop` handlers
    - On file selection delegate to `csvImporter.parseCSV()`; on success dispatch ADD_TRANSACTIONS
    - Show file size / type error banners for rejected files (> 10 MB, non-.csv)
    - _Requirements: 1.1, 1.2, 1.8, 1.9, 1.10_
  - [x] 11.2 Implement `<ImportSummary>` sub-component
    - Show imported count (green), skipped count (amber), error list with row number + reason
    - Display "no valid transactions found" error when importedCount === 0
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 12. Implement `TransactionsPage`
  - [x] 12.1 Implement `<TransactionTable>` component (`src/components/TransactionTable.tsx`)
    - Sortable columns: date, description, amount, classification — default sort date descending
    - Show classification badge (inflow=green, outflow=red, unclassified=gray)
    - Recurring badge on transactions with confirmed recurrence
    - Edit and delete action buttons per row; up to 500 rows per page
    - _Requirements: 3.5, 4.3, 6.1, 6.5, 6.7_
  - [x] 12.2 Implement `<TransactionForm>` component (`src/components/TransactionForm.tsx`) for manual entry and editing
    - Fields: date (date picker), description (text input with 255-char counter), amount (number input with sign toggle for inflow/outflow), recurrence (select: one-time | weekly | biweekly | monthly)
    - Field-level validation errors displayed below inputs in red
    - On submit: validate all fields, assign UUID + source: "manual" + createdAt, dispatch ADD_TRANSACTIONS or UPDATE_TRANSACTION
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 6.2, 6.3, 6.4, 6.8_
  - [x] 12.3 Implement `<ConfirmDialog>` component (`src/components/ConfirmDialog.tsx`) for delete confirmation
    - Modal overlay identifying transaction by date + description
    - Confirm button dispatches DELETE_TRANSACTION; cancel closes without action
    - _Requirements: 6.5, 6.6, 6.9_
  - [x] 12.4 Implement `<RecurringBanner>` component (`src/components/RecurringBanner.tsx`) for pending recurring groups
    - Shows each pending RecurringGroup with description, interval, occurrence count
    - Confirm button dispatches CONFIRM_RECURRING; dismiss button dispatches DISMISS_RECURRING
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 12.5 Implement `src/pages/TransactionsPage.tsx` wiring together TransactionTable, TransactionForm (collapsible), RecurringBanner, ConfirmDialog
    - _Requirements: 3.5, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1–6.9_

- [x] 13. Implement `ForecastPage`
  - [x] 13.1 Implement `<ProjectionWindowSelector>` component (`src/components/ProjectionWindowSelector.tsx`)
    - Tab group for 30 / 60 / 90 day windows; selection stored in local component state
    - _Requirements: 5.1, 5.9_
  - [x] 13.2 Implement `<ForecastChart>` component (`src/components/ForecastChart.tsx`)
    - Recharts `<LineChart>` with `<XAxis dataKey="date">`, `<YAxis>`, `<Tooltip>`, `<ReferenceLine y={0}>`
    - Negative balance range highlighted with a `<ReferenceArea>` or red stroke segment
    - Responsive container wrapping
    - _Requirements: 5.6, 5.8_
  - [x] 13.3 Implement `<ForecastSummaryTable>` component (`src/components/ForecastSummaryTable.tsx`)
    - Columns: date, description, amount, classification, running balance
    - Rows with negative running balance highlighted (red/pink row background)
    - Sorted ascending by date
    - _Requirements: 5.7, 5.8_
  - [x] 13.4 Implement `src/pages/ForecastPage.tsx` wiring together ProjectionWindowSelector, ForecastChart, ForecastSummaryTable
    - On window change, call `generateForecast()` and update chart + table; wrap in try/catch — on error preserve prior projection and show error toast
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [x] 14. Implement `Dashboard`
  - [x] 14.1 Implement `src/pages/Dashboard.tsx`
    - Summary cards: total inflows (green), total outflows (red), current balance (neutral)
    - Mini 30-day ForecastChart (read-only, no window selector)
    - Use `useTransactionStore()` to derive totals from transactions
    - _Requirements: 5.1, 5.6_

- [x] 15. Checkpoint — UI complete
  - Ensure `npm run test:run` passes. Verify app renders in browser with `npm run dev` (run manually). Fix any TypeScript errors (`npm run build` must succeed without errors).

- [x] 16. Write integration tests
  - [x] 16.1 Full import flow integration test (`src/lib/integration/import.test.tsx`)
    - Render app with MemoryRouter at `/import`; simulate CSV file upload; assert transactions appear in store and in TransactionsPage table
    - _Requirements: 1.1, 1.7, 7.1_
  - [x] 16.2 Forecast update integration test (`src/lib/integration/forecast.test.tsx`)
    - Render ForecastPage; dispatch ADD_TRANSACTIONS with a confirmed recurring transaction; assert DayProjection[] contains expected future occurrences
    - _Requirements: 5.2, 5.9_
  - [x] 16.3 localStorage corruption integration test (`src/lib/integration/storage.test.tsx`)
    - Seed localStorage with invalid JSON; render app; assert state initializes empty and error banner is visible
    - _Requirements: 7.3_
  - [x] 16.4 "Clear All Data" flow integration test (`src/lib/integration/clearData.test.tsx`)
    - Render app with stored transactions; trigger "Clear All Data"; interact with confirmation dialog; assert localStorage is empty and transaction list is empty
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 17. Add README and deployment configuration
  - [x] 17.1 Create `vercel.json` deployment configuration
    - Add `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` for SPA routing on Vercel
    - _Requirements: none (deployment)_
  - [x] 17.2 Create `netlify.toml` as an alternative deployment configuration
    - Add `[[redirects]]` rule routing `/*` to `/index.html` with status 200
    - _Requirements: none (deployment)_
  - [x] 17.3 Update `README.md` with local setup and deployment instructions
    - Local setup: prerequisites (Node 18+), `npm install`, `npm run dev`, `npm run test:run`, `npm run build`
    - Vercel deployment: push repo, import in Vercel dashboard, build command `npm run build`, output dir `dist`
    - Netlify deployment: push repo, import in Netlify, build command `npm run build`, publish dir `dist`
    - _Requirements: none (documentation)_

- [x] 18. Final checkpoint — full test suite
  - Run `npm run test:run` — all tests must pass. Run `npm run build` — build must succeed with zero TypeScript errors. Fix any remaining issues.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` (500 for Property 3) as specified in the design
- All date arithmetic uses `date-fns`; no Moment.js or raw Date arithmetic
- HashRouter is required for Vercel/Netlify static hosting without server configuration
- `storageService.load()` returning `null` means no data; throwing means corruption — the context handles both cases
- The `vercel.json` rewrite is only needed for direct-URL navigation; hash-based routing works without it, but it is good practice

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "10.1"] },
    { "id": 9, "tasks": ["10.2"] },
    { "id": 10, "tasks": ["11.1", "12.1", "13.1"] },
    { "id": 11, "tasks": ["11.2", "12.2", "12.3", "12.4", "13.2", "13.3"] },
    { "id": 12, "tasks": ["12.5", "13.4", "14.1"] },
    { "id": 13, "tasks": ["16.1", "16.2", "16.3", "16.4"] },
    { "id": 14, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
