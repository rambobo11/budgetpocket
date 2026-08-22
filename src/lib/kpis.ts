import {
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
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
  cashTotal: number;
  cbCount: number;
  swileCount: number;
  cashCount: number;
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
  cashSharePercent: number | null;
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
  let cashTotal = 0;
  let cbCount = 0;
  let swileCount = 0;
  let cashCount = 0;

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const method = (expense.payment_method ?? "cb") as PaymentMethod;

    if (method === "swile") {
      swileTotal += amount;
      swileCount += 1;
    } else if (method === "cash") {
      cashTotal += amount;
      cashCount += 1;
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
    cashTotal,
    cbCount,
    swileCount,
    cashCount,
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
  const cashSharePercent =
    kpis.total > 0 ? (kpis.cashTotal / kpis.total) * 100 : null;

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
    cashSharePercent,
    projectedTotal,
    daysElapsed,
    daysInMonth,
  };
}

export type ExpensePacePoint = {
  day: number;
  /** Dépense du jour (mois sélectionné). */
  currentDaily: number;
  currentCumulative: number;
  previousCumulative: number;
};

export type ExpensePaceSeries = {
  points: ExpensePacePoint[];
  currentAtDate: number;
  previousAtDate: number;
  deltaAtDate: number;
  isEmpty: boolean;
  currentLabel: string;
  previousLabel: string;
};

/** Totaux journaliers indexés 0 → day-1 pour un mois calendaire. */
function dailyExpenseTotals(month: Date, expenses: Expense[]): number[] {
  const daysInMonth = endOfMonth(month).getDate();
  const totals = Array.from({ length: daysInMonth }, () => 0);
  const key = budgetMonthKey(month);

  for (const expense of expenses) {
    if (expenseMonthKey(expense.created_at) !== key) continue;
    const zoned = toZonedTime(new Date(expense.created_at), APP_TIMEZONE);
    const day = zoned.getDate();
    if (day < 1 || day > daysInMonth) continue;
    totals[day - 1] += Number(expense.amount);
  }

  return totals;
}

/**
 * Cumul jour par jour du mois sélectionné vs même jour du mois précédent.
 * Mois courant : tronqué à aujourd’hui (Europe/Paris).
 */
export function computeExpensePaceSeries(
  month: Date,
  currentExpenses: Expense[],
  previousExpenses: Expense[]
): ExpensePaceSeries {
  const selected = startOfMonth(month);
  const previous = startOfMonth(subMonths(selected, 1));
  const now = nowInAppTz();
  const isCurrent = isSameMonth(selected, now);
  const daysInSelected = endOfMonth(selected).getDate();
  const endDay = isCurrent
    ? Math.min(Math.max(now.getDate(), 1), daysInSelected)
    : daysInSelected;

  const currentDaily = dailyExpenseTotals(selected, currentExpenses);
  const previousDaily = dailyExpenseTotals(previous, previousExpenses);
  const previousDays = previousDaily.length;

  const points: ExpensePacePoint[] = [];
  let currentSum = 0;
  let previousSum = 0;

  for (let day = 1; day <= endDay; day++) {
    currentSum += currentDaily[day - 1] ?? 0;
    if (day <= previousDays) {
      previousSum += previousDaily[day - 1] ?? 0;
    }
    points.push({
      day,
      currentDaily: currentDaily[day - 1] ?? 0,
      currentCumulative: currentSum,
      previousCumulative: previousSum,
    });
  }

  const currentAtDate = points.at(-1)?.currentCumulative ?? 0;
  const previousAtDate = points.at(-1)?.previousCumulative ?? 0;
  const isEmpty = currentAtDate === 0 && previousAtDate === 0;

  return {
    points,
    currentAtDate,
    previousAtDate,
    deltaAtDate: currentAtDate - previousAtDate,
    isEmpty,
    currentLabel: format(selected, "MMMM yyyy", { locale: fr }),
    previousLabel: format(previous, "MMMM yyyy", { locale: fr }),
  };
}
