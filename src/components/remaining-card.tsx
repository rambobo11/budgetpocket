"use client";

import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { upsertUserBalancesAction } from "@/app/actions/balances";
import { usePrivacy } from "@/components/privacy-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/format";
import { budgetMonthInputValue } from "@/lib/incomes";
import { formatSignedEuro } from "@/lib/kpis";
import { parseDecimalInput } from "@/lib/number-input";
import {
  computeMonthRemaining,
  expectedClosing,
  openingGap,
  spentByCategory,
} from "@/lib/remaining";
import type {
  CategoryLimit,
  Expense,
  Income,
  UserBalances,
} from "@/lib/types";

type RemainingCardProps = {
  month: Date;
  expenses: Expense[];
  incomes: Income[];
  balances: UserBalances;
  previousExpenses: Expense[];
  previousIncomes: Income[];
  previousBalances: UserBalances;
  limits: CategoryLimit[];
  onBalancesChange: (balances: UserBalances) => void;
};

function formatBalanceInput(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(2).replace(".", ",");
}

function toggleSignedInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "-";
  if (/^[\u2212\u2010\u2011\u2012\u2013\u2014\uFE63\uFF0D-]/.test(trimmed)) {
    return trimmed.replace(
      /^[\u2212\u2010\u2011\u2012\u2013\u2014\uFE63\uFF0D-]+/,
      ""
    );
  }
  return `-${trimmed}`;
}

