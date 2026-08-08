"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createUpcomingAction } from "@/app/actions/upcoming";
import {
  UPCOMING_KINDS,
  type Upcoming,
  type UpcomingKind,
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

type UpcomingFormProps = {
  onUpcomingAdded: (item: Upcoming) => void;
};

export function UpcomingForm({ onUpcomingAdded }: UpcomingFormProps) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<UpcomingKind | null>(null);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
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

    if (!title.trim()) {
      setError("Indiquez un libellé (ex. CVEC, remboursement Sécu…).");
      return;
    }

    setLoading(true);

    const result = await createUpcomingAction({
      title: title.trim(),
      kind,
      amount,
      dueDate: dueDate || null,
      notes: notes.trim() || null,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onUpcomingAdded(result.data);
    setTitle("");
    setKind(null);
    setAmount("");
    setDueDate("");
    setNotes("");
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ajouter
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Une dépense à venir ou un remboursement attendu.
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
              if (value) setKind(value as UpcomingKind);
            }}
          >
            <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
              {UPCOMING_KINDS.map((item) => (
                <SelectItem key={item} value={item} className="rounded-lg">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="upcoming-title"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Libellé
          </Label>
          <Input
            id="upcoming-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. CVEC, remboursement Mutuelle…"
            className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="upcoming-amount"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Montant
          </Label>
          <div className="relative">
            <Input
              id="upcoming-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
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

        <div className="flex min-w-0 flex-col gap-2">
          <Label
            htmlFor="upcoming-due"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Échéance{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="upcoming-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-12 w-full max-w-full min-w-0 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="upcoming-notes"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Note{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="upcoming-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. avant le 15 sept, dossier n°…"
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
