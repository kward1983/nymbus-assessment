# Cash Flow Forecasting

A frontend-only React single-page application for small business cash flow management. Import transactions via CSV, add entries manually, get automatic inflow/outflow classification, detect recurring patterns, and visualize a 30/60/90-day cash flow forecast — all running entirely in the browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| CSV Parsing | PapaParse |
| Date Handling | date-fns |
| Testing | Vitest + fast-check |

## Features

- **CSV Import** — Upload transaction history from CSV files with validation and error reporting
- **Manual Entry** — Add individual transactions with date, description, amount, and recurrence settings
- **Auto-Classification** — Transactions automatically classified as inflow (positive) or outflow (negative)
- **Recurring Detection** — Identifies weekly, biweekly, and monthly patterns from transaction history
- **Cash Flow Forecast** — 30, 60, or 90-day projection with line chart and summary table
- **Negative Balance Alerts** — Visual highlighting when projected balance drops below zero

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- npm (included with Node.js)

## Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with coverage report
npm run test:coverage
```

## Building for Production

```bash
npm run build
```

Output is generated in the `dist/` directory.

## Deployment

### Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click Deploy.

### Netlify

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Go to [netlify.com](https://netlify.com) and import the repository.
3. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Click Deploy.

## Data Storage

All data is stored in the browser's `localStorage`. There is no backend server or database. Data persists between sessions on the same browser but is not synced across devices. Use the "Clear All Data" option in the app to reset to a clean state.
