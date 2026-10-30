import { formatEuro, formatMad, MAD_TO_EUR, toEuro } from "@/lib/format";
import type { AssetCurrency, Expense } from "@/lib/types";

export { MAD_TO_EUR, toEuro };

export function expenseCurrency(
  expense: Pick<Expense, "currency"> | { currency?: string | null }
): AssetCurrency {
  return expense.currency === "MAD" ? "MAD" : "EUR";
}

export function splitExpenseAmounts(
  amountOriginal: number,
  currency: AssetCurrency
): {
  amount: number;
  amount_original: number;
  currency: AssetCurrency;
} {
  const original = Number(amountOriginal.toFixed(2));
  return {
    amount_original: original,
    amount: toEuro(original, currency),
    currency,
  };
}

export function normalizeExpense(row: Expense | Record<string, unknown>): Expense {
  const expense = row as Expense;
  const amount = Number(expense.amount);
  const currency = expenseCurrency(expense);
  const originalRaw = expense.amount_original;
  const original =
    originalRaw != null && Number.isFinite(Number(originalRaw))
      ? Number(originalRaw)
      : amount;
  return {
    ...expense,
    amount,
    amount_original: original,
    currency,
  };
}

export function formatExpenseEntered(expense: Expense) {
  if (expenseCurrency(expense) === "MAD") {
    return formatMad(Number(expense.amount_original));
  }
  return formatEuro(Number(expense.amount));
}
