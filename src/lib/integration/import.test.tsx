import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionStoreProvider } from '../../context/TransactionStore';
import App from '../../App';

/**
 * Integration test: Full CSV import flow
 *
 * Validates: Requirements 1.1, 1.7, 7.1
 *
 * Renders the app at /import, simulates a CSV file upload,
 * and verifies that transactions appear in the store and
 * are displayed on the Transactions page.
 */
describe('Import flow integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test to start fresh
    localStorage.clear();
  });

  it('uploads CSV and stores transactions that appear in the transaction list', async () => {
    // Valid CSV content with header + 3 data rows
    const csvContent = [
      'date,description,amount',
      '2024-03-01,Client Payment,5000.00',
      '2024-03-05,Office Rent,-1500.00',
      '2024-03-10,Consulting Fee,2500.00',
    ].join('\n');

    const file = new File([csvContent], 'transactions.csv', {
      type: 'text/csv',
    });

    // Render at /import route
    render(
      <MemoryRouter initialEntries={['/import']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    // Verify we're on the Import page
    expect(screen.getByText('Import Transactions')).toBeInTheDocument();

    // Find the hidden file input and simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for the import summary to appear
    await waitFor(() => {
      expect(screen.getByText('Import Summary')).toBeInTheDocument();
    });

    // Verify imported count is shown (3 transactions)
    expect(screen.getByText('3')).toBeInTheDocument();

    // Verify success message
    expect(
      screen.getByText('Successfully imported 3 transactions.')
    ).toBeInTheDocument();

    // Verify data was persisted to localStorage (Req 7.1)
    const stored = localStorage.getItem('cashflow_transactions_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].description).toBe('Client Payment');
    expect(parsed[0].amount).toBe(5000);
    expect(parsed[1].description).toBe('Office Rent');
    expect(parsed[1].amount).toBe(-1500);
    expect(parsed[2].description).toBe('Consulting Fee');
    expect(parsed[2].amount).toBe(2500);
  });

  it('displays imported transactions on the Transactions page', async () => {
    // Valid CSV content with header + 2 data rows
    const csvContent = [
      'date,description,amount',
      '2024-04-01,Invoice Payment,3000.00',
      '2024-04-15,Software License,-200.00',
    ].join('\n');

    const file = new File([csvContent], 'april.csv', {
      type: 'text/csv',
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/import']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    // Upload the CSV file
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for successful import
    await waitFor(() => {
      expect(screen.getByText('Successfully imported 2 transactions.')).toBeInTheDocument();
    });

    // Navigate to /transactions by clicking the nav link
    const transactionsLink = screen.getByRole('link', { name: /transactions/i });
    fireEvent.click(transactionsLink);

    // Wait for the TransactionsPage to render with the imported data
    await waitFor(() => {
      expect(screen.getByText('Invoice Payment')).toBeInTheDocument();
    });

    // Verify both transactions appear in the table
    expect(screen.getByText('Software License')).toBeInTheDocument();
  });

  it('shows skipped row count for partially valid CSV', async () => {
    // CSV with 1 valid row and 1 invalid row (bad date)
    const csvContent = [
      'date,description,amount',
      '2024-05-01,Good Transaction,1000.00',
      'invalid-date,Bad Transaction,500.00',
    ].join('\n');

    const file = new File([csvContent], 'mixed.csv', {
      type: 'text/csv',
    });

    render(
      <MemoryRouter initialEntries={['/import']}>
        <TransactionStoreProvider>
          <App />
        </TransactionStoreProvider>
      </MemoryRouter>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for import summary
    await waitFor(() => {
      expect(screen.getByText('Import Summary')).toBeInTheDocument();
    });

    // Verify the imported and skipped counts (Req 1.7)
    // 1 imported, 1 skipped
    expect(screen.getByText('Successfully imported 1 transaction.')).toBeInTheDocument();
    expect(screen.getByText('Skipped Rows')).toBeInTheDocument();

    // Verify only 1 transaction was stored
    const stored = localStorage.getItem('cashflow_transactions_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].description).toBe('Good Transaction');
  });
});
