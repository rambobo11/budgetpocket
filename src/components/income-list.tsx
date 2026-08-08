"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2, Pencil, Trash2, Wallet, X } from "lucide-react";
import {
  deleteIncomeAction,
  updateIncomeBudgetMonthAction,
} from "@/app/actions/incomes";
import {
  budgetMonthInputValue,
  formatBudgetMonthLabel,
  isValidBudgetMonthInput,
} from "@/lib/incomes";
import { formatEuro } from "@/lib/format";
import type { Income } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type IncomeListProps = {
  incomes: Income[];
  onIncomeDeleted?: (id: string) => void;
  onIncomeUpdated?: (income: Income) => void;
};

function formatReceivedDate(value: string) {
  const date = new Date(value);
  if (!isValid(date)) return "—";
  return format(date, "d MMM yyyy", { locale: fr });
}

export function IncomeList({
  incomes,
  onIncomeDeleted,
  onIncomeUpdated,
}: IncomeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMonth, setEditMonth] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const { mask } = usePrivacy();

  async function handleDelete(income: Income) {
    const label = income.description
      ? `${income.source} · ${income.description}`
      : income.source;

    const confirmed = window.confirm(
      `Supprimer ce revenu ?\n${label} — ${formatEuro(Number(income.amount))}`
    );

    if (!confirmed) return;

    setDeletingId(income.id);
    const result = await deleteIncomeAction({ id: income.id });
    setDeletingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    onIncomeDeleted?.(income.id);
  }

  function startEdit(income: Income) {
    const raw = income.budget_month?.slice(0, 10) ?? "";
    const parsed = parseISO(raw);
    setEditingId(income.id);
    setEditMonth(
      isValid(parsed) ? budgetMonthInputValue(parsed) : budgetMonthInputValue(new Date())
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMonth("");
  }

  async function saveBudgetMonth(income: Income) {
    if (!isValidBudgetMonthInput(editMonth)) {
      window.alert("Choisis un mois valide.");
      return;
    }

    setSavingId(income.id);
    const result = await updateIncomeBudgetMonthAction({
      id: income.id,
      budgetMonth: editMonth,
    });
    setSavingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    setEditingId(null);
    setEditMonth("");
    onIncomeUpdated?.(result.data);
  }

  if (incomes.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Wallet className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          Aucun revenu ce mois-ci
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoute ton premier revenu à gauche.
        </p>
      </div>
    );
  }

  const total = incomes.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Revenus du mois
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {incomes.length} entrée{incomes.length > 1 ? "s" : ""} ·{" "}
          {mask(formatEuro(total))}
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {incomes.map((income) => {
          const isEditing = editingId === income.id;
          const monthKey = income.budget_month?.slice(0, 7) ?? "";

          return (
            <li key={income.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                    {income.source}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    Reçu le {formatReceivedDate(income.created_at)}
                    {income.description ? ` · ${income.description}` : ""}
                  </p>

                  {isEditing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="month"
                        value={editMonth}
                        onChange={(e) => setEditMonth(e.target.value)}
                        className="h-9 w-[10.5rem] rounded-lg border-zinc-200 dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => saveBudgetMonth(income)}
                        disabled={
                          savingId === income.id ||
                          !isValidBudgetMonthInput(editMonth)
                        }
                        className="size-9 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        aria-label="Enregistrer le mois"
                      >
                        {savingId === income.id ? (
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(income)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium capitalize text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
                    >
                      pour {formatBudgetMonthLabel(monthKey)}
                      <Pencil className="size-3" />
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <p className="text-[15px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{mask(formatEuro(Number(income.amount)))}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(income)}
                    disabled={deletingId === income.id}
                    className="size-9 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Supprimer le revenu"
                  >
                    {deletingId === income.id ? (
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
    </section>
  );
}
