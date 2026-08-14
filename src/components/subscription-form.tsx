"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createSubscriptionAction } from "@/app/actions/subscriptions";
import {
  CATEGORIES,
  SUBSCRIPTION_INTERVALS,
  type Category,
  type PaymentMethod,
  type Subscription,
  type SubscriptionInterval,
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

type SubscriptionFormProps = {
  onSubscriptionAdded: (item: Subscription) => void;
};

const fieldClass =
  "h-11 rounded-xl border-zinc-200 bg-white px-3.5 text-[15px] shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20";

export function SubscriptionForm({
  onSubscriptionAdded,
}: SubscriptionFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Factures");
  const [billingInterval, setBillingInterval] =
    useState<SubscriptionInterval>("monthly");
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cb");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Indiquez un nom (ex. Free, Netflix…).");
      return;
    }

    setLoading(true);

    const result = await createSubscriptionAction({
      name: name.trim(),
      amount,
      category,
      billingInterval,
      nextBillingDate: nextBillingDate || null,
      paymentMethod,
      notes: notes.trim() || null,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onSubscriptionAdded(result.data);
    setName("");
    setAmount("");
    setCategory("Factures");
    setBillingInterval("monthly");
    setNextBillingDate("");
    setPaymentMethod("cb");
    setNotes("");
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nouvel abo
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Inventaire seulement — pas de débit salaire.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="sub-name"
            className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Nom
          </Label>
          <Input
            id="sub-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Free, Netflix, Spotify…"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="sub-amount"
              className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
            >
              Prix
            </Label>
            <div className="relative">
              <Input
                id="sub-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className={`${fieldClass} pr-9 tabular-nums`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-zinc-400">
                €
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="sub-next"
              className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
            >
              Prochain
            </Label>
            <Input
              id="sub-next"
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              className={`${fieldClass} max-w-full min-w-0`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Catégorie
          </Label>
          <Select
            value={category}
            onValueChange={(value) => {
              if (value) setCategory(value as Category);
            }}
          >
            <SelectTrigger
              className={`h-11! w-full ${fieldClass}`}
            >
              <SelectValue placeholder="Catégorie" />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Rythme
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SUBSCRIPTION_INTERVALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setBillingInterval(item)}
                  className={`h-10 rounded-xl border text-xs font-medium transition-colors ${
                    billingInterval === item
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                  }`}
                >
                  {item === "monthly" ? "Mois" : "An"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Paiement
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["cb", "swile"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`h-10 rounded-xl border text-xs font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                  }`}
                >
                  {method === "cb" ? "CB" : "Swile"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="sub-notes"
            className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Note{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (opt.)
            </span>
          </Label>
          <Input
            id="sub-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Forfait, famille…"
            className={fieldClass}
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
          className="mt-0.5 h-11 rounded-2xl bg-zinc-900 text-[15px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Ajout…
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Ajouter
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
