"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createExpenseAction } from "@/app/actions/expenses";
import { defaultDateForMonth, monthBounds } from "@/lib/expenses";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type PaymentMethod,
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

type QuickAddFormProps = {
  selectedMonth: Date;
  onExpenseAdded: (expense: Expense) => void;
};

export function QuickAddForm({
  selectedMonth,
  onExpenseAdded,
}: QuickAddFormProps) {
  const bounds = monthBounds(selectedMonth);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cb");
  const [date, setDate] = useState(() => defaultDateForMonth(selectedMonth));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDate(defaultDateForMonth(selectedMonth));
  }, [selectedMonth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Choisissez une catégorie.");
      return;
    }

    if (!date || date < bounds.min || date > bounds.max) {
      setError("Choisissez une date dans le mois affiché.");
      return;
    }

    setLoading(true);

    const result = await createExpenseAction({
      amount,
      category,
      description: description.trim() || null,
      paymentMethod,
      date,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onExpenseAdded(result.data);
    setAmount("");
    setCategory(null);
    setDescription("");
    setPaymentMethod("cb");
    setDate(defaultDateForMonth(selectedMonth));
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Quick Add
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoutez une dépense en quelques secondes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="amount"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Montant
          </Label>
          <div className="relative">
            <Input
              id="amount"
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
            Paiement
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("cb")}
              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                paymentMethod === "cb"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
              }`}
            >
              CB
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("swile")}
              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                paymentMethod === "swile"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
              }`}
            >
              Swile
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Catégorie
          </Label>
          <Select
            value={category}
            onValueChange={(value) => {
              if (value) setCategory(value as Category);
            }}
          >
            <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
              {CATEGORIES.map((item) => (
                <SelectItem key={item} value={item} className="rounded-lg">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label
            htmlFor="date"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Date
          </Label>
          <Input
            id="date"
            type="date"
            required
            min={bounds.min}
            max={bounds.max}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full max-w-full min-w-0 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="description"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Description{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. courses, essence…"
            className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
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
              Ajouter la dépense
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
