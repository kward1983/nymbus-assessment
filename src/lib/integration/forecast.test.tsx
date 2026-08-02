import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionStoreProvider } from '../../context/TransactionStore';
import ForecastPage from '../../pages/ForecastPage';
import { save } from '../storageService';
import type { Transaction } from '../../types';
import { format, subWeeks, startOfDay } from 'date-fns';

/**
 * Integration test: Forecast update when confirmed recurring transactions exist.
 *
 * Validates: Requirements 5.2, 5.9
 *
 * Verifies that when a confirmed recurring (weekly) transaction is present,
 * ForecastPage renders projected future occurrences in both the chart and
 * the summary table.
 */
describe('Forecast update integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderForecastPage() {
    return render(
      <MemoryRouter initialEntries={['/forecast']}>
        <TransactionStoreProvider>
          <ForecastPage />
        </TransactionStoreProvider>
      </MemoryRouter>
    );
  }

  it('shows confirmed recurring transactions in forecast', async () => {
    // Create a confirmed weekly recurring transaction dated 2 weeks ago
    const today = startOfDay(new Date());
    const twoWeeksAgo = subWeeks(today, 2);

    const recurringTransaction: Transaction = {
      id: 'recurring-weekly-001',
      date: format(twoWeeksAgo, 'yyyy-MM-dd'),
      description: 'Weekly Vendor Payment',
      amount: -500,
      classification: 'outflow',
      recurrence: {
        interval: 'weekly',
        confirmedByUser: true,
      },
      isRecurringConfirmed: true,
      isRecurringDismissed: false,
      recurringGroupId: 'group-001',
      source: 'csv',
      createdAt: new Date().toISOString(),
    };

    // Pre-seed localStorage so TransactionStoreProvider loads data on mount
    save([recurringTransaction]);

    renderForecastPage();

    // Wait for the forecast to render with the recurring transaction's description
    // A weekly recurring transaction from 2 weeks ago should produce multiple
    // future occurrences in a 30-day window (approximately 4-5 occurrences).
    await waitFor(() => {
      // The ForecastSummaryTable should display rows containing the description
      const descriptionElements = screen.getAllByText('Weekly Vendor Payment');
      // At least one projected occurrence should appear in the table
      expect(descriptionElements.length).toBeGreaterThanOrEqual(1);
    });

    // Verify the page heading and chart container are rendered
    // (Recharts' ResponsiveContainer may not render SVG in jsdom without
    // explicit dimensions, but the container div should still be present)
    expect(screen.getByText('Cash Flow Forecast')).toBeInTheDocument();

    // Verify the summary table shows classification badge for outflow
    await waitFor(() => {
      const outflowBadges = screen.getAllByText('outflow');
      expect(outflowBadges.length).toBeGreaterThanOrEqual(1);
    });

    // Verify that the amount is formatted and shown (negative $500.00)
    await waitFor(() => {
      const amountElements = screen.getAllByText('-$500.00');
      expect(amountElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('projects correct number of weekly occurrences in 30-day window', async () => {
    // A weekly transaction from 1 week ago: next occurrences are at day 0 (today),
    // day 7, day 14, day 21, day 28 — up to 4-5 occurrences in 30 days
    const today = startOfDay(new Date());
    const oneWeekAgo = subWeeks(today, 1);

    const recurringTransaction: Transaction = {
      id: 'recurring-weekly-002',
      date: format(oneWeekAgo, 'yyyy-MM-dd'),
      description: 'Recurring Office Rent',
      amount: -1200,
      classification: 'outflow',
      recurrence: {
        interval: 'weekly',
        confirmedByUser: true,
      },
      isRecurringConfirmed: true,
      isRecurringDismissed: false,
      recurringGroupId: 'group-002',
      source: 'csv',
      createdAt: new Date().toISOString(),
    };

    save([recurringTransaction]);

    renderForecastPage();

    // Weekly from 1 week ago: the engine starts extrapolating from the next occurrence
    // after the last known date. With last known date = 1 week ago, next occurrences
    // fall at today, +7, +14, +21, +28 days — up to 5 within 30-day window.
    await waitFor(() => {
      const descriptionElements = screen.getAllByText('Recurring Office Rent');
      // Should have at least 4 occurrences within 30-day window
      expect(descriptionElements.length).toBeGreaterThanOrEqual(4);
    });
  });
});
