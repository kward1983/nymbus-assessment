# Design Document: Cash Flow Forecasting

## Overview

A frontend-only single-page application (SPA) that lets small business owners import CSV transactions, manually enter transactions, view automatic inflow/outflow classification, detect recurring patterns, and visualize a 30/60/90-day cash flow forecast — all persisted in browser `localStorage`.

The application is built with **React + Vite + TypeScript**, styled with **Tailwind CSS**, charted with **Recharts**, and deployable to Vercel or Netlify by pushing a single repository. There is no backend server, no database, and no authentication — consistent with the constraint of a single operating account and localStorage-based persistence.

### Goals

- Deployable to Vercel/Netlify with a live demo link in under 30 minutes
- Runnable locally with `npm install && npm run dev`
- Clean, professional fintech aesthetic (neutral palette, clear data tables, minimal chrome)
- All data processing happens in the browser; zero server round-trips

### Stack Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 + Vite 5 | Fast HMR, zero-config builds, first-class Vercel support |
| Language | TypeScript | Type-safety for financial data models |
| Styling | Tailwind CSS 3 | Utility-first, consistent spacing/color tokens |
| Charts | Recharts 2 | Composable React chart primitives, responsive out of the box |
| CSV Parsing | PapaParse 5 | Battle-tested, streaming-capable, handles edge cases |
| State | React Context + `useReducer` | Sufficient for single-user SPA; avoids Redux overhead |
| Persistence | Browser `localStorage` | No backend required; survives page reloads |
| Date handling | `date-fns` | Lightweight, tree-shakeable, no Moment.js bloat |
| Testing | Vitest + React Testing Library | Vite-native test runner; fast unit + property tests |
| PBT | `fast-check` | Property-based testing for TypeScript |

---

## Design System

### Typography

| Property | Value |
|----------|-------|
| Font Family | DM Sans |
| Type Scale | `text-base` (16px) |
| Font Weight | Regular (400) |

Import DM Sans via Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
```

Set as the default font in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    fontFamily: {
      sans: ['DM Sans', 'sans-serif'],
    },
  },
}
```

And in `index.css`, set the base body style:

```css
body {
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;      /* text-base = 16px */
  font-weight: 400;     /* Regular */
}
```

### Color Palette

UI Core colors used throughout the application:

| Token | Hex | Usage |
|-------|-----|-------|
| `--ui-primary` | `#2569EC` | Primary actions, active nav, links, CTA buttons |
| `--ui-black` | `#000714` | Body text, headings, high-contrast elements |
| `--ui-white` | `#FFFFFF` | Backgrounds, card surfaces, input backgrounds |
| `--ui-trans` | `#FFFFFF00` | Transparent overlays, ghost elements |

Define these as CSS custom properties in `index.css` and extend Tailwind's color config to reference them:

```css
:root {
  --ui-primary: #2569EC;
  --ui-black: #000714;
  --ui-white: #FFFFFF;
  --ui-trans: #FFFFFF00;
}
```

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: 'var(--ui-primary)',
      black: 'var(--ui-black)',
      white: 'var(--ui-white)',
      trans: 'var(--ui-trans)',
    },
  },
}
```

### Fintech Aesthetic Guidelines

- Use `--ui-black` (`#000714`) for all body text and headings — richer than pure black
- Use `--ui-primary` (`#2569EC`) for interactive elements: buttons, active states, hyperlinks
- Backgrounds default to `--ui-white`; use Tailwind's `slate-50` or `slate-100` for subtle page backgrounds
- Inflow values display in green (`text-emerald-600`); outflow values in red (`text-red-500`)
- Negative balance indicators use red backgrounds (`bg-red-50`, `border-red-200`)
- Card/panel borders use `border-slate-200`; shadows use `shadow-sm`

---

## Architecture

The application is a single Vite SPA with no server-side rendering. All state lives in a React Context tree backed by `localStorage`. Components read from and dispatch into this shared store.

