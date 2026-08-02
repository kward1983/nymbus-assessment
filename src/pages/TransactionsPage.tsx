import { useState } from "react";
import { useTransactionStore } from "../context/TransactionStore";
import TransactionTable from "../components/TransactionTable";
import { TransactionForm } from "../components/TransactionForm";
import RecurringBanner from "../components/RecurringBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Transaction } from "../types";

export default function TransactionsPage() {
  const { state, dispatch } = useTransactionStore();

  // Local state
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    date: string;
    description: string;
  } | null>(null);

  // ─── Recurring banner handlers ──────────────────────────────────────────────

  const handleConfirmRecurring = (groupId: string) => {
    dispatch({ type: "CONFIRM_RECURRING", payload: groupId });
  };

  const handleDismissRecurring = (groupId: string) => {
    dispatch({ type: "DISMISS_RECURRING", payload: groupId });
  };

  // ─── Form handlers ─────────────────────────────────────────────────────────

  const handleFormSubmit = (transaction: Transaction) => {
    if (editingTransaction) {
      dispatch({ type: "UPDATE_TRANSACTION", payload: transaction });
    } else {
      dispatch({ type: "ADD_TRANSACTIONS", payload: [transaction] });
    }
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  // ─── Table handlers ─────────────────────────────────────────────────────────

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (transactionId: string) => {
    const txn = state.transactions.find((t) => t.id === transactionId);
    if (txn) {
      setDeleteTarget({
        id: txn.id,
        date: txn.date,
        description: txn.description,
      });
    }
  };

  // ─── Delete confirmation handlers ──────────────────────────────────────────

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      dispatch({ type: "DELETE_TRANSACTION", payload: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--ui-black)]">Transactions</h1>

      {/* Recurring banner */}
      <RecurringBanner
        groups={state.recurringGroups}
        onConfirm={handleConfirmRecurring}
        onDismiss={handleDismissRecurring}
      />

      {/* Toggle form button */}
      <div>
        <button
          type="button"
          onClick={() => {
            if (showForm && !editingTransaction) {
              setShowForm(false);
            } else {
              setEditingTransaction(null);
              setShowForm(!showForm);
            }
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showForm && !editingTransaction ? "Hide Form" : "Add Transaction"}
        </button>
      </div>

      {/* Collapsible TransactionForm */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--ui-black)] mb-4">
            {editingTransaction ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <TransactionForm
            editTransaction={editingTransaction}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* Transaction table */}
      <TransactionTable
        transactions={state.transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Transaction"
        message={
          deleteTarget
            ? `Are you sure you want to delete the transaction from ${deleteTarget.date}: '${deleteTarget.description}'?`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
