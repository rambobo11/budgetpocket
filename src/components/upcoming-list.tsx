"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  completeUpcomingAction,
  deleteUpcomingAction,
  reopenUpcomingAction,
} from "@/app/actions/upcoming";
import { suggestBudgetMonth } from "@/lib/incomes";
import { nowInAppTz } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import { sortUpcoming } from "@/lib/upcoming-kpis";
import {
  CATEGORIES,
  INCOME_SOURCES,
  type Category,
  type IncomeSource,
  type PaymentMethod,
  type Upcoming,
} from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UpcomingListProps = {
  items: Upcoming[];
  onUpcomingDeleted: (id: string) => void;
  onUpcomingUpdated: (item: Upcoming) => void;
  initialVisible?: number;
};

export function UpcomingList({
  items,
  onUpcomingDeleted,
  onUpcomingUpdated,
  initialVisible = 8,
}: UpcomingListProps) {
  const { mask } = usePrivacy();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Autres");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cb");
  const [source, setSource] = useState<IncomeSource>("Autres");
  const [expanded, setExpanded] = useState(false);
  const inFlight = useRef(false);

  const ordered = sortUpcoming(items);
  const hasMore = ordered.length > initialVisible;
  const visible =
    expanded || !hasMore ? ordered : ordered.slice(0, initialVisible);
  const today = format(nowInAppTz(), "yyyy-MM-dd");

  function openConvertPanel(item: Upcoming) {
    setConvertingId(item.id);
    setCategory("Autres");
    setPaymentMethod("cb");
    setSource("Autres");
  }

  async function handleComplete(item: Upcoming, convert: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(item.id);
    const eventDate = item.due_date ?? format(nowInAppTz(), "yyyy-MM-dd");

    try {
      const result = await completeUpcomingAction(
        convert
          ? item.kind === "À payer"
            ? {
                id: item.id,
                convert: true,
                category,
                paymentMethod,
                date: eventDate,
              }
            : {
                id: item.id,
                convert: true,
                source,
                date: eventDate,
                budgetMonth: suggestBudgetMonth(source, eventDate).slice(0, 7),
              }
          : { id: item.id, convert: false }
      );

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      setConvertingId(null);
      onUpcomingUpdated(result.data);
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  async function handleReopen(item: Upcoming) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(item.id);
    try {
      const result = await reopenUpcomingAction({ id: item.id });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onUpcomingUpdated(result.data);
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  async function handleDelete(item: Upcoming) {
    const confirmed = window.confirm(
      `Supprimer ?\n${item.title} — ${mask(formatEuro(Number(item.amount)))}`
    );
    if (!confirmed) return;

    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(item.id);
    try {
      const result = await deleteUpcomingAction({ id: item.id });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onUpcomingDeleted(item.id);
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <CalendarClock className="size-5" />
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Aucune échéance
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajoute une dépense à venir ou un remboursement attendu.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Liste
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {items.length} élément{items.length > 1 ? "s" : ""} · coche = convertir
          ou juste clôturer
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.map((item) => {
          const isDone = item.status === "done";
          const isOverdue =
            !isDone && item.due_date != null && item.due_date < today;
          const dueLabel = item.due_date
            ? format(parseISO(item.due_date), "d MMM yyyy", { locale: fr })
            : null;
          const isConverting = convertingId === item.id;
          const alreadyConverted = Boolean(item.converted);

          return (
            <li key={item.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate text-[15px] font-medium ${
                        isDone
                          ? "text-zinc-400 line-through dark:text-zinc-500"
                          : "text-zinc-900 dark:text-zinc-50"
                      }`}
                    >
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        item.kind === "À recevoir"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                      }`}
                    >
                      {item.kind}
                    </span>
                    {isDone ? (
                      <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                        Fait
                      </span>
                    ) : null}
                    {alreadyConverted && !isDone ? (
                      <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-800 uppercase dark:bg-sky-950/50 dark:text-sky-300">
                        Converti
                      </span>
                    ) : null}
                    {isOverdue ? (
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-950/50 dark:text-amber-300">
                        En retard
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {dueLabel ? `Échéance ${dueLabel}` : "Sans échéance"}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p
                    className={`text-[15px] font-semibold tabular-nums ${
                      isDone
                        ? "text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {mask(formatEuro(Number(item.amount)))}
                  </p>
                  <div className="flex items-center gap-1">
                    {isDone ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busyId === item.id}
                        onClick={() => void handleReopen(item)}
                        className="size-8 rounded-full text-zinc-500 dark:text-zinc-400"
                        aria-label="Rouvrir"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RotateCcw className="size-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busyId === item.id}
                        onClick={() =>
                          isConverting
                            ? setConvertingId(null)
                            : openConvertPanel(item)
                        }
                        className="size-8 rounded-full text-emerald-600 dark:text-emerald-400"
                        aria-label="Marquer comme fait"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isConverting ? (
                          <X className="size-4" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={busyId === item.id}
                      onClick={() => void handleDelete(item)}
                      className="size-8 rounded-full text-zinc-500 hover:text-rose-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {isConverting ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
                  {alreadyConverted ? (
                    <>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Déjà converti en écriture
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Tu peux seulement clôturer sans recréer de dépense /
                        revenu.
                      </p>
                      <div className="mt-3">
                        <Button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void handleComplete(item, false)}
                          className="h-9 rounded-full bg-zinc-900 px-3.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          {busyId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Juste marquer fait"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {item.kind === "À payer"
                          ? "Créer une dépense ?"
                          : "Créer un revenu ?"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Ou clôture sans écrire dans Dépenses / Revenus.
                      </p>

                      {item.kind === "À payer" ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                              Catégorie
                            </Label>
                            <Select
                              value={category}
                              onValueChange={(value) => {
                                if (value) setCategory(value as Category);
                              }}
                            >
                              <SelectTrigger className="h-10! w-full rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((entry) => (
                                  <SelectItem key={entry} value={entry}>
                                    {entry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                              Paiement
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {(["cb", "swile"] as const).map((method) => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setPaymentMethod(method)}
                                  className={`h-10 rounded-xl border text-sm font-medium ${
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
                      ) : (
                        <div className="mt-3 flex flex-col gap-1.5">
                          <Label className="text-xs text-zinc-500 dark:text-zinc-400">Source</Label>
                          <Select
                            value={source}
                            onValueChange={(value) => {
                              if (value) setSource(value as IncomeSource);
                            }}
                          >
                            <SelectTrigger className="h-10! w-full rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INCOME_SOURCES.map((entry) => (
                                <SelectItem key={entry} value={entry}>
                                  {entry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void handleComplete(item, true)}
                          className="h-9 rounded-full bg-zinc-900 px-3.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          {busyId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : item.kind === "À payer" ? (
                            "Créer la dépense"
                          ) : (
                            "Créer le revenu"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busyId === item.id}
                          onClick={() => void handleComplete(item, false)}
                          className="h-9 rounded-full px-3.5"
                        >
                          Juste marquer fait
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-sm font-medium text-zinc-600 underline dark:text-zinc-300"
          >
            {expanded
              ? "Réduire"
              : `Voir les ${ordered.length - initialVisible} de plus`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
