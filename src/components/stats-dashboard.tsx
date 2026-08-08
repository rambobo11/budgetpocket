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
import { ChevronLeft, ChevronRight, CreditCard, Utensils } from "lucide-react";
import type { Expense } from "@/lib/types";
import { nowInAppTz } from "@/lib/date";
import { fetchExpensesForMonth } from "@/lib/expenses";
import { computeMonthKpis, formatEuro } from "@/lib/kpis";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

type StatsDashboardProps = {
  initialExpenses: Expense[];
  initialMonthIso: string;
};

export function StatsDashboard({
  initialExpenses,
  initialMonthIso,
}: StatsDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    () => startOfMonth(new Date(initialMonthIso))
  );
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const initial = startOfMonth(new Date(initialMonthIso));
    if (isSameMonth(selectedMonth, initial)) {
      setExpenses(initialExpenses);
      return;
    }

    startTransition(async () => {
      const data = await fetchExpensesForMonth(selectedMonth);
      setExpenses(data);
    });
  }, [selectedMonth, initialExpenses, initialMonthIso]);

  const kpis = computeMonthKpis(expenses);
  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: fr });
  const canGoNext = !isSameMonth(selectedMonth, nowInAppTz());
  const { mask } = usePrivacy();

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
        className={`grid grid-cols-1 gap-4 transition-opacity md:grid-cols-5 md:gap-8 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <div className="flex flex-col gap-4 md:col-span-2">
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
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {kpis.count} dépense{kpis.count > 1 ? "s" : ""}
              {kpis.count > 0
                ? ` · ${mask(formatEuro(kpis.dailyAverage))} / jour actif`
                : ""}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
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
                {kpis.swileCount} dépense{kpis.swileCount > 1 ? "s" : ""}
              </p>
            </section>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:col-span-3">
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
