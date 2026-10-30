"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { upsertUserBalancesAction } from "@/app/actions/balances";
import { usePrivacy } from "@/components/privacy-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/format";
import { parseDecimalInput } from "@/lib/number-input";
import {
  computeMonthRemaining,
  spentByCategory,
} from "@/lib/remaining";
import type {
  CategoryLimit,
  Expense,
  Income,
  UserBalances,
} from "@/lib/types";

type RemainingCardProps = {
  expenses: Expense[];
  incomes: Income[];
  balances: UserBalances;
  limits: CategoryLimit[];
  onBalancesChange: (balances: UserBalances) => void;
};

function formatBalanceInput(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(2).replace(".", ",");
}

export function RemainingCard({
  expenses,
  incomes,
  balances,
  limits,
  onBalancesChange,
}: RemainingCardProps) {
  const { mask } = usePrivacy();
  const remaining = computeMonthRemaining(incomes, expenses);
  const spent = spentByCategory(expenses);
  const capped = limits
    .map((limit) => ({
      ...limit,
      spent: spent.get(limit.category) ?? 0,
    }))
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount);

  const swileLeft =
    balances.swile_eur != null ? balances.swile_eur : remaining.swileMonthLeft;

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
  }, [balances.bank_eur, balances.swile_eur]);

  async function saveField(field: "bank" | "swile", raw: string) {
    setError(null);
    const trimmed = raw.trim();
    let value: number | null = null;

    if (trimmed !== "") {
      const parsed = parseDecimalInput(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Montant invalide.");
        return;
      }
      value = parsed;
    }

    const current = field === "bank" ? balances.bank_eur : balances.swile_eur;
    if (current === value) return;

    setSaving(field);
    const result = await upsertUserBalancesAction(
      field === "bank" ? { bankEur: value } : { swileEur: value }
    );
    setSaving(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onBalancesChange(result.data);
  }

  const salaryPositive = remaining.salaryLeft >= 0;

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Reste ce mois
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
              salaryPositive
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {mask(formatEuro(remaining.salaryLeft))}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mask(formatEuro(remaining.salaryIn))} hors Swile −{" "}
            {mask(formatEuro(remaining.salaryOut))} CB/cash
          </p>
          {remaining.salaryIn === 0 ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Ajoute salaire / CAF dans Revenus pour que le reste soit juste.
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Il reste sur Swile
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {mask(formatEuro(swileLeft))}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Reçu {mask(formatEuro(remaining.swileIn))} · dépensé{" "}
            {mask(formatEuro(remaining.swileOut))}
          </p>
          {remaining.swileIn === 0 ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Ajoute le Swile du mois dans Revenus, et le solde de la carte
              ci-dessous.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="bank-balance"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Compte bancaire
          </Label>
          <div className="relative">
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
              placeholder="Solde actuel"
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

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="swile-balance"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Sur la carte Swile
          </Label>
          <div className="relative">
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
              placeholder="Ce qu’il y a sur Swile"
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
