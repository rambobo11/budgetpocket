"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import type { CategoryBreakdown } from "@/lib/kpis";
import type { Expense } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";

type CategoryBreakdownSectionProps = {
  byCategory: CategoryBreakdown[];
  expenses: Expense[];
};

function sortNewestFirst(expenses: Expense[]) {
  return [...expenses].sort((a, b) => {
    const byTime = b.created_at.localeCompare(a.created_at);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
}

export function CategoryBreakdownSection({
  byCategory,
  expenses,
}: CategoryBreakdownSectionProps) {
  const categoryKeys = byCategory.map((item) => item.category).join("|");
  const [openCategory, setOpenCategory] = useState<string | null>(
    () => byCategory[0]?.category ?? null
  );
  const { mask } = usePrivacy();

  useEffect(() => {
    setOpenCategory((current) => {
      if (current && categoryKeys.split("|").includes(current)) {
        return current;
      }
      return categoryKeys.split("|")[0] || null;
    });
  }, [categoryKeys]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const key = expense.category;
      const list = map.get(key);
      if (list) list.push(expense);
      else map.set(key, [expense]);
    }
    for (const [key, list] of map) {
      map.set(key, sortNewestFirst(list));
    }
    return map;
  }, [expenses]);

  if (byCategory.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Par catégorie
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Répartition du mois
          </p>
        </div>
        <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucune dépense ce mois-ci.
          <br />
          Importe ton historique ou ajoute via Ajout rapide.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Par catégorie
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Touche pour voir le détail · scroll dans la liste
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {byCategory.map((item) => {
          const isOpen = openCategory === item.category;
          const categoryExpenses =
            expensesByCategory.get(item.category) ?? [];

          return (
            <li key={item.category} className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenCategory((current) =>
                    current === item.category ? null : item.category
                  )
                }
                aria-expanded={isOpen}
                className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-zinc-50/80 active:bg-zinc-100/70 dark:hover:bg-zinc-800/40 dark:active:bg-zinc-800/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                        {item.category}
                      </p>
                      <ChevronDown
                        className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.count} dépense{item.count > 1 ? "s" : ""} ·{" "}
                      {item.percent.toFixed(0)}%
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {mask(formatEuro(item.amount))}
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
                    style={{ width: `${Math.max(item.percent, 2)}%` }}
                  />
                </div>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="relative border-t border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div
                      className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] scroll-smooth"
                      style={{
                        scrollbarGutter: "stable",
                      }}
                    >
                      {categoryExpenses.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          Aucune dépense dans cette catégorie.
                        </p>
                      ) : (
                        <ul className="divide-y divide-zinc-100/80 dark:divide-zinc-800/80">
                          {categoryExpenses.map((expense) => (
                            <li
                              key={expense.id}
                              className="flex items-start justify-between gap-3 px-5 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                  {expense.description?.trim() ||
                                    expense.category}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  <span>
                                    {formatInTimeZone(
                                      expense.created_at,
                                      APP_TIMEZONE,
                                      "d MMM · HH:mm",
                                      { locale: fr }
                                    )}
                                  </span>
                                  {expense.payment_method === "swile" ? (
                                    <span className="rounded bg-emerald-50 px-1 py-px text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-400">
                                      Swile
                                    </span>
                                  ) : expense.payment_method === "cash" ? (
                                    <span className="rounded bg-amber-50 px-1 py-px text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-300">
                                      Cash
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                                {mask(formatEuro(Number(expense.amount)))}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {categoryExpenses.length > 5 ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-zinc-50 to-transparent dark:from-zinc-950/80"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