```
┌─────────────────────────────────────────────────────┐
│                  Browser (SPA)                       │
│                                                      │
│  ┌────────────┐   ┌──────────────────────────────┐  │
│  │  Router    │   │   TransactionStoreContext     │  │
│  │  (pages)   │──▶│   (useReducer + localStorage) │  │
│  └────────────┘   └──────────────────────────────┘  │
│        │                       │                     │
│   ┌────▼──────────────────┐    │                     │
│   │  Pages                │◀───┘                     │
│   │  ├─ Dashboard         │                          │
│   │  ├─ Import (CSV)      │                          │
│   │  ├─ Transactions      │                          │
│   │  └─ Forecast          │                          │
│   └───────────────────────┘                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Core Logic (pure functions, no React deps)  │   │
│  │  ├─ csvImporter.ts                           │   │
│  │  ├─ classifier.ts                            │   │
│  │  ├─ recurrenceDetector.ts                    │   │
│  │  └─ forecastEngine.ts                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────┐                             │
│  │  localStorage layer │                             │
│  │  storageService.ts  │                             │
│  └─────────────────────┘                             │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
CSV upload / Manual form
        │
        ▼
  CSV_Importer / Validator
        │  valid Transaction[]
        ▼
  Classifier (amount sign → classification)
        │
        ▼
  Transaction_Store (useReducer dispatch)
        │            │
        │            └─▶ storageService.save() → localStorage
        ▼
  Recurrence_Detector (runs on store update)
        │  marks recurring groups
        ▼
  Forecast_Engine (reads confirmed recurring + one-time future)
        │  DayProjection[]
        ▼
  ForecastChart + SummaryTable (Recharts)
```

### Routing

Uses React Router v6 with hash-based routing (`HashRouter`) for static hosting compatibility on Vercel/Netlify without server configuration.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Overview: balance summary, upcoming forecast mini-chart |
| `/import` | Import | CSV upload + drag-and-drop with validation summary |
| `/transactions` | Transactions | Sortable/paginated list, edit/delete, recurring badges |
| `/forecast` | Forecast | Projection window selector, line chart, summary table |

---

## Components and Interfaces

### Page Components

**`<ImportPage>`**
- Drag-and-drop file zone + file picker (`<input type="file" accept=".csv">`)
- Delegates to `csvImporter.ts` for parsing
- Renders `<ImportSummary>` (success count, skip count, error list)
- Dispatches `ADD_TRANSACTIONS` to store on success

**`<TransactionsPage>`**
- Renders `<TransactionTable>` with sort controls
- Renders `<TransactionForm>` for manual entry (collapsible panel)
- Renders `<RecurringBanner>` for unconfirmed recurring detections
- Handles edit/delete with `<ConfirmDialog>`

**`<ForecastPage>`**
- `<ProjectionWindowSelector>` (30 / 60 / 90 day tabs)
- `<ForecastChart>` (Recharts `<LineChart>`)
- `<ForecastSummaryTable>` (daily rows with negative-balance highlighting)

**`<Dashboard>`**
- Summary cards: total inflows, total outflows, current balance
- Mini forecast line chart (read-only, 30-day default)

### Core Logic Modules

#### `csvImporter.ts`

```typescript
interface ParseResult {
  transactions: Transaction[];
  skippedRows: SkippedRow[];
  totalRows: number;
}

interface SkippedRow {
  rowNumber: number;
  reason: SkipReason;
  fieldName?: string;
}

type SkipReason =
  | "missing_field"
  | "unparseable_amount"
  | "unparseable_date";

function parseCSV(file: File): Promise<ParseResult>
```

- Uses PapaParse with `header: false` so row index is always available
- Row 0 treated as header and skipped
- Each subsequent row validated: date (ISO 8601), description (≤255 chars), amount (decimal)
- File size guard: rejects if `file.size > 10_485_760` (10 MB) or row count > 10,000
- File type guard: rejects if `!file.name.endsWith('.csv')`

#### `classifier.ts`

```typescript
type Classification = "inflow" | "outflow" | "unclassified";

function classify(amount: number | null | undefined): Classification
// positive → "inflow", negative → "outflow", zero/null/NaN → "unclassified"

function validateClassificationConsistency(
  amount: number,
  classification: Classification
): boolean
// Returns false if positive amount paired with "outflow" or negative with "inflow"
```

