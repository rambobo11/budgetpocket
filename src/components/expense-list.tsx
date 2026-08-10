"use client";

import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { Loader2, Receipt, Trash2 } from "lucide-react";
import { deleteExpenseAction } from "@/app/actions/expenses";
import { APP_TIMEZONE } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";

type ExpenseListProps = {
  expenses: Expense[];
  onExpenseDeleted?: (id: string) => void;
  /** Nombre de dépenses visibles avant « Voir plus » */
  initialVisible?: number;
};

function sortExpensesNewestFirst(expenses: Expense[]) {
  return [...expenses].sort((a, b) => {
    const byTime = b.created_at.localeCompare(a.created_at);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
}

export function ExpenseList({
  expenses,
  onExpenseDeleted,
  initialVisible = 5,
}: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { mask } = usePrivacy();

  const sortedExpenses = useMemo(
    () => sortExpensesNewestFirst(expenses),
    [expenses]
  );

  const hasMore = sortedExpenses.length > initialVisible;
  const visibleExpenses =
    expanded || !hasMore
      ? sortedExpenses
      : sortedExpenses.slice(0, initialVisible);
  const hiddenCount = sortedExpenses.length - initialVisible;

  async function handleDelete(expense: Expense) {
    const label = expense.description
      ? `${expense.category} · ${expense.description}`
      : expense.category;

    const confirmed = window.confirm(
      `Supprimer cette dépense ?\n${label} — ${formatEuro(Number(expense.amount))}`
    );

    if (!confirmed) return;

    setDeletingId(expense.id);
    const result = await deleteExpenseAction({ id: expense.id });
    setDeletingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    onExpenseDeleted?.(expense.id);
  }

  if (sortedExpenses.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Receipt className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          Aucune dépense ce mois-ci
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoutez votre première dépense ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dépenses du mois
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {sortedExpenses.length} dépense{sortedExpenses.length > 1 ? "s" : ""}
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleExpenses.map((expense) => (
          <li
            key={expense.id}
            className="flex items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                  {expense.category}
                </p>
                {expense.payment_method === "swile" ? (
                  <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-400">
                    Swile
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {formatInTimeZone(
                  expense.created_at,
                  APP_TIMEZONE,
                  "d MMM yyyy · HH:mm",
                  { locale: fr }
                )}
                {expense.description ? ` · ${expense.description}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <p className="text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {mask(formatEuro(Number(expense.amount)))}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(expense)}
                disabled={deletingId === expense.id}
                className="size-9 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                aria-label="Supprimer la dépense"
              >
                {deletingId === expense.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="border-t border-zinc-100 px-4 py-3 sm:px-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="w-full rounded-xl py-2.5 text-center text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
          >
            {expanded
              ? "Voir moins"
              : `Voir plus (${hiddenCount} autre${hiddenCount > 1 ? "s" : ""})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
