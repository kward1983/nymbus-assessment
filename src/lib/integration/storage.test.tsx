import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionStoreProvider } from '../../context/TransactionStore';
import App from '../../App';

const STORAGE_KEY = 'cashflow_transactions_v1';

/**
 * Integration test: localStorage corruption handling
 *
 * Validates: Requirements 7.3
 *
 * Seeds localStorage with invalid JSON before rendering the app.
 * Verifies that:
 *   - The app initializes with an empty transaction state (no crash)
 *   - An error banner is visible informing the user about corruption
 *   - No transaction rows are displayed
 */
describe('localStorage corruption handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes empty state and shows error banner on corrupt data', async () => {
    // Seed localStorage with invalid JSON before rendering
    localStorage.setItem(STORAGE_KEY, '{{not valid json!!!');

    render(
      <MemoryRouter initialEntries={['/']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    // Assert error banner is visible (the Layout renders a role="alert" element)
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Stored data could not be loaded');
    });

    // Assert the app didn't crash — Dashboard heading should still render
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Assert empty state — Current Balance shows $0.00 (no transaction data loaded)
    const balanceCard = screen.getByText('Current Balance').closest('div');
    expect(balanceCard).toHaveTextContent('$0.00');
  });

  it('shows error banner and no transactions on the Transactions page', async () => {
    // Seed localStorage with corrupt data
    localStorage.setItem(STORAGE_KEY, 'corrupted{[data');

    render(
      <MemoryRouter initialEntries={['/transactions']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    // Assert error banner is visible
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Stored data could not be loaded');
    });

    // Assert no transaction rows are displayed — table shows empty state
    expect(screen.getByText('No transactions to display.')).toBeInTheDocument();
  });

  it('provides a Clear Data button in the error banner', async () => {
    localStorage.setItem(STORAGE_KEY, '!!!invalid');

    render(
      <MemoryRouter initialEntries={['/']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    // Wait for the error banner to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Assert the Clear Data button is present within the banner
    const clearButton = screen.getByRole('button', { name: /clear data/i });
    expect(clearButton).toBeInTheDocument();
  });
});