#### `recurrenceDetector.ts`

```typescript
type RecurrenceInterval = "weekly" | "biweekly" | "monthly";

interface RecurringGroup {
  normalizedDescription: string;
  interval: RecurrenceInterval;
  transactionIds: string[];
  averageAmount: number;
}

function detectRecurring(transactions: Transaction[]): RecurringGroup[]
```

Detection algorithm:
1. Group transactions by normalized description (lowercase, trimmed)
2. Within each group, filter to candidates where all amounts are within 1% of the group maximum
3. Sort candidate dates ascending
4. Compute day-gaps between consecutive occurrences
5. Classify interval: 6–8 days → weekly, 13–15 days → biweekly, 28–31 days → monthly
6. Groups with ≥ 2 qualifying occurrences and a consistent interval are returned as `RecurringGroup`

#### `forecastEngine.ts`

```typescript
interface DayProjection {
  date: string; // ISO 8601
  transactions: ProjectedTransaction[];
  runningBalance: number;
  isNegative: boolean;
}

interface ProjectedTransaction {
  id: string;
  description: string;
  amount: number;
  classification: Classification;
  isRecurring: boolean;
  isFuture: boolean;
}

function generateForecast(
  transactions: Transaction[],
  projectionDays: 30 | 60 | 90
): DayProjection[]
```

Forecast generation:
1. Establish `startDate = today`, `endDate = today + projectionDays`
2. Build a map of `date → ProjectedTransaction[]`
3. For each confirmed recurring transaction, compute next occurrences from last known date, appending entries until `endDate`
4. For each one-time future manual transaction where `date <= endDate`, insert directly
5. Walk `startDate → endDate` day by day, accumulating running balance
6. Initial balance = sum of all historical (past) transactions; starts at 0 if no history
7. Return `DayProjection[]` sorted ascending by date

#### `storageService.ts`

```typescript
const STORAGE_KEY = "cashflow_transactions_v1";

function save(transactions: Transaction[]): void
function load(): Transaction[] | null  // null = no data; throws on corrupt data
function clear(): void
```

- `save`: JSON-serializes and writes to `localStorage[STORAGE_KEY]` synchronously
- `load`: parses JSON; if `JSON.parse` throws, rethrows so caller can handle corruption
- Corruption handling: the `TransactionStoreContext` catches the rethrow, initializes empty state, and displays an error toast

### State Management

**`TransactionStoreContext`** wraps the app and exposes:

```typescript
interface StoreState {
  transactions: Transaction[];
  recurringGroups: RecurringGroup[];
  loadError: string | null;
}

type StoreAction =
  | { type: "ADD_TRANSACTIONS"; payload: Transaction[] }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "CONFIRM_RECURRING"; payload: string }  // groupId
  | { type: "DISMISS_RECURRING"; payload: string }  // groupId
  | { type: "OVERRIDE_CLASSIFICATION"; payload: { id: string; classification: Classification } }
  | { type: "CLEAR_ALL" }
  | { type: "LOAD_FROM_STORAGE"; payload: Transaction[] }
  | { type: "STORAGE_LOAD_ERROR" }
```

After every mutating action the reducer calls `storageService.save()` (except `LOAD_FROM_STORAGE` and `STORAGE_LOAD_ERROR`). The `useEffect` at mount time calls `storageService.load()` and dispatches accordingly.

---

## Data Models

### `Transaction`

```typescript
interface Transaction {
  id: string;                         // UUID v4, generated at import/entry time
  date: string;                       // ISO 8601 (YYYY-MM-DD)
  description: string;                // max 255 chars
  amount: number;                     // positive = inflow, negative = outflow
  classification: Classification;     // "inflow" | "outflow" | "unclassified"
  classificationOverride?: {
    value: Classification;
    timestamp: string;                // ISO 8601 datetime
  };
  recurrence?: RecurrenceConfig;
  isRecurringConfirmed?: boolean;
  isRecurringDismissed?: boolean;
  recurringGroupId?: string;
  source: "csv" | "manual";
  createdAt: string;                   // ISO 8601 datetime
}

interface RecurrenceConfig {
  interval: RecurrenceInterval;       // "weekly" | "biweekly" | "monthly"
  confirmedByUser: boolean;
}
```

