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
import type { Expense } from "@/lib/types";
import { currentMonthStart, nowInAppTz } from "@/lib/date";
import { fetchExpensesForMonth } from "@/lib/expenses";
import { formatEuro } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { QuickAddForm } from "@/components/quick-add-form";
import { ExpenseList } from "@/components/expense-list";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

type DashboardProps = {
  initialExpenses: Expense[];
};

export function Dashboard({ initialExpenses }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthStart());
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const { mask } = usePrivacy();

  useEffect(() => {
    const now = currentMonthStart();
    if (isSameMonth(selectedMonth, now)) {
      setExpenses(initialExpenses);
      return;
    }

    startTransition(async () => {
      const data = await fetchExpensesForMonth(selectedMonth);
      setExpenses(data);
    });
  }, [selectedMonth, initialExpenses]);

  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: fr });
  const canGoNext = !isSameMonth(selectedMonth, nowInAppTz());
  const monthTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  function handleExpenseAdded(expense: Expense) {
    setExpenses((previous) =>
      [expense, ...previous]
        .sort((a, b) => {
          const byTime = b.created_at.localeCompare(a.created_at);
          if (byTime !== 0) return byTime;
          return b.id.localeCompare(a.id);
        })
        .slice(0, 100)
    );
  }

  function handleExpenseDeleted(id: string) {
    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
  }

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
          <p className="mt-1.5 pl-8 text-sm text-zinc-500 tabular-nums sm:pl-9 dark:text-zinc-400">
            {mask(formatEuro(monthTotal))}
            <span className="text-zinc-300 dark:text-zinc-600"> · </span>
            {expenses.length} dépense{expenses.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <PrivacyToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <div
        className={`grid grid-cols-1 items-start gap-5 transition-opacity md:grid-cols-2 md:gap-8 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <div className="md:sticky md:top-8">
          <QuickAddForm
            selectedMonth={selectedMonth}
            onExpenseAdded={handleExpenseAdded}
          />
        </div>
        <ExpenseList
          expenses={expenses}
          onExpenseDeleted={handleExpenseDeleted}
        />
      </div>
    </PageShell>
  );
}
