import type { Category, Expense, PaymentMethod } from "@/lib/types";

export { formatEuro } from "@/lib/format";

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
    expenses.map((e) => new Date(e.created_at).toISOString().slice(0, 10))
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