### `RecurringGroup`

```typescript
interface RecurringGroup {
  id: string;                          // UUID v4
  normalizedDescription: string;
  interval: RecurrenceInterval;
  transactionIds: string[];
  averageAmount: number;
  status: "pending" | "confirmed" | "dismissed";
}
```

### `ValidationSummary`

```typescript
interface ValidationSummary {
  importedCount: number;
  skippedCount: number;
  skippedRows: SkippedRow[];
}
```

### localStorage Schema

All state is stored under a single key `cashflow_transactions_v1` as a JSON array of `Transaction` objects. `RecurringGroup` status is derived from `transaction.isRecurringConfirmed` / `isRecurringDismissed` flags, so groups do not need separate storage.

```json
{
  "key": "cashflow_transactions_v1",
  "value": "Transaction[]"
}
```

Version suffix (`_v1`) allows future schema migrations without corrupting existing user data.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSV round-trip preserves transaction data

*For any* valid CSV file where every row has a parseable date, description, and decimal amount, parsing and then re-serializing all resulting transactions to CSV should yield the same set of (date, description, amount) tuples.

**Validates: Requirements 1.1, 1.8**

---

### Property 2: Invalid rows are always skipped and counted

*For any* CSV input where some rows are missing required fields or contain unparseable dates/amounts, the count of skipped rows plus the count of successfully imported rows should equal the total number of non-header rows in the input.

**Validates: Requirements 1.3, 1.4, 1.5, 1.7**

---

### Property 3: Classification is consistent with amount sign

*For any* transaction amount, the classification assigned by the Classifier should be "inflow" if the amount is strictly positive, "outflow" if strictly negative, and "unclassified" if zero or non-numeric.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.8**

---

### Property 4: User classification override persists and is not reverted

*For any* transaction whose classification has been manually overridden by a user, subsequent re-classification runs (triggered by any store mutation) should leave the overridden classification unchanged.

**Validates: Requirements 3.4**

---

### Property 5: Recurring detection is case-insensitive and whitespace-agnostic

*For any* pair of transactions that differ only in the case or surrounding whitespace of their descriptions, and whose amounts are within 1% of each other, the Recurrence_Detector should treat them as belonging to the same candidate group.

**Validates: Requirements 4.1, 4.7**

---

### Property 6: Running balance is the cumulative sum of projections

*For any* generated forecast, for every day D in the projection window, the running balance on day D should equal the initial balance plus the sum of all (signed) amounts of all projected transactions from day 0 through day D inclusive.

**Validates: Requirements 5.1, 5.4, 5.5**

---

### Property 7: Forecast includes all confirmed recurring future occurrences

*For any* confirmed recurring transaction with a given interval, the forecast should contain an occurrence for every due date within the selected projection window (no occurrence missing, no occurrence outside the window).

**Validates: Requirements 5.2**

---

### Property 8: Transaction persistence round-trip

*For any* set of transactions added to the Transaction_Store, serializing to localStorage and then deserializing should produce an equivalent set of transactions (same ids, dates, amounts, descriptions, classifications).

**Validates: Requirements 7.1, 7.2**

---

### Property 9: Whitespace-only descriptions are rejected as invalid

*For any* string composed entirely of whitespace characters (space, tab, newline), submitting it as a transaction description should be rejected and the Transaction_Store should remain unchanged.

