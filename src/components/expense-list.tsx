"use client";

import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { Check, Loader2, Pencil, Receipt, X } from "lucide-react";
import {
  deleteExpenseAction,
  updateExpenseAction,
} from "@/app/actions/expenses";
import { APP_TIMEZONE } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  expenseCurrency,
  formatExpenseEntered,
  MAD_TO_EUR,
  toEuro,
} from "@/lib/expense-currency";
import { parseDecimalInput } from "@/lib/number-input";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type AssetCurrency,
  type Category,
  type Expense,
  type PaymentMethod,
} from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExpenseListProps = {
  expenses: Expense[];
  onExpenseDeleted?: (id: string) => void;
  onExpenseUpdated?: (expense: Expense) => void;
  /** Nombre de dépenses visibles avant « Voir plus » */
  initialVisible?: number;
};

function sortExpensesNewestFirst(expenses: Expense[]) {
  return [...expenses].sort((a, b) => {
    const byTime = b.created_at.localeCompare(a.created_at);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
}

function expenseDateYmd(expense: Expense) {
  return formatInTimeZone(expense.created_at, APP_TIMEZONE, "yyyy-MM-dd");
}

export function ExpenseList({
  expenses,
  onExpenseDeleted,
  onExpenseUpdated,
  initialVisible = 5,
}: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<AssetCurrency>("EUR");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cb");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { mask } = usePrivacy();

  const sortedExpenses = useMemo(
    () => sortExpensesNewestFirst(expenses),
    [expenses]
  );

  const hasMore = sortedExpenses.length > initialVisible;
  const visibleExpenses =
    expanded || !hasMore
      ? sortedExpenses
      : sortedExpenses.slice(0, initialVisible);
  const hiddenCount = sortedExpenses.length - initialVisible;

  function startEdit(expense: Expense) {
    setError(null);
    setEditingId(expense.id);
    setAmount(
      String(expense.amount_original ?? expense.amount).replace(".", ",")
    );
    setCurrency(expenseCurrency(expense));
    setCategory(expense.category);
    setDescription(expense.description ?? "");
    setPaymentMethod(expense.payment_method);
    setDate(expenseDateYmd(expense));
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave(expense: Expense) {
    setError(null);
    setSavingId(expense.id);

    const result = await updateExpenseAction({
      id: expense.id,
      amount,
      currency,
      category,
      description: description.trim() || null,
      paymentMethod,
      date,
    });

    setSavingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditingId(null);
    onExpenseUpdated?.(result.data.expense);
  }

  async function handleDelete(expense: Expense) {
    setError(null);
    setDeletingId(expense.id);
    const result = await deleteExpenseAction({ id: expense.id });
    setDeletingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (editingId === expense.id) setEditingId(null);
    onExpenseDeleted?.(expense.id);
  }

  if (sortedExpenses.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Receipt className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          Aucune dépense ce mois-ci
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoutez votre première dépense ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dépenses du mois
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {sortedExpenses.length} dépense{sortedExpenses.length > 1 ? "s" : ""}
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleExpenses.map((expense) => {
          const isEditing = editingId === expense.id;

          return (
            <li key={expense.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                        {expense.category}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(expense)}
                        className="inline-flex max-w-full items-center gap-1 truncate text-left text-[15px] font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                        aria-label={`Modifier la catégorie ${expense.category}`}
                      >
                        <span className="truncate">{expense.category}</span>
                        <Pencil className="size-3 shrink-0 text-zinc-400" />
                      </button>
                    )}
                    {expenseCurrency(expense) === "MAD" ? (
                      <span className="shrink-0 rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-teal-800 uppercase dark:bg-teal-950 dark:text-teal-300">
                        MAD
                      </span>
                    ) : null}
                    {expense.payment_method === "swile" ? (
                      <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-400">
                        Swile
                      </span>
                    ) : expense.payment_method === "cash" ? (
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-300">
                        Cash
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {formatInTimeZone(
                      expense.created_at,
                      APP_TIMEZONE,
                      "d MMM yyyy · HH:mm",
                      { locale: fr }
                    )}
                    {expense.description ? ` · ${expense.description}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <div className="text-right">
                    <p className="text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {mask(formatEuro(Number(expense.amount)))}
                    </p>
                    {expenseCurrency(expense) === "MAD" ? (
                      <p className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                        {mask(formatExpenseEntered(expense))}
                      </p>
                    ) : null}
                  </div>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(expense)}
                      className="size-8 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      aria-label="Modifier la dépense"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                  <DeleteConfirmButton
                    ariaLabel="Supprimer la dépense"
                    busy={deletingId === expense.id}
                    onConfirm={() => handleDelete(expense)}
                  />
                </div>
              </div>

              {isEditing ? (
                <form
                  className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSave(expense);
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                      Catégorie
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((item) => {
                        const active = category === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCategory(item)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                      Devise
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["EUR", "MAD"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrency(item)}
                          className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                            currency === item
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                          }`}
                        >
                          {item === "EUR" ? "Euro (€)" : "Dirham (MAD)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor={`edit-amount-${expense.id}`}
                        className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase"
                      >
                        Montant {currency === "MAD" ? "(DH)" : "(€)"}
                      </Label>
                      <Input
                        id={`edit-amount-${expense.id}`}
                        type="text"
                        inputMode="decimal"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-10 rounded-xl border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      {currency === "MAD" &&
                      Number.isFinite(parseDecimalInput(amount)) &&
                      parseDecimalInput(amount) > 0 ? (
                        <p className="text-[11px] text-zinc-500">
                          ≈ {formatEuro(toEuro(parseDecimalInput(amount), "MAD"))}{" "}
                          · 1 MAD = {MAD_TO_EUR} €
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor={`edit-date-${expense.id}`}
                        className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase"
                      >
                        Date
                      </Label>
                      <Input
                        id={`edit-date-${expense.id}`}
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-10 rounded-xl border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                      Paiement
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                            paymentMethod === method
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                          }`}
                        >
                          {PAYMENT_METHOD_LABELS[method]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor={`edit-desc-${expense.id}`}
                      className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase"
                    >
                      Description
                    </Label>
                    <Input
                      id={`edit-desc-${expense.id}`}
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 rounded-xl border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
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
                    <Button
                      type="submit"
                      size="icon"
                      disabled={savingId === expense.id}
                      className="size-9 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      aria-label="Enregistrer"
                    >
                      {savingId === expense.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                  </div>
                </form>
              ) : null}
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
