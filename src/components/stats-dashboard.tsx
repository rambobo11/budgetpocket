"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import type { Expense, Income } from "@/lib/types";
import { nowInAppTz } from "@/lib/date";
import { fetchExpensesBetween, fetchExpensesForMonth } from "@/lib/expenses";
import { fetchIncomesForMonth } from "@/lib/incomes";
import {
  computeExpenseDelta,
  computeExpenseHistory,
  computeExpenseInsights,
  computeMonthKpis,
  formatEuro,
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/kpis";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { CashflowSankey } from "@/components/cashflow-sankey";
import { Button } from "@/components/ui/button";

type StatsDashboardProps = {
  initialExpenses: Expense[];
  initialIncomes: Income[];
  initialMonthIso: string;
};

export function StatsDashboard({
  initialExpenses,
  initialIncomes,
  initialMonthIso,
}: StatsDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    () => startOfMonth(new Date(initialMonthIso))
  );
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [historyExpenses, setHistoryExpenses] =
    useState<Expense[]>(initialExpenses);
  const [previousExpenses, setPreviousExpenses] = useState<Expense[]>([]);
  const [isPending, startTransition] = useTransition();
  const { mask } = usePrivacy();

  useEffect(() => {
    const initial = startOfMonth(new Date(initialMonthIso));
    const historyStart = subMonths(selectedMonth, 5);
    const previousMonth = subMonths(selectedMonth, 1);

    startTransition(async () => {
      if (isSameMonth(selectedMonth, initial)) {
        setExpenses(initialExpenses);
        setIncomes(initialIncomes);
      } else {
        const [monthExpenses, monthIncomes] = await Promise.all([
          fetchExpensesForMonth(selectedMonth),
          fetchIncomesForMonth(selectedMonth),
        ]);
        setExpenses(monthExpenses);
        setIncomes(monthIncomes);
      }

      const [history, previous] = await Promise.all([
        fetchExpensesBetween(historyStart, selectedMonth),
        fetchExpensesForMonth(previousMonth),
      ]);
      setHistoryExpenses(history);
      setPreviousExpenses(previous);
    });
  }, [selectedMonth, initialExpenses, initialIncomes, initialMonthIso]);

  const kpis = computeMonthKpis(expenses);
  const previousKpis = computeMonthKpis(previousExpenses);
  const delta = computeExpenseDelta(kpis.total, previousKpis.total);
  const insights = computeExpenseInsights(selectedMonth, kpis);
  const history = computeExpenseHistory(selectedMonth, historyExpenses, 6);
  const maxHistory = Math.max(...history.map((item) => item.total), 1);
  const selectedKey = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const positiveDelta = delta.delta <= 0;
  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: fr });
  const canGoNext = !isSameMonth(selectedMonth, nowInAppTz());

  return (
    <PageShell>
      <header className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <div className="mt-1 flex items-center gap-0.5 sm:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setSelectedMonth((m) => startOfMonth(subMonths(m, 1)))
              }
              className="size-8 shrink-0 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-zinc-900 capitalize sm:text-2xl md:text-3xl dark:text-zinc-50">
              {monthLabel}
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canGoNext}
              onClick={() =>
                setSelectedMonth((m) => startOfMonth(addMonths(m, 1)))
              }
              className="size-8 shrink-0 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Mois suivant"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <PrivacyToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <div
        className={`flex flex-col gap-4 transition-opacity md:gap-6 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Total du mois
            </p>
            <PrivacyToggle prominent />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-4xl dark:text-zinc-50">
            {mask(formatEuro(kpis.total))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                positiveDelta
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
              }`}
            >
              {positiveDelta ? (
                <TrendingDown className="size-3.5" />
              ) : (
                <TrendingUp className="size-3.5" />
              )}
              {mask(formatSignedEuro(delta.delta))}
              {delta.deltaPercent != null
                ? ` · ${formatSignedPercent(delta.deltaPercent)}`
                : ""}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              vs mois précédent
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {kpis.count} dépense{kpis.count > 1 ? "s" : ""}
            {kpis.count > 0
              ? ` · ${mask(formatEuro(kpis.dailyAverage))} / jour actif`
              : ""}
            {insights.projectedTotal != null
              ? ` · projection ${mask(formatEuro(insights.projectedTotal))}`
              : ""}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <section className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <CreditCard className="size-4" />
            </div>
            <p className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase">
              CB
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(kpis.cbTotal))}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {insights.cbSharePercent != null
                ? `${insights.cbSharePercent.toFixed(0)}% · `
                : ""}
              {kpis.cbCount} dépense{kpis.cbCount > 1 ? "s" : ""}
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Utensils className="size-4" />
            </div>
            <p className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase">
              Swile
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(kpis.swileTotal))}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {insights.swileSharePercent != null
                ? `${insights.swileSharePercent.toFixed(0)}% · `
                : ""}
              {kpis.swileCount} dépense{kpis.swileCount > 1 ? "s" : ""}
            </p>
          </section>

          <section className="col-span-2 rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
            <p className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase">
              Top catégorie
            </p>
            {insights.topCategory ? (
              <>
                <p className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {insights.topCategory.category}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-zinc-500">
                  {mask(formatEuro(insights.topCategory.amount))} ·{" "}
                  {insights.topCategory.percent.toFixed(0)}% du mois
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">Aucune dépense</p>
            )}
          </section>
        </div>

        <CashflowSankey incomes={incomes} expenses={expenses} />

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Évolution des dépenses
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">6 derniers mois</p>
          <div className="mt-4 flex h-40 items-end gap-2 sm:gap-3">
            {history.map((item) => {
              const height = Math.max(
                (item.total / maxHistory) * 100,
                item.total > 0 ? 6 : 2
              );
              const isSelected = item.key === selectedKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedMonth(item.month)}
                  className="group flex min-w-0 flex-1 flex-col items-center gap-2"
                  title={`${item.label}: ${formatEuro(item.total)}`}
                >
                  <span className="text-[10px] font-medium tabular-nums text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 sm:text-[11px]">
                    {mask(formatEuro(item.total))}
                  </span>
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-full max-w-[2.5rem] rounded-t-lg transition-colors ${
                        isSelected
                          ? "bg-zinc-900 dark:bg-zinc-100"
                          : "bg-zinc-200 group-hover:bg-zinc-300 dark:bg-zinc-700 dark:group-hover:bg-zinc-600"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] capitalize sm:text-xs ${
                      isSelected
                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-400"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Par catégorie
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Répartition du mois
            </p>
          </div>

          {kpis.byCategory.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              Aucune dépense ce mois-ci.
              <br />
              Importe ton historique ou ajoute via Quick Add.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {kpis.byCategory.map((item) => (
                <li key={item.category} className="px-5 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                        {item.category}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.count} · {item.percent.toFixed(0)}%
                      </p>
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {mask(formatEuro(item.amount))}
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                      style={{ width: `${Math.max(item.percent, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