**Validates: Requirements 2.2**

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| CSV file > 10 MB or > 10,000 rows | Reject before parsing; display size error banner |
| CSV file not `.csv` extension | Reject immediately; display format error banner |
| CSV row with missing field | Skip row; accumulate in `ValidationSummary.skippedRows` |
| CSV row with unparseable amount/date | Skip row; accumulate reason in `ValidationSummary` |
| All CSV rows invalid | Display "no valid transactions" error; nothing stored |
| Manual form: missing field | Field-level inline validation error; form not submitted |
| Manual form: amount out of range | Field-level inline validation error |
| Manual form: description > 255 chars | Field-level inline validation with character counter |
| Invalid classification override | Reject with validation error toast |
| localStorage corrupt | Initialize empty state; display persistent error banner with "Clear Data" CTA |
| Forecast generation error | Preserve last valid projection; attempt to display error toast |
| Transaction delete | Require confirmation dialog before removal |
| Clear All Data | Require confirmation dialog before clearing localStorage |

### Error UX Guidelines

- Field-level errors appear below the affected input in red, with the field border turning red
- Global errors (CSV parse failure, storage corruption) appear as a dismissible banner at the top of the page
- Success confirmations appear as a green toast notification (auto-dismiss after 3 seconds)
- Destructive action confirmations use a modal dialog identifying the affected item by date + description

---

## Testing Strategy

### Framework Setup

- **Test runner**: Vitest (Vite-native, fast, Jest-compatible API)
- **Component testing**: React Testing Library
- **Property-based testing**: `fast-check` (TypeScript-first, Vitest-compatible)
- **Coverage**: Vitest's built-in v8 coverage

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions for each module:

**`csvImporter.test.ts`**
- Parses a well-formed 3-row CSV correctly
- Skips header row (row 0)
- Skips row missing description; records correct row number and field name
- Skips row with `"abc"` as amount; records `"unparseable_amount"`
- Skips row with `"2024-13-01"` as date; records `"unparseable_date"`
- Rejects file > 10 MB; returns error
- Rejects `.txt` file; returns error
- Returns zero valid rows → no store write
- Handles negative amounts (e.g., `"-1500.00"`)
- Handles amounts without sign as positive (e.g., `"2000"`)

**`classifier.test.ts`**
- `classify(100)` → `"inflow"`
- `classify(-50)` → `"outflow"`
- `classify(0)` → `"unclassified"`
- `classify(NaN)` → `"unclassified"`
- `classify(null)` → `"unclassified"`
- `validateClassificationConsistency(100, "outflow")` → `false`

**`recurrenceDetector.test.ts`**
- Detects weekly pattern from 4 transactions 7 days apart
- Detects biweekly pattern from 3 transactions 14 days apart
- Detects monthly pattern from 3 transactions 30 days apart
- Does NOT flag group with only 1 transaction
- Treats `"RENT"` and `"rent"` as same description
- Treats `" Rent "` and `"Rent"` as same description
- Amounts within 1% tolerance are grouped; amounts >1% apart are not
- Dismissed group is excluded from future detection

**`forecastEngine.test.ts`**
- 30-day forecast starts today and ends 30 days hence (inclusive)
- Running balance starts at 0 when no history
- Confirmed weekly recurring transaction appears 4 times in 30-day window
- One-time future transaction on day 15 appears exactly once
- Negative balance correctly flagged on `DayProjection.isNegative`
- Changing window from 30 to 60 doubles confirmed recurring occurrences

**`storageService.test.ts`**
- Save then load returns same data
- Load with corrupted JSON throws
- Clear removes the key from localStorage

### Property-Based Tests

Each property test uses `fast-check` with a minimum run count of 100 iterations. Each test is tagged with a comment referencing the design property.

