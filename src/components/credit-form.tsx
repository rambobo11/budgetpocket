"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createCreditAction } from "@/app/actions/credits";
import {
  ASSET_CURRENCIES,
  CREDIT_KINDS,
  type AssetCurrency,
  type Credit,
  type CreditKind,
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

type CreditFormProps = {
  onCreditAdded: (credit: Credit) => void;
};

export function CreditForm({ onCreditAdded }: CreditFormProps) {
  const [person, setPerson] = useState("");
  const [kind, setKind] = useState<CreditKind | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<AssetCurrency>("EUR");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!kind) {
      setError("Choisissez un type.");
      return;
    }

    if (!person.trim()) {
      setError("Indiquez qui (ou le libellé du crédit).");
      return;
    }

    setLoading(true);

    const result = await createCreditAction({
      person: person.trim(),
      kind,
      amount,
      currency,
      notes: notes.trim() || null,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onCreditAdded(result.data);
    setPerson("");
    setKind(null);
    setAmount("");
    setCurrency("EUR");
    setNotes("");
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ajouter
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Quelqu’un te doit de l’argent, ou un crédit à suivre.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Type
          </Label>
          <Select
            value={kind}
            onValueChange={(value) => {
              if (value) setKind(value as CreditKind);
            }}
          >
            <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
              {CREDIT_KINDS.map((item) => (
                <SelectItem key={item} value={item} className="rounded-lg">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="credit-person"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Qui / libellé
          </Label>
          <Input
            id="credit-person"
            type="text"
            required
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder="Ex. Alex, prêt voiture…"
            className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Devise
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ASSET_CURRENCIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCurrency(item)}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                  currency === item
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="credit-amount"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Montant restant
          </Label>
          <div className="relative">
            <Input
              id="credit-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="h-16 rounded-2xl border-zinc-200 bg-zinc-50/80 pr-14 text-center text-3xl font-semibold tracking-tight text-zinc-900 shadow-none placeholder:text-zinc-300 focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus-visible:border-zinc-500 dark:focus-visible:bg-zinc-950 dark:focus-visible:ring-zinc-500/20"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-zinc-400">
              {currency}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="credit-notes"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Note{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="credit-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. rembourse fin août…"
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
              Ajouter
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