function GapLine({
  gap,
  previousLabel,
  mask,
}: {
  gap: number | null;
  previousLabel: string;
  mask: (value: string) => string;
}) {
  if (gap == null || Math.abs(gap) < 1) return null;

  return (
    <p
      className={`mt-2 text-xs ${
        gap < 0
          ? "text-rose-600 dark:text-rose-400"
          : "text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {mask(formatSignedEuro(gap))} vs prévu {previousLabel}
      {gap < 0 ? " — un truc a pu passer" : " — plus que prévu"}
    </p>
  );
}

export function RemainingCard({
  month,
  expenses,
  incomes,
  balances,
  previousExpenses,
  previousIncomes,
  previousBalances,
  limits,
  onBalancesChange,
}: RemainingCardProps) {
  const { mask } = usePrivacy();
  const remaining = computeMonthRemaining(incomes, expenses);
  const previousRemaining = computeMonthRemaining(
    previousIncomes,
    previousExpenses
  );
  const spent = spentByCategory(expenses);
  const capped = limits
    .map((limit) => ({
      ...limit,
      spent: spent.get(limit.category) ?? 0,
    }))
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount);

  const bankExpected = expectedClosing(
    balances.bank_eur,
    remaining.salaryIn,
    remaining.salaryOut
  );
  const swileExpected = expectedClosing(
    balances.swile_eur,
    remaining.swileIn,
    remaining.swileOut
  );
  const previousBankExpected = expectedClosing(
    previousBalances.bank_eur,
    previousRemaining.salaryIn,
    previousRemaining.salaryOut
  );
  const previousSwileExpected = expectedClosing(
    previousBalances.swile_eur,
    previousRemaining.swileIn,
    previousRemaining.swileOut
  );
  const bankGap = openingGap(balances.bank_eur, previousBankExpected);
  const swileGap = openingGap(balances.swile_eur, previousSwileExpected);

  const bankShown = bankExpected ?? remaining.salaryLeft;
  const swileShown = swileExpected ?? remaining.swileMonthLeft;
  const previousMonthLabel = format(subMonths(month, 1), "MMMM", {
    locale: fr,
  });

  const [bankInput, setBankInput] = useState(() =>
    formatBalanceInput(balances.bank_eur)
  );
  const [swileInput, setSwileInput] = useState(() =>
    formatBalanceInput(balances.swile_eur)
  );
  const [saving, setSaving] = useState<"bank" | "swile" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBankInput(formatBalanceInput(balances.bank_eur));
    setSwileInput(formatBalanceInput(balances.swile_eur));
  }, [balances.bank_eur, balances.swile_eur, balances.budget_month]);

  async function saveField(field: "bank" | "swile", raw: string) {
    setError(null);
    const trimmed = raw.trim();
    let value: number | null = null;

    if (trimmed !== "") {
      const parsed = parseDecimalInput(trimmed);
      if (!Number.isFinite(parsed)) {
        setError("Montant invalide.");
        return;
      }
      value = parsed;
    }

    const current = field === "bank" ? balances.bank_eur : balances.swile_eur;
    if (current === value) return;

    setSaving(field);
    const result = await upsertUserBalancesAction({
      budgetMonth: budgetMonthInputValue(month),
      ...(field === "bank" ? { bankEur: value } : { swileEur: value }),
    });
    setSaving(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onBalancesChange(result.data);
  }

  const bankPositive = bankShown >= 0;

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Reste prévu · banque
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
              bankPositive
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {mask(formatEuro(bankShown))}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {balances.bank_eur != null
              ? `${mask(formatEuro(balances.bank_eur))} au 1er + ${mask(formatEuro(remaining.salaryIn))} − ${mask(formatEuro(remaining.salaryOut))} CB/cash`
              : `${mask(formatEuro(remaining.salaryIn))} hors Swile − ${mask(formatEuro(remaining.salaryOut))} CB/cash`}
          </p>
          {balances.bank_eur == null ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Mets le solde au 1er du mois pour coller au compte.
            </p>
          ) : null}
          <GapLine
            gap={bankGap}
            previousLabel={previousMonthLabel}
            mask={mask}
          />
        </div>

        <div>
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Reste prévu · Swile
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
              swileShown >= 0
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {mask(formatEuro(swileShown))}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {balances.swile_eur != null
              ? `${mask(formatEuro(balances.swile_eur))} au 1er + ${mask(formatEuro(remaining.swileIn))} − ${mask(formatEuro(remaining.swileOut))}`
              : `Reçu ${mask(formatEuro(remaining.swileIn))} · dépensé ${mask(formatEuro(remaining.swileOut))}`}
          </p>
          {balances.swile_eur == null ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Mets le solde Swile au 1er, et le Swile du mois dans Revenus.
            </p>
          ) : null}
          <GapLine
            gap={swileGap}
            previousLabel={previousMonthLabel}
            mask={mask}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="bank-balance"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Banque au 1er
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Passer en négatif"
              onClick={() => {
                const next = toggleSignedInput(bankInput);
                setBankInput(next);
                void saveField("bank", next);
              }}
              className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              +/−
            </button>
            <div className="relative min-w-0 flex-1">
              <Input
                id="bank-balance"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={bankInput}
                onChange={(e) => setBankInput(e.target.value)}
                onBlur={() => void saveField("bank", bankInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Ce qu’il restait"
                className="h-12 rounded-xl border-zinc-200 bg-zinc-50/80 pr-10 text-base tabular-nums shadow-none dark:border-zinc-700 dark:bg-zinc-950/60"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-zinc-400">
                {saving === "bank" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "€"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="swile-balance"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Swile au 1er
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Passer en négatif"
              onClick={() => {
                const next = toggleSignedInput(swileInput);
                setSwileInput(next);
                void saveField("swile", next);
              }}
              className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              +/−
            </button>
            <div className="relative min-w-0 flex-1">
              <Input
                id="swile-balance"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={swileInput}
                onChange={(e) => setSwileInput(e.target.value)}
                onBlur={() => void saveField("swile", swileInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Ce qu’il y avait"
                className="h-12 rounded-xl border-zinc-200 bg-zinc-50/80 pr-10 text-base tabular-nums shadow-none dark:border-zinc-700 dark:bg-zinc-950/60"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-zinc-400">
                {saving === "swile" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "€"
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {capped.length > 0 ? (
        <div className="mt-5 flex flex-col gap-2.5">
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Plafonds
          </p>
          {capped.map((item) => {
            const ratio = item.amount > 0 ? item.spent / item.amount : 0;
            const over = item.spent > item.amount;
            return (
              <div key={item.category}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    {item.category}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      over
                        ? "font-medium text-rose-600 dark:text-rose-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {mask(formatEuro(item.spent))} / {mask(formatEuro(item.amount))}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      over
                        ? "bg-rose-500"
                        : "bg-zinc-900 dark:bg-zinc-100"
                    }`}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
