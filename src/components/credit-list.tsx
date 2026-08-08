"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Check,
  HandCoins,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCreditAction,
  markCreditRepaidAction,
  updateCreditAmountAction,
} from "@/app/actions/credits";
import { formatEuro, formatMad } from "@/lib/format";
import type { Credit } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatCreditAmount(credit: Credit) {
  const amount = Number(credit.amount);
  return credit.currency === "MAD" ? formatMad(amount) : formatEuro(amount);
}

type CreditListProps = {
  credits: Credit[];
  onCreditDeleted?: (id: string) => void;
  onCreditUpdated?: (credit: Credit) => void;
  initialVisible?: number;
};

export function CreditList({
  credits,
  onCreditDeleted,
  onCreditUpdated,
  initialVisible = 5,
}: CreditListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { mask } = usePrivacy();

  const openCredits = credits.filter((c) => c.status === "open");
  const repaidCredits = credits.filter((c) => c.status === "repaid");
  const ordered = [...openCredits, ...repaidCredits];

  const hasMore = ordered.length > initialVisible;
  const visible =
    expanded || !hasMore ? ordered : ordered.slice(0, initialVisible);
  const hiddenCount = ordered.length - initialVisible;

  async function handleDelete(credit: Credit) {
    const confirmed = window.confirm(
      `Supprimer ?\n${credit.person} — ${formatCreditAmount(credit)}`
    );
    if (!confirmed) return;

    setDeletingId(credit.id);
    const result = await deleteCreditAction({ id: credit.id });
    setDeletingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    onCreditDeleted?.(credit.id);
  }

  async function handleRepaid(credit: Credit) {
    const confirmed = window.confirm(
      `Marquer comme remboursé ?\n${credit.person}`
    );
    if (!confirmed) return;

    setRepayingId(credit.id);
    const result = await markCreditRepaidAction({ id: credit.id });
    setRepayingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    onCreditUpdated?.(result.data);
  }

  function startEdit(credit: Credit) {
    setEditingId(credit.id);
    setEditAmount(String(credit.amount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
  }

  async function saveAmount(credit: Credit) {
    setSavingId(credit.id);
    const result = await updateCreditAmountAction({
      id: credit.id,
      amount: editAmount,
    });
    setSavingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    setEditingId(null);
    setEditAmount("");
    onCreditUpdated?.(result.data);
  }

  if (credits.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <HandCoins className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          Aucun crédit pour l’instant
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoute une créance ou un crédit à gauche.
        </p>
      </div>
    );
  }

  const owedEur = openCredits
    .filter((c) => c.kind === "On me doit" && (c.currency ?? "EUR") === "EUR")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const owedMad = openCredits
    .filter((c) => c.kind === "On me doit" && c.currency === "MAD")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const creditEur = openCredits
    .filter((c) => c.kind === "Crédit" && (c.currency ?? "EUR") === "EUR")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const creditMad = openCredits
    .filter((c) => c.kind === "Crédit" && c.currency === "MAD")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const summaryParts: string[] = [];
  if (owedEur > 0) summaryParts.push(`on te doit ${mask(formatEuro(owedEur))}`);
  if (owedMad > 0) summaryParts.push(`on te doit ${mask(formatMad(owedMad))}`);
  if (creditEur > 0) summaryParts.push(`crédits ${mask(formatEuro(creditEur))}`);
  if (creditMad > 0) summaryParts.push(`crédits ${mask(formatMad(creditMad))}`);

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          En cours
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {openCredits.length} ouvert
          {openCredits.length > 1 ? "s" : ""}
          {summaryParts.length > 0 ? ` · ${summaryParts.join(" · ")}` : ""}
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.map((credit) => {
          const isEditing = editingId === credit.id;
          const isRepaid = credit.status === "repaid";

          return (
            <li key={credit.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate text-[15px] font-medium ${
                        isRepaid
                          ? "text-zinc-400 line-through dark:text-zinc-500"
                          : "text-zinc-900 dark:text-zinc-50"
                      }`}
                    >
                      {credit.person}
                    </p>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        credit.kind === "On me doit"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400"
                      }`}
                    >
                      {credit.kind}
                    </span>
                    {isRepaid ? (
                      <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                        Remboursé
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {format(new Date(credit.created_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                    {credit.notes ? ` · ${credit.notes}` : ""}
                  </p>

                  {isEditing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="h-9 w-[8.5rem] rounded-lg border-zinc-200 dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => void saveAmount(credit)}
                        disabled={savingId === credit.id}
                        className="size-9 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        aria-label="Enregistrer le montant"
                      >
                        {savingId === credit.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        className="size-9 rounded-full"
                        aria-label="Annuler"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(credit)}
                      className={`mr-1 text-[15px] font-semibold tabular-nums underline-offset-2 hover:underline ${
                        isRepaid
                          ? "text-zinc-400 dark:text-zinc-500"
                          : credit.kind === "On me doit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-900 dark:text-zinc-50"
                      }`}
                      title="Modifier le montant"
                    >
                      {mask(formatCreditAmount(credit))}
                    </button>
                  ) : null}

                  {!isRepaid ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleRepaid(credit)}
                      disabled={repayingId === credit.id}
                      className="size-9 rounded-full text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                      aria-label="Marquer remboursé"
                      title="Remboursé"
                    >
                      {repayingId === credit.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(credit)}
                      className="size-9 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      aria-label="Modifier"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDelete(credit)}
                    disabled={deletingId === credit.id}
                    className="size-9 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Supprimer"
                  >
                    {deletingId === credit.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
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