**Feature: cash-flow-forecasting, Property 1: CSV round-trip preserves transaction data**
```typescript
fc.assert(fc.property(
  fc.array(validTransactionArb()),
  (transactions) => {
    const csv = serializeToCSV(transactions);
    const { transactions: parsed } = parseCSVString(csv);
    return arraysEqualByKey(transactions, parsed, ["date", "description", "amount"]);
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 2: Invalid rows are always skipped and counted**
```typescript
fc.assert(fc.property(
  mixedCSVArb(), // generates rows with some valid, some invalid
  ({ csvString, validCount, totalNonHeaderRows }) => {
    const result = parseCSVString(csvString);
    return result.transactions.length + result.skippedRows.length === totalNonHeaderRows;
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 3: Classification is consistent with amount sign**
```typescript
fc.assert(fc.property(
  fc.oneof(
    fc.float({ min: 0.01, max: 1e9 }),    // positive
    fc.float({ min: -1e9, max: -0.01 }),  // negative
    fc.constant(0)
  ),
  (amount) => {
    const cls = classify(amount);
    if (amount > 0) return cls === "inflow";
    if (amount < 0) return cls === "outflow";
    return cls === "unclassified";
  }
), { numRuns: 500 });
```

**Feature: cash-flow-forecasting, Property 4: User classification override persists and is not reverted**
```typescript
fc.assert(fc.property(
  transactionArb(), classificationArb(),
  (transaction, override) => {
    const withOverride = applyClassificationOverride(transaction, override);
    const afterReclassify = reclassify(withOverride);
    return afterReclassify.classification === override;
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 5: Recurring detection is case-insensitive and whitespace-agnostic**
```typescript
fc.assert(fc.property(
  descriptionArb(), amountArb(), datesArb(),
  (description, amount, dates) => {
    const transactions = dates.map(d =>
      makeTransaction({ description: description.toUpperCase(), amount, date: d })
    );
    const transactionsLower = dates.map(d =>
      makeTransaction({ description: description.toLowerCase().trim(), amount, date: d })
    );
    const groupsUpper = detectRecurring(transactions);
    const groupsLower = detectRecurring(transactionsLower);
    return groupsUpper.length === groupsLower.length;
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 6: Running balance is the cumulative sum of projections**
```typescript
fc.assert(fc.property(
  fc.array(projectedTransactionArb(), { minLength: 1 }),
  fc.integer({ min: 0, max: 999 }), // initial balance
  (projectedTxns, initialBalance) => {
    const forecast = computeForecast(projectedTxns, initialBalance);
    for (let i = 0; i < forecast.length; i++) {
      const expected = initialBalance + sumUpToDay(projectedTxns, i);
      if (Math.abs(forecast[i].runningBalance - expected) > 0.001) return false;
    }
    return true;
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 7: Forecast includes all confirmed recurring future occurrences**
```typescript
fc.assert(fc.property(
  confirmedRecurringTransactionArb(),
  fc.constantFrom(30, 60, 90),
  (recurringTxn, windowDays) => {
    const forecast = generateForecast([recurringTxn], windowDays);
    const expectedCount = countExpectedOccurrences(recurringTxn, windowDays);
    const actualCount = forecast.flatMap(d => d.transactions)
      .filter(t => t.id === recurringTxn.id || t.sourceId === recurringTxn.id).length;
    return actualCount === expectedCount;
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 8: Transaction persistence round-trip**
```typescript
fc.assert(fc.property(
  fc.array(transactionArb(), { minLength: 0, maxLength: 500 }),
  (transactions) => {
    save(transactions);
    const loaded = load();
    return deepEqual(transactions, loaded);
  }
), { numRuns: 100 });
```

**Feature: cash-flow-forecasting, Property 9: Whitespace-only descriptions are rejected**
```typescript
fc.assert(fc.property(
  fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
  (whitespaceDesc) => {
    const result = validateManualEntry({ description: whitespaceDesc, amount: 100, date: "2024-01-01" });
    return result.valid === false && result.fieldErrors.description !== undefined;
  }
), { numRuns: 100 });
```

### Integration Tests

- Full import flow: upload CSV → parse → store → render in transaction list
- Forecast updates when transaction is added/deleted
- localStorage corruption: app loads to empty state with error banner
- "Clear All Data" flow: confirmation → cleared → empty list + reset forecast

### Test File Structure

```
src/
  lib/
    csvImporter.ts
    csvImporter.test.ts
    classifier.ts
    classifier.test.ts
    recurrenceDetector.ts
    recurrenceDetector.test.ts
    forecastEngine.ts
    forecastEngine.test.ts
    storageService.ts
    storageService.test.ts
  context/
    TransactionStore.tsx
    TransactionStore.test.tsx
```

### Running Tests

```bash
# Single run (CI / verification)
npm run test -- --run

# Watch mode (development)
npm run test

# Coverage report
npm run test -- --run --coverage
```
