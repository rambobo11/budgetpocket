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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Income } from "@/lib/types";
import { canGoToNextMonth, currentMonthStart } from "@/lib/date";
import { budgetMonthKey, fetchIncomesForMonth } from "@/lib/incomes";
import { AppHeader } from "@/components/app-header";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { IncomeForm } from "@/components/income-form";
import { IncomeList } from "@/components/income-list";
import { Button } from "@/components/ui/button";
import { QueryErrorBanner } from "@/components/query-error-banner";
import { QUERY_LOAD_ERROR } from "@/lib/supabase/query";

type IncomesViewProps = {
  initialIncomes: Income[];
};

export function IncomesView({ initialIncomes }: IncomesViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthStart());
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const now = currentMonthStart();
    if (isSameMonth(selectedMonth, now)) {
      setIncomes(initialIncomes);
      setLoadError(null);
      return;
    }

    startTransition(async () => {
      setLoadError(null);
      try {
        const data = await fetchIncomesForMonth(selectedMonth);
        setIncomes(data);
      } catch {
        setLoadError(QUERY_LOAD_ERROR);
      }
    });
  }, [selectedMonth, initialIncomes]);

  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: fr });
  const canGoNext = canGoToNextMonth(selectedMonth);

  function handleIncomeAdded(income: Income) {
    const selectedKey = budgetMonthKey(selectedMonth);
    const incomeKey = income.budget_month.slice(0, 10);
    if (incomeKey !== selectedKey) return;
    setIncomes((previous) => [income, ...previous]);
  }

  function handleIncomeDeleted(id: string) {
    setIncomes((previous) => previous.filter((income) => income.id !== id));
  }

  function handleIncomeUpdated(income: Income) {
    const selectedKey = budgetMonthKey(selectedMonth);
    const incomeKey = income.budget_month.slice(0, 10);

    if (incomeKey !== selectedKey) {
      setIncomes((previous) => previous.filter((item) => item.id !== income.id));
      return;
    }

    setIncomes((previous) =>
      previous.map((item) => (item.id === income.id ? income : item))
    );
  }

  return (
    <PageShell>
      <AppHeader
        title={
          <div className="flex items-center gap-0.5 sm:gap-1">
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
        }
      />

      <AppNav />

      <QueryErrorBanner className="mb-4" message={loadError} />

      <div
        className={`grid min-w-0 grid-cols-1 items-start gap-5 transition-opacity md:grid-cols-2 md:gap-8 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <div className="md:sticky md:top-8">
          <IncomeForm
            selectedMonth={selectedMonth}
            onIncomeAdded={handleIncomeAdded}
          />
        </div>
        <IncomeList
          incomes={incomes}
          onIncomeDeleted={handleIncomeDeleted}
          onIncomeUpdated={handleIncomeUpdated}
        />
      </div>
    </PageShell>
  );
}
