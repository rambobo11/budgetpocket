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
  Landmark,
  PiggyBank,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Asset, Credit, Expense, Income } from "@/lib/types";
import { formatEuro } from "@/lib/assets";
import { currentMonthStart, nowInAppTz } from "@/lib/date";
import { fetchExpensesBetween, fetchExpensesForMonth } from "@/lib/expenses";
import { fetchIncomesForMonth } from "@/lib/incomes";
import {
  buildIncomeHistory,
  computeIncomeMonthKpis,
  computePatrimoineSynthèse,
  fetchIncomesBetween,
  formatSignedEuro,
  formatSignedPercent,
  lastNMonths,
} from "@/lib/patrimoine-analytics";
import { computeWealthKpis } from "@/lib/wealth-kpis";
import { usePrivacy } from "@/components/privacy-provider";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { Button } from "@/components/ui/button";

type PatrimoineDashboardProps = {
  assets: Asset[];
  credits: Credit[];
};

const SOURCE_COLORS = [
  "bg-zinc-900 dark:bg-zinc-100",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-400",
];

export function PatrimoineDashboard({
  assets,
  credits,
}: PatrimoineDashboardProps) {
  const { mask } = usePrivacy();
  const [month, setMonth] = useState(() => currentMonthStart());
  const [currentIncomes, setCurrentIncomes] = useState<Income[]>([]);
  const [previousIncomes, setPreviousIncomes] = useState<Income[]>([]);
  const [historyIncomes, setHistoryIncomes] = useState<Income[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [runwayExpenses, setRunwayExpenses] = useState<Expense[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const previousMonth = subMonths(month, 1);
      const historyStart = subMonths(month, 5);
      const runwayStart = subMonths(month, 2);

      const [current, previous, history, expenses, runway] = await Promise.all([
        fetchIncomesForMonth(month),
        fetchIncomesForMonth(previousMonth),
        fetchIncomesBetween(historyStart, month),
        fetchExpensesForMonth(month),
        fetchExpensesBetween(runwayStart, month),
      ]);

      setCurrentIncomes(current);
      setPreviousIncomes(previous);
      setHistoryIncomes(history);
      setExpensesTotal(
        expenses.reduce((sum, item) => sum + Number(item.amount), 0)
      );
      setRunwayExpenses(runway);
    });
  }, [month]);

  const synthèse = computePatrimoineSynthèse({
    assets,
    month,
    currentIncomes,
    previousIncomes,
    historyIncomes,
    expensesTotal,
  });

  const wealth = computeWealthKpis({
    assets,
    credits,
    expenses: runwayExpenses,
    endMonth: month,
    expenseMonths: 3,
  });

  const incomeKpis = computeIncomeMonthKpis(
    month,
    currentIncomes,
    previousIncomes
  );
  const history = buildIncomeHistory(lastNMonths(6, month), historyIncomes);
  const maxHistory = Math.max(...history.map((item) => item.total), 1);
  const positiveDelta = synthèse.income.delta >= 0;
  const canGoNext = !isSameMonth(month, nowInAppTz());
  const monthLabel = format(month, "MMMM yyyy", { locale: fr });

  return (
    <section
      className={`mb-8 space-y-5 transition-opacity md:mb-10 md:space-y-6 ${isPending ? "opacity-70" : "opacity-100"}`}
    >
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Patrimoine brut
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-5xl dark:text-zinc-50">
              {mask(formatEuro(synthèse.patrimoine.total))}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {synthèse.patrimoine.count} actif
              {synthèse.patrimoine.count > 1 ? "s" : ""} · hors primes CSE
              {wealth.debtsEur > 0
                ? ` · net ${mask(formatEuro(wealth.netEur))}`
                : ""}
            </p>
          </div>
          <PrivacyToggle prominent />
        </div>

        {synthèse.allocation.length > 0 ? (
          <div className="mt-6">
            <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {synthèse.allocation.map((item, index) => (
                <div
                  key={item.type}
                  className={`${SOURCE_COLORS[index % SOURCE_COLORS.length]} h-full`}
                  style={{ width: `${Math.max(item.percent, 1)}%` }}
                  title={`${item.type} ${item.percent.toFixed(0)}%`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {synthèse.allocation.map((item, index) => (
                <div key={item.type} className="flex items-center gap-2 text-xs">
                  <span
                    className={`size-2.5 rounded-full ${SOURCE_COLORS[index % SOURCE_COLORS.length]}`}
                  />
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {item.type}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {mask(formatEuro(item.value))}
                  </span>
                  <span className="text-zinc-400">
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Wallet className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Liquidités
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(wealth.liquidEur))}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cash + MA
              {wealth.liquidPercent != null
                ? ` · ${wealth.liquidPercent.toFixed(0)}%`
                : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <TrendingUp className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Part investie
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {wealth.investedPercent == null
                ? "—"
                : `${wealth.investedPercent.toFixed(0)} %`}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {mask(formatEuro(wealth.investedEur))} · crypto / actions
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Target className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Concentration
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {wealth.topAssetPercent == null
                ? "—"
                : `${wealth.topAssetPercent.toFixed(0)} %`}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {wealth.topAssetName
                ? mask(wealth.topAssetName)
                : "Aucun actif"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Shield className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Filet de sécurité
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {wealth.runwayMonths == null
                ? "—"
                : `${wealth.runwayMonths.toFixed(1)} mois`}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              vs dépenses moy. {wealth.runwayMonthsSampled} mois
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 lg:col-span-1">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Landmark className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Patrimoine net
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(wealth.netEur))}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {wealth.debtsEur > 0
                ? `brut − ${mask(formatEuro(wealth.debtsEur))} de crédits`
                : "aucun crédit ouvert"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Revenus du mois
            </p>
            <div className="mt-1 flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => startOfMonth(subMonths(m, 1)))}
                className="size-8 rounded-full text-zinc-500"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <h2 className="min-w-0 truncate text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
                {monthLabel}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canGoNext}
                onClick={() => setMonth((m) => startOfMonth(addMonths(m, 1)))}
                className="size-8 rounded-full text-zinc-500 disabled:opacity-30"
                aria-label="Mois suivant"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
          {mask(formatEuro(incomeKpis.current.total))}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
              positiveDelta
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
            }`}
          >
            {positiveDelta ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {mask(formatSignedEuro(incomeKpis.delta))}
          </span>
          {incomeKpis.deltaPercent != null ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                positiveDelta
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
              }`}
            >
              {formatSignedPercent(incomeKpis.deltaPercent)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              vs mois précédent
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Wallet className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Dépenses
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(synthèse.expensesTotal))}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <PiggyBank className="size-4" />
            </div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Épargne du mois
            </p>
            <p
              className={`mt-1 text-lg font-semibold tabular-nums ${
                synthèse.savings >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {mask(formatSignedEuro(synthèse.savings))}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 md:col-span-1">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Taux d’épargne
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {synthèse.savingsRate == null
                ? "—"
                : `${synthèse.savingsRate.toFixed(0)} %`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Revenus − dépenses du mois
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Par source de revenu
          </p>
          {incomeKpis.current.bySource.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Aucun revenu sur ce mois budgétaire.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {incomeKpis.current.bySource.map((item, index) => (
                <li key={item.source}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {item.source}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {mask(formatEuro(item.amount))}
                      <span className="ml-2 font-normal text-zinc-400">
                        {item.percent.toFixed(0)}%
                      </span>
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${SOURCE_COLORS[index % SOURCE_COLORS.length]}`}
                      style={{ width: `${Math.max(item.percent, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Évolution des revenus
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">6 derniers mois</p>
          <div className="mt-4 flex h-40 items-end gap-2 sm:gap-3">
            {history.map((item) => {
              const height = Math.max(
                (item.total / maxHistory) * 100,
                item.total > 0 ? 6 : 2
              );
              const isSelected = item.key === incomeKpis.current.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMonth(item.month)}
                  className="group flex min-w-0 flex-1 flex-col items-center gap-2"
                  title={`${item.label}: ${mask(formatEuro(item.total))}`}
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
        </div>
      </div>
    </section>
  );
}
