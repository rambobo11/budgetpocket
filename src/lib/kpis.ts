import {
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import type { Category, Expense, PaymentMethod } from "@/lib/types";
import { APP_TIMEZONE, nowInAppTz } from "@/lib/date";
import { budgetMonthKey } from "@/lib/incomes";
import { lastNMonths } from "@/lib/patrimoine-analytics";

export { formatEuro } from "@/lib/format";
export {
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/patrimoine-analytics";

export type CategoryBreakdown = {
  category: Category | string;
  amount: number;
  count: number;
  percent: number;
};

export type MonthKpis = {
  total: number;
  count: number;
  cbTotal: number;
  swileTotal: number;
  cbCount: number;
  swileCount: number;
  byCategory: CategoryBreakdown[];
  dailyAverage: number;
};

export type MonthExpenseSummary = {
  month: Date;
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  count: number;
};

export type ExpenseMonthDelta = {
  delta: number;
  deltaPercent: number | null;
  previousTotal: number;
};

export type ExpenseInsights = {
  topCategory: CategoryBreakdown | null;
  cbSharePercent: number | null;
  swileSharePercent: number | null;
  /** Projection fin de mois (mois courant uniquement). */
  projectedTotal: number | null;
  daysElapsed: number;
  daysInMonth: number;
};

export function computeMonthKpis(expenses: Expense[]): MonthKpis {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const count = expenses.length;

  let cbTotal = 0;
  let swileTotal = 0;
  let cbCount = 0;
  let swileCount = 0;

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const method = (expense.payment_method ?? "cb") as PaymentMethod;

    if (method === "swile") {
      swileTotal += amount;
      swileCount += 1;
    } else {
      cbTotal += amount;
      cbCount += 1;
    }

    const current = categoryMap.get(expense.category) ?? {
      amount: 0,
      count: 0,
    };
    current.amount += amount;
    current.count += 1;
    categoryMap.set(expense.category, current);
  }

  const byCategory: CategoryBreakdown[] = [...categoryMap.entries()]
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      percent: total > 0 ? (value.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const uniqueDays = new Set(
    expenses.map((e) => {
      const zoned = toZonedTime(new Date(e.created_at), APP_TIMEZONE);
      return format(zoned, "yyyy-MM-dd");
    })
  ).size;

  return {
    total,
    count,
    cbTotal,
    swileTotal,
    cbCount,
    swileCount,
    byCategory,
    dailyAverage: uniqueDays > 0 ? total / uniqueDays : 0,
  };
}

export function expenseMonthKey(createdAt: string): string {
  const zoned = toZonedTime(new Date(createdAt), APP_TIMEZONE);
  return budgetMonthKey(zoned);
}

export function summarizeExpensesForMonth(
  month: Date,
  expenses: Expense[]
): MonthExpenseSummary {
  const key = budgetMonthKey(month);
  const monthExpenses = expenses.filter(
    (expense) => expenseMonthKey(expense.created_at) === key
  );
  const total = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    month: startOfMonth(month),
    key,
    label: format(startOfMonth(month), "MMMM yyyy", { locale: fr }),
    shortLabel: format(startOfMonth(month), "MMM yy", { locale: fr }),
    total,
    count: monthExpenses.length,
  };
}

export function buildExpenseHistory(
  months: Date[],
  expenses: Expense[]
): MonthExpenseSummary[] {
  return months.map((month) => summarizeExpensesForMonth(month, expenses));
}

export function computeExpenseHistory(
  endMonth: Date,
  expenses: Expense[],
  monthsCount = 6
): MonthExpenseSummary[] {
  return buildExpenseHistory(lastNMonths(monthsCount, endMonth), expenses);
}

export function computeExpenseDelta(
  currentTotal: number,
  previousTotal: number
): ExpenseMonthDelta {
  const delta = currentTotal - previousTotal;
  const deltaPercent =
    previousTotal > 0 ? (delta / previousTotal) * 100 : null;
  return { delta, deltaPercent, previousTotal };
}

export function computeExpenseInsights(
  month: Date,
  kpis: MonthKpis
): ExpenseInsights {
  const topCategory = kpis.byCategory[0] ?? null;
  const cbSharePercent =
    kpis.total > 0 ? (kpis.cbTotal / kpis.total) * 100 : null;
  const swileSharePercent =
    kpis.total > 0 ? (kpis.swileTotal / kpis.total) * 100 : null;

  const daysInMonth = endOfMonth(month).getDate();
  const now = nowInAppTz();
  const isCurrent = isSameMonth(month, now);
  const daysElapsed = isCurrent
    ? Math.max(now.getDate(), 1)
    : daysInMonth;

  const projectedTotal =
    isCurrent && kpis.total > 0
      ? (kpis.total / daysElapsed) * daysInMonth
      : null;

  return {
    topCategory,
    cbSharePercent,
    swileSharePercent,
    projectedTotal,
    daysElapsed,
    daysInMonth,
  };
}
