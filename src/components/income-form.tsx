"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createIncomeAction } from "@/app/actions/incomes";
import {
  budgetMonthInputValue,
  defaultDateForMonth,
  formatBudgetMonthLabel,
  isValidBudgetMonthInput,
  suggestBudgetMonth,
} from "@/lib/incomes";
import {
  INCOME_SOURCES,
  type Income,
  type IncomeSource,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IncomeFormProps = {
  selectedMonth: Date;
  onIncomeAdded: (income: Income) => void;
};

export function IncomeForm({ selectedMonth, onIncomeAdded }: IncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => defaultDateForMonth(selectedMonth));
  const [budgetMonth, setBudgetMonth] = useState(() =>
    budgetMonthInputValue(selectedMonth)
  );
  const [budgetMonthLocked, setBudgetMonthLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDate(defaultDateForMonth(selectedMonth));
    setBudgetMonth(budgetMonthInputValue(selectedMonth));
    setBudgetMonthLocked(false);
    setInfo(null);
  }, [selectedMonth]);

  function applySuggestion(nextSource: IncomeSource, nextDate: string) {
    if (budgetMonthLocked) return;
    const suggested = suggestBudgetMonth(nextSource, nextDate);
    // suggestBudgetMonth returns yyyy-MM-dd → convert to yyyy-MM for input
    setBudgetMonth(suggested.slice(0, 7));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!source) {
      setError("Choisissez une source.");
      return;
    }

    if (!date) {
      setError("Indiquez la date de réception.");
      return;
    }

    if (!isValidBudgetMonthInput(budgetMonth)) {
      setError("Indiquez un mois concerné valide.");
      return;
    }

    setLoading(true);

    const result = await createIncomeAction({
      amount,
      source,
      description: description.trim() || null,
      date,
      budgetMonth,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onIncomeAdded(result.data);

    const selectedKey = budgetMonthInputValue(selectedMonth);
    if (budgetMonth !== selectedKey) {
      setInfo(
        `Enregistré pour ${formatBudgetMonthLabel(budgetMonth)}. Change de mois en haut pour le voir dans la liste.`
      );
    }

    setAmount("");
    setSource(null);
    setDescription("");
    setDate(defaultDateForMonth(selectedMonth));
    setBudgetMonth(budgetMonthInputValue(selectedMonth));
    setBudgetMonthLocked(false);
    setLoading(false);
  }

  const budgetMonthLabel = formatBudgetMonthLabel(budgetMonth, selectedMonth);

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ajouter un revenu
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ex. salaire reçu le 29/07 → mois concerné août
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="income-amount"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Montant
          </Label>
          <div className="relative">
            <Input
              id="income-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="h-16 rounded-2xl border-zinc-200 bg-zinc-50/80 pr-12 text-center text-3xl font-semibold tracking-tight text-zinc-900 shadow-none placeholder:text-zinc-300 focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus-visible:border-zinc-500 dark:focus-visible:bg-zinc-950 dark:focus-visible:ring-zinc-500/20"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg font-medium text-zinc-400">
              €
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Source
          </Label>
          <Select
            value={source}
            onValueChange={(value) => {
              if (!value) return;
              const next = value as IncomeSource;
              setSource(next);
              applySuggestion(next, date);
            }}
          >
            <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
              <SelectValue placeholder="Choisir une source" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
              {INCOME_SOURCES.map((item) => (
                <SelectItem key={item} value={item} className="rounded-lg">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label
            htmlFor="income-date"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Date de réception
          </Label>
          <Input
            id="income-date"
            type="date"
            required
            value={date}
            onChange={(e) => {
              const nextDate = e.target.value;
              setDate(nextDate);
              if (source) applySuggestion(source, nextDate);
            }}
            className="h-12 w-full max-w-full min-w-0 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label
            htmlFor="budget-month"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Mois concerné
          </Label>
          <Input
            id="budget-month"
            type="month"
            required
            value={budgetMonth}
            onChange={(e) => {
              setBudgetMonth(e.target.value);
              // Only lock once a complete month is chosen
              if (isValidBudgetMonthInput(e.target.value)) {
                setBudgetMonthLocked(true);
              }
            }}
            className="h-12 w-full max-w-full min-w-0 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Budget de{" "}
              <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                {budgetMonthLabel}
              </span>
            </span>
            {budgetMonthLocked ? (
              <button
                type="button"
                onClick={() => {
                  setBudgetMonthLocked(false);
                  if (source) {
                    setBudgetMonth(suggestBudgetMonth(source, date).slice(0, 7));
                  }
                }}
                className="font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                Reprendre la suggestion auto
              </button>
            ) : source === "Salaire" || source === "Swile" ? (
              <span>· suggestion auto = mois suivant</span>
            ) : source === "CAF" ? (
              <span>· suggestion auto = mois de réception</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="income-description"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Description{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="income-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. salaire Moon, versement Swile…"
            className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {info}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-12 rounded-2xl bg-zinc-900 text-[15px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Ajout…
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Ajouter le revenu
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
