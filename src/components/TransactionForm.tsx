import { useState, useEffect, type FormEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import { classify } from "../lib/classifier";
import type { Transaction, RecurrenceInterval } from "../types/index";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionFormProps {
  editTransaction?: Transaction | null;
  onSubmit: (transaction: Transaction) => void;
  onCancel?: () => void;
}

// ─── Validation types ─────────────────────────────────────────────────────────

interface FieldErrors {
  date?: string;
  description?: string;
  amount?: string;
  recurrence?: string;
}

type FlowDirection = "inflow" | "outflow";

const RECURRENCE_OPTIONS: { value: RecurrenceInterval | "one-time"; label: string }[] = [
  { value: "one-time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const MAX_DESCRIPTION_LENGTH = 255;
const MAX_AMOUNT = 999_999_999.99;

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionForm({ editTransaction, onSubmit, onCancel }: TransactionFormProps) {
  const isEditMode = editTransaction != null;

  // Form field state
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [flowDirection, setFlowDirection] = useState<FlowDirection>("outflow");
  const [recurrence, setRecurrence] = useState<RecurrenceInterval | "one-time">("one-time");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Pre-populate fields in edit mode
  useEffect(() => {
    if (editTransaction) {
      setDate(editTransaction.date);
      setDescription(editTransaction.description);
      const absAmount = Math.abs(editTransaction.amount);
      setAmountStr(absAmount.toString());
      setFlowDirection(editTransaction.amount >= 0 ? "inflow" : "outflow");
      if (editTransaction.recurrence) {
        setRecurrence(editTransaction.recurrence.interval);
      } else {
        setRecurrence("one-time");
      }
      setErrors({});
    }
  }, [editTransaction]);

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): FieldErrors {
    const fieldErrors: FieldErrors = {};

    // Date validation
    if (!date.trim()) {
      fieldErrors.date = "Date is required.";
    } else {
      // Check valid calendar date (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date.trim())) {
        fieldErrors.date = "Date must be a valid date (YYYY-MM-DD).";
      } else {
        const parsed = new Date(date.trim() + "T00:00:00");
        if (isNaN(parsed.getTime())) {
          fieldErrors.date = "Date must be a valid calendar date.";
        } else {
          // Verify the date components match (handles e.g. Feb 30)
          const [y, m, d] = date.trim().split("-").map(Number);
          if (parsed.getFullYear() !== y || parsed.getMonth() + 1 !== m || parsed.getDate() !== d) {
            fieldErrors.date = "Date must be a valid calendar date.";
          }
        }
      }
    }

    // Description validation
    if (!description || description.trim().length === 0) {
      fieldErrors.description = "Description is required.";
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      fieldErrors.description = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`;
    }

    // Amount validation
    if (!amountStr.trim()) {
      fieldErrors.amount = "Amount is required.";
    } else {
      const numericAmount = parseFloat(amountStr.trim());
      if (isNaN(numericAmount)) {
        fieldErrors.amount = "Amount must be a valid number.";
      } else if (numericAmount < 0) {
        fieldErrors.amount = "Amount must be 0.00 or greater.";
      } else if (numericAmount > MAX_AMOUNT) {
        fieldErrors.amount = `Amount must not exceed ${MAX_AMOUNT.toLocaleString()}.`;
      }
    }

    // Recurrence validation
    if (!recurrence) {
      fieldErrors.recurrence = "Recurrence selection is required.";
    }

    return fieldErrors;
  }

  // ─── Submit handler ───────────────────────────────────────────────────────

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate();
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    // Build signed amount
    const absAmount = parseFloat(amountStr.trim());
    const signedAmount = flowDirection === "outflow" ? -absAmount : absAmount;
    const classification = classify(signedAmount);

    // Build recurrence config
    const recurrenceConfig =
      recurrence === "one-time"
        ? undefined
        : { interval: recurrence, confirmedByUser: true };

    let transaction: Transaction;

    if (isEditMode && editTransaction) {
      // Edit mode: preserve original id, source, createdAt
      transaction = {
        ...editTransaction,
        date: date.trim(),
        description: description.trim(),
        amount: signedAmount,
        classification,
        recurrence: recurrenceConfig,
      };
    } else {
      // Add mode: generate new id, source="manual", createdAt=now
      transaction = {
        id: uuidv4(),
        date: date.trim(),
        description: description.trim(),
        amount: signedAmount,
        classification,
        recurrence: recurrenceConfig,
        source: "manual",
        createdAt: new Date().toISOString(),
      };
    }

    onSubmit(transaction);

    // Reset form if in add mode
    if (!isEditMode) {
      setDate("");
      setDescription("");
      setAmountStr("");
      setFlowDirection("outflow");
      setRecurrence("one-time");
      setErrors({});
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Date field */}
      <div>
        <label htmlFor="txn-date" className="block text-sm font-medium text-black mb-1">
          Date
        </label>
        <input
          id="txn-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.date ? "border-red-500" : "border-slate-300"
          }`}
        />
        {errors.date && (
          <p className="mt-1 text-xs text-red-500">{errors.date}</p>
        )}
      </div>

      {/* Description field */}
      <div>
        <label htmlFor="txn-description" className="block text-sm font-medium text-black mb-1">
          Description
        </label>
        <input
          id="txn-description"
          type="text"
          maxLength={MAX_DESCRIPTION_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Monthly rent payment"
          className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.description ? "border-red-500" : "border-slate-300"
          }`}
        />
        <p className="mt-1 text-xs text-slate-500">
          {description.length} / {MAX_DESCRIPTION_LENGTH}
        </p>
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Amount + Inflow/Outflow toggle */}
      <div>
        <label htmlFor="txn-amount" className="block text-sm font-medium text-black mb-1">
          Amount
        </label>
        <div className="flex gap-2">
          <input
            id="txn-amount"
            type="number"
            step="0.01"
            min="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className={`flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.amount ? "border-red-500" : "border-slate-300"
            }`}
          />
          <div className="flex rounded border border-slate-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setFlowDirection("inflow")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                flowDirection === "inflow"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              aria-pressed={flowDirection === "inflow"}
            >
              Inflow
            </button>
            <button
              type="button"
              onClick={() => setFlowDirection("outflow")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                flowDirection === "outflow"
                  ? "bg-red-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              aria-pressed={flowDirection === "outflow"}
            >
              Outflow
            </button>
          </div>
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
        )}
      </div>

      {/* Recurrence select */}
      <div>
        <label htmlFor="txn-recurrence" className="block text-sm font-medium text-black mb-1">
          Recurrence
        </label>
        <select
          id="txn-recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as RecurrenceInterval | "one-time")}
          className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            errors.recurrence ? "border-red-500" : "border-slate-300"
          }`}
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.recurrence && (
          <p className="mt-1 text-xs text-red-500">{errors.recurrence}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {isEditMode ? "Update Transaction" : "Add Transaction"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
