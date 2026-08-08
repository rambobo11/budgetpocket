import {
  addMonths,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { currentMonthStart } from "@/lib/date";
import { budgetMonthKey } from "@/lib/incomes";
import type { Income, IncomeSource } from "@/lib/types";
import {
  computePatrimoineKpis,
  type AssetTypeBreakdown,
  type PatrimoineKpis,
} from "@/lib/assets";
import type { Asset } from "@/lib/types";

export type IncomeSourceBreakdown = {
  source: string;
  amount: number;
  count: number;
  percent: number;
};

export type MonthIncomeSummary = {
  month: Date;
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  bySource: IncomeSourceBreakdown[];
};

export type IncomeMonthKpis = {
  current: MonthIncomeSummary;
  previous: MonthIncomeSummary;
  delta: number;
  deltaPercent: number | null;
};

export type PatrimoineSynthèse = {
  patrimoine: PatrimoineKpis;
  allocation: AssetTypeBreakdown[];
  income: IncomeMonthKpis;
  history: MonthIncomeSummary[];
  expensesTotal: number;
  savings: number;
  savingsRate: number | null;
};

export function summarizeIncomesForMonth(
  month: Date,
  incomes: Income[]
): MonthIncomeSummary {
  const total = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const map = new Map<string, { amount: number; count: number }>();

  for (const income of incomes) {
    const source = income.source || "Autres";
    const current = map.get(source) ?? { amount: 0, count: 0 };
    current.amount += Number(income.amount);
    current.count += 1;
    map.set(source, current);
  }

  const bySource: IncomeSourceBreakdown[] = [...map.entries()]
    .map(([source, value]) => ({
      source,
      amount: value.amount,
      count: value.count,
      percent: total > 0 ? (value.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month: startOfMonth(month),
    key: budgetMonthKey(month),
    label: format(startOfMonth(month), "MMMM yyyy", { locale: fr }),
    shortLabel: format(startOfMonth(month), "MMM yy", { locale: fr }),
    total,
    bySource,
  };
}

export function computeIncomeMonthKpis(
  month: Date,
  currentIncomes: Income[],
  previousIncomes: Income[]
): IncomeMonthKpis {
  const current = summarizeIncomesForMonth(month, currentIncomes);
  const previous = summarizeIncomesForMonth(
    subMonths(month, 1),
    previousIncomes
  );
  const delta = current.total - previous.total;
  const deltaPercent =
    previous.total > 0 ? (delta / previous.total) * 100 : null;

  return { current, previous, delta, deltaPercent };
}

export async function fetchIncomesBetween(
  fromMonth: Date,
  toMonth: Date
): Promise<Income[]> {
  const supabase = createClient();
  const fromKey = budgetMonthKey(fromMonth);
  const toKey = budgetMonthKey(toMonth);

  const { data } = await supabase
    .from("incomes")
    .select("*")
    .gte("budget_month", fromKey)
    .lte("budget_month", toKey)
    .order("budget_month", { ascending: true })
    .limit(1000);

  return (data ?? []) as Income[];
}

export function buildIncomeHistory(
  months: Date[],
  incomes: Income[]
): MonthIncomeSummary[] {
  return months.map((month) => {
    const key = budgetMonthKey(month);
    const monthIncomes = incomes.filter(
      (income) => income.budget_month.slice(0, 10) === key
    );
    return summarizeIncomesForMonth(month, monthIncomes);
  });
}

export function lastNMonths(count: number, end: Date = currentMonthStart()): Date[] {
  const endMonth = startOfMonth(end);
  return Array.from({ length: count }, (_, index) =>
    startOfMonth(subMonths(endMonth, count - 1 - index))
  );
}

export function computePatrimoineSynthèse(input: {
  assets: Asset[];
  month: Date;
  currentIncomes: Income[];
  previousIncomes: Income[];
  historyIncomes: Income[];
  expensesTotal: number;
  historyMonths?: number;
}): PatrimoineSynthèse {
  const patrimoine = computePatrimoineKpis(input.assets);
  const income = computeIncomeMonthKpis(
    input.month,
    input.currentIncomes,
    input.previousIncomes
  );
  const months = lastNMonths(input.historyMonths ?? 6, input.month);
  const history = buildIncomeHistory(months, input.historyIncomes);
  const savings = income.current.total - input.expensesTotal;
  const savingsRate =
    income.current.total > 0
      ? (savings / income.current.total) * 100
      : null;

  return {
    patrimoine,
    allocation: patrimoine.byType,
    income,
    history,
    expensesTotal: input.expensesTotal,
    savings,
    savingsRate,
  };
}

export function formatSignedEuro(amount: number) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    signDisplay: "exceptZero",
  }).format(amount);
  return formatted;
}

export function formatSignedPercent(value: number) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);
  return `${formatted} %`;
}

export type { IncomeSource };
