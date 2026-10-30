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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { upsertCategoryLimitAction } from "@/app/actions/category-limits";
import { AppHeader } from "@/components/app-header";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { QueryErrorBanner } from "@/components/query-error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/components/privacy-provider";
import { currentMonthStart, nowInAppTz } from "@/lib/date";
import { fetchExpensesForMonth } from "@/lib/expenses";
import { formatEuro } from "@/lib/format";
import { parseDecimalInput } from "@/lib/number-input";
import { spentByCategory } from "@/lib/remaining";
import { QUERY_LOAD_ERROR } from "@/lib/supabase/query";
import { CATEGORIES, type Category, type CategoryLimit, type Expense } from "@/lib/types";

type CategoryLimitsViewProps = {
  initialLimits: CategoryLimit[];
  initialExpenses: Expense[];
};

function formatLimitInput(value: number | undefined): string {
  if (value == null) return "";
  return value.toFixed(2).replace(".", ",");
}

export function CategoryLimitsView({
  initialLimits,
  initialExpenses,
}: CategoryLimitsViewProps) {
  const { mask } = usePrivacy();
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthStart());
  const [limits, setLimits] = useState(initialLimits);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const limit of initialLimits) {
      next[limit.category] = formatLimitInput(limit.amount);
    }
    return next;
  });
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const now = currentMonthStart();
    if (isSameMonth(selectedMonth, now)) {
      setExpenses(initialExpenses);
      setLoadError(null);
      return;
    }

    startTransition(async () => {
      setLoadError(null);
      try {
        setExpenses(await fetchExpensesForMonth(selectedMonth));
      } catch {
        setLoadError(QUERY_LOAD_ERROR);
      }
    });
  }, [selectedMonth, initialExpenses]);

  useEffect(() => {
    setLimits(initialLimits);
    const next: Record<string, string> = {};
    for (const limit of initialLimits) {
      next[limit.category] = formatLimitInput(limit.amount);
    }
    setDrafts(next);
  }, [initialLimits]);

  const spent = spentByCategory(expenses);
  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: fr });
  const canGoNext = !isSameMonth(selectedMonth, nowInAppTz());

  async function saveCategory(category: Category) {
    const raw = (drafts[category] ?? "").trim();
    const existing = limits.find((item) => item.category === category);
    let amount: number | null = null;

    if (raw !== "") {
      const parsed = parseDecimalInput(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Montant invalide. Vide = pas de plafond.");
        return;
      }
      amount = parsed;
    }

    if (amount == null && !existing) return;
    if (existing && amount != null && existing.amount === amount) return;

    setError(null);
    setSavingCategory(category);
    const result = await upsertCategoryLimitAction({ category, amount });
    setSavingCategory(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLimits((previous) => {
      const without = previous.filter((item) => item.category !== category);
      if (!result.data.limit) return without;
      return [...without, result.data.limit];
    });
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
              Limites
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
        subtitle="Un montant = plafond du mois. Vide = pas de limite."
      />

      <AppNav />

      <QueryErrorBanner className="mb-4" message={loadError} />
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}

      <p className="mb-3 text-sm text-zinc-500 capitalize dark:text-zinc-400">
        Dépensé en {monthLabel}
      </p>

      <section
        className={`overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        {CATEGORIES.map((category, index) => {
          const limit = limits.find((item) => item.category === category);
          const used = spent.get(category) ?? 0;
          const over = limit != null && used > limit.amount;
          const ratio =
            limit && limit.amount > 0 ? Math.min(1, used / limit.amount) : 0;

          return (
            <div
              key={category}
              className={`flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                index > 0
                  ? "border-t border-zinc-100 dark:border-zinc-800"
                  : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {category}
                </p>
                {limit ? (
                  <div className="mt-1.5">
                    <p
                      className={`text-xs tabular-nums ${
                        over
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {mask(formatEuro(used))} / {mask(formatEuro(limit.amount))}
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full ${
                          over
                            ? "bg-rose-500"
                            : "bg-zinc-900 dark:bg-zinc-100"
                        }`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                ) : used > 0 ? (
                  <p className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                    {mask(formatEuro(used))} ce mois · pas de plafond
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-zinc-400">Pas de plafond</p>
                )}
              </div>
              <div className="relative w-full sm:w-36">
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={drafts[category] ?? ""}
                  onChange={(e) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [category]: e.target.value,
                    }))
                  }
                  onBlur={() => void saveCategory(category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder="—"
                  aria-label={`Plafond ${category}`}
                  className="h-11 rounded-xl border-zinc-200 bg-zinc-50/80 pr-8 text-right tabular-nums shadow-none dark:border-zinc-700 dark:bg-zinc-950/60"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-zinc-400">
                  {savingCategory === category ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "€"
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </PageShell>
  );
}
