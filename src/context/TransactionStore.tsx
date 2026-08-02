import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";

import type { StoreState, StoreAction } from "../types/index";
import { save, load, clear } from "../lib/storageService";
import { detectRecurring } from "../lib/recurrenceDetector";

// Re-export types for convenience
export type { StoreState, StoreAction } from "../types/index";

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: StoreState = {
  transactions: [],
  recurringGroups: [],
  loadError: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "ADD_TRANSACTIONS": {
      const updatedTransactions = [...state.transactions, ...action.payload];
      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: detectRecurring(updatedTransactions),
        loadError: null,
      };
      save(nextState.transactions);
      return nextState;
    }

    case "UPDATE_TRANSACTION": {
      const updatedTransactions = state.transactions.map((tx) =>
        tx.id === action.payload.id ? action.payload : tx
      );
      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: detectRecurring(updatedTransactions),
      };
      save(nextState.transactions);
      return nextState;
    }

    case "DELETE_TRANSACTION": {
      const updatedTransactions = state.transactions.filter(
        (tx) => tx.id !== action.payload
      );
      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: detectRecurring(updatedTransactions),
      };
      save(nextState.transactions);
      return nextState;
    }

    case "CONFIRM_RECURRING": {
      const groupId = action.payload;
      const group = state.recurringGroups.find((g) => g.id === groupId);
      if (!group) return state;

      // Mark all transactions in the group as confirmed
      const updatedTransactions = state.transactions.map((tx) => {
        if (group.transactionIds.includes(tx.id)) {
          return {
            ...tx,
            isRecurringConfirmed: true,
            recurringGroupId: groupId,
            recurrence: {
              interval: group.interval,
              confirmedByUser: true,
            },
          };
        }
        return tx;
      });

      // Update the group status to confirmed
      const updatedGroups = state.recurringGroups.map((g) =>
        g.id === groupId ? { ...g, status: "confirmed" as const } : g
      );

      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: updatedGroups,
      };
      save(nextState.transactions);
      return nextState;
    }

    case "DISMISS_RECURRING": {
      const groupId = action.payload;
      const group = state.recurringGroups.find((g) => g.id === groupId);
      if (!group) return state;

      // Mark all transactions in the group as dismissed
      const updatedTransactions = state.transactions.map((tx) => {
        if (group.transactionIds.includes(tx.id)) {
          return {
            ...tx,
            isRecurringDismissed: true,
            recurringGroupId: groupId,
          };
        }
        return tx;
      });

      // Update the group status to dismissed
      const updatedGroups = state.recurringGroups.map((g) =>
        g.id === groupId ? { ...g, status: "dismissed" as const } : g
      );

      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: updatedGroups,
      };
      save(nextState.transactions);
      return nextState;
    }

    case "OVERRIDE_CLASSIFICATION": {
      const { id, classification } = action.payload;
      const updatedTransactions = state.transactions.map((tx) => {
        if (tx.id === id) {
          return {
            ...tx,
            classification,
            classificationOverride: {
              value: classification,
              timestamp: new Date().toISOString(),
            },
          };
        }
        return tx;
      });

      const nextState: StoreState = {
        ...state,
        transactions: updatedTransactions,
        recurringGroups: detectRecurring(updatedTransactions),
      };
      save(nextState.transactions);
      return nextState;
    }

    case "CLEAR_ALL": {
      clear();
      return {
        transactions: [],
        recurringGroups: [],
        loadError: null,
      };
    }

    case "LOAD_FROM_STORAGE": {
      const loaded = action.payload;
      return {
        transactions: loaded,
        recurringGroups: detectRecurring(loaded),
        loadError: null,
      };
    }

    case "STORAGE_LOAD_ERROR": {
      return {
        transactions: [],
        recurringGroups: [],
        loadError: "Stored data could not be loaded. Starting with empty state.",
      };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface TransactionStoreContextValue {
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
}

const TransactionStoreContext = createContext<TransactionStoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TransactionStoreProviderProps {
  children: ReactNode;
}

export function TransactionStoreProvider({ children }: TransactionStoreProviderProps) {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  // On mount, load transactions from localStorage
  useEffect(() => {
    try {
      const stored = load();
      if (stored !== null) {
        dispatch({ type: "LOAD_FROM_STORAGE", payload: stored });
      }
    } catch {
      dispatch({ type: "STORAGE_LOAD_ERROR" });
    }
  }, []);

  return (
    <TransactionStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </TransactionStoreContext.Provider>
  );
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

export function useTransactionStore(): TransactionStoreContextValue {
  const context = useContext(TransactionStoreContext);
  if (context === null) {
    throw new Error(
      "useTransactionStore must be used within a TransactionStoreProvider"
    );
  }
  return context;
}
