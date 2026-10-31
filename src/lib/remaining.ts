import type {
  Category,
  CategoryLimit,
  Expense,
  Income,
  UserBalances,
} from "@/lib/types";
import { budgetMonthKey } from "@/lib/incomes";
import {
  sumSalaryExpenses,
  sumSalaryIncomes,
} from "@/lib/swile-prime";

export function emptyBalancesForMonth(month: Date): UserBalances {
  return {
    user_id: "",
    budget_month: budgetMonthKey(month),
    bank_eur: null,
    swile_eur: null,
    updated_at: "",
  };
}

export const EMPTY_BALANCES: UserBalances = emptyBalancesForMonth(
  new Date(0)
);

export function sumSwileIncomes(incomes: Income[]): number {
  return incomes.reduce((sum, income) => {
    if ((income.source ?? "Autres") !== "Swile") return sum;
    return sum + Number(income.amount);
  }, 0);
}

export function sumSwileExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => {
    if ((expense.payment_method ?? "cb") !== "swile") return sum;
    return sum + Number(expense.amount);
  }, 0);
}

export function spentByCategory(expenses: Expense[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const expense of expenses) {
    const current = map.get(expense.category) ?? 0;
    map.set(expense.category, current + Number(expense.amount));
  }
  return map;
}

export function limitForCategory(
  limits: CategoryLimit[],
  category: Category | null
): CategoryLimit | null {
  if (!category) return null;
  return limits.find((item) => item.category === category) ?? null;
}

export type MonthRemaining = {
  salaryIn: number;
  salaryOut: number;
  salaryLeft: number;
  swileIn: number;
  swileOut: number;
  swileMonthLeft: number;
};

export function computeMonthRemaining(
  incomes: Income[],
  expenses: Expense[]
): MonthRemaining {
  const salaryIn = sumSalaryIncomes(incomes);
  const salaryOut = sumSalaryExpenses(expenses);
  const swileIn = sumSwileIncomes(incomes);
  const swileOut = sumSwileExpenses(expenses);

  return {
    salaryIn,
    salaryOut,
    salaryLeft: salaryIn - salaryOut,
    swileIn,
    swileOut,
    swileMonthLeft: swileIn - swileOut,
  };
}

/** Solde de fin prévu = ouverture du 1er + flux du mois. */
export function expectedClosing(
  opening: number | null,
  inflow: number,
  outflow: number
): number | null {
  if (opening == null) return null;
  return opening + inflow - outflow;
}

/** Début réel du mois − reste prévu du mois précédent. */
export function openingGap(
  actualOpening: number | null,
  previousExpected: number | null
): number | null {
  if (actualOpening == null || previousExpected == null) return null;
  return actualOpening - previousExpected;
}
