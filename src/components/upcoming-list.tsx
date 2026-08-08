"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  deleteUpcomingAction,
  markUpcomingDoneAction,
  reopenUpcomingAction,
} from "@/app/actions/upcoming";
import { formatEuro } from "@/lib/format";
import { sortUpcoming } from "@/lib/upcoming-kpis";
import type { Upcoming } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";

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
  const [expanded, setExpanded] = useState(false);

  const ordered = sortUpcoming(items);
  const hasMore = ordered.length > initialVisible;
  const visible =
    expanded || !hasMore ? ordered : ordered.slice(0, initialVisible);
  const today = format(new Date(), "yyyy-MM-dd");

  async function handleDone(item: Upcoming) {
    setBusyId(item.id);
    const result = await markUpcomingDoneAction({ id: item.id });
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onUpcomingUpdated(result.data);
  }

  async function handleReopen(item: Upcoming) {
    setBusyId(item.id);
    const result = await reopenUpcomingAction({ id: item.id });
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onUpcomingUpdated(result.data);
  }

  async function handleDelete(item: Upcoming) {
    const confirmed = window.confirm(
      `Supprimer ?\n${item.title} — ${formatEuro(Number(item.amount))}`
    );
    if (!confirmed) return;

    setBusyId(item.id);
    const result = await deleteUpcomingAction({ id: item.id });
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onUpcomingDeleted(item.id);
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
          {items.length} élément{items.length > 1 ? "s" : ""}
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
                        className="size-8 rounded-full text-zinc-500"
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
                        onClick={() => void handleDone(item)}
                        className="size-8 rounded-full text-emerald-600 dark:text-emerald-400"
                        aria-label="Marquer comme fait"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
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
