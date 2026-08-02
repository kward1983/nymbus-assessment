import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TransactionStoreProvider, useTransactionStore } from '../../context/TransactionStore';
import { STORAGE_KEY, save } from '../storageService';
import type { Transaction } from '../../types';

/**
 * Integration test: "Clear All Data" flow
 * Validates: Requirements 7.4, 7.5, 7.6
 *
 * Tests the CLEAR_ALL action dispatched through the TransactionStore context,
 * verifying that localStorage is emptied and state is reset.
 */

// Helper to create a valid transaction for seeding
function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2024-06-15',
    description: 'Test Transaction',
    amount: 100,
    classification: 'inflow',
    source: 'manual',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// A test component that exposes store state and a clear button
function TestHarness() {
  const { state, dispatch } = useTransactionStore();

  return (
    <div>
      <span data-testid="tx-count">{state.transactions.length}</span>
      <button
        data-testid="clear-all-btn"
        onClick={() => dispatch({ type: 'CLEAR_ALL' })}
      >
        Clear All Data
      </button>
      {state.transactions.map((tx) => (
        <span key={tx.id} data-testid="tx-item">
          {tx.description}
        </span>
      ))}
    </div>
  );
}

describe('Clear All Data flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears all data from localStorage and resets state when CLEAR_ALL is dispatched', async () => {
    // Pre-seed localStorage with transactions
    const seedTransactions: Transaction[] = [
      makeTransaction({ description: 'Invoice Payment', amount: 5000 }),
      makeTransaction({ description: 'Office Rent', amount: -2000, classification: 'outflow' }),
      makeTransaction({ description: 'Software License', amount: -99.99, classification: 'outflow' }),
    ];
    save(seedTransactions);

    // Verify pre-seed is in localStorage
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    // Render the provider + test harness (provider will load from storage on mount)
    render(
      <TransactionStoreProvider>
        <TestHarness />
      </TransactionStoreProvider>
    );

    // Wait for the store to load from localStorage
    // The provider's useEffect will dispatch LOAD_FROM_STORAGE
    await screen.findByText('3', {}, { timeout: 2000 });
    expect(screen.getByTestId('tx-count').textContent).toBe('3');

    // Trigger "Clear All Data"
    const clearButton = screen.getByTestId('clear-all-btn');
    await act(async () => {
      clearButton.click();
    });

    // Assert localStorage key is removed
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Assert transaction list is empty
    expect(screen.getByTestId('tx-count').textContent).toBe('0');
    expect(screen.queryAllByTestId('tx-item')).toHaveLength(0);
  });

  it('resets recurring groups when clearing all data', async () => {
    // Seed with transactions that could form a recurring group
    const seedTransactions: Transaction[] = [
      makeTransaction({
        description: 'Monthly Rent',
        amount: -1500,
        classification: 'outflow',
        date: '2024-01-15',
        isRecurringConfirmed: true,
        recurringGroupId: 'group-1',
        recurrence: { interval: 'monthly', confirmedByUser: true },
      }),
      makeTransaction({
        description: 'Monthly Rent',
        amount: -1500,
        classification: 'outflow',
        date: '2024-02-15',
        isRecurringConfirmed: true,
        recurringGroupId: 'group-1',
        recurrence: { interval: 'monthly', confirmedByUser: true },
      }),
    ];
    save(seedTransactions);

    render(
      <TransactionStoreProvider>
        <TestHarness />
      </TransactionStoreProvider>
    );

    // Wait for store to load
    await screen.findByText('2', {}, { timeout: 2000 });

    // Trigger clear
    await act(async () => {
      screen.getByTestId('clear-all-btn').click();
    });

    // Verify everything is wiped
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('tx-count').textContent).toBe('0');
  });

  it('works correctly even when localStorage is already empty', async () => {
    // No pre-seeding — start with empty localStorage
    render(
      <TransactionStoreProvider>
        <TestHarness />
      </TransactionStoreProvider>
    );

    // Initial state should be empty
    expect(screen.getByTestId('tx-count').textContent).toBe('0');

    // Trigger clear on empty state
    await act(async () => {
      screen.getByTestId('clear-all-btn').click();
    });

    // Still empty — no errors
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('tx-count').textContent).toBe('0');
  });
});
