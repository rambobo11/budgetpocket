"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Pause, Play, Repeat, Trash2 } from "lucide-react";
import {
  deleteSubscriptionAction,
  updateSubscriptionStatusAction,
} from "@/app/actions/subscriptions";
import { formatEuro } from "@/lib/format";
import { nowInAppTz } from "@/lib/date";
import {
  groupSubscriptionsByCategory,
  intervalLabel,
  monthlyEquivalent,
} from "@/lib/subscriptions";
import type { Subscription } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";

type SubscriptionListProps = {
  items: Subscription[];
  onSubscriptionDeleted: (id: string) => void;
  onSubscriptionUpdated: (item: Subscription) => void;
};

function billingTone(nextBillingDate: string | null, todayYmd: string) {
  if (!nextBillingDate) return "muted" as const;
  if (nextBillingDate < todayYmd) return "overdue" as const;
  const from = Date.parse(`${todayYmd}T12:00:00.000Z`);
  const to = Date.parse(`${nextBillingDate}T12:00:00.000Z`);
  const days = Math.round((to - from) / 86_400_000);
  if (days <= 7) return "soon" as const;
  return "ok" as const;
}

export function SubscriptionList({
  items,
  onSubscriptionDeleted,
  onSubscriptionUpdated,
}: SubscriptionListProps) {
  const { mask } = usePrivacy();
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = format(nowInAppTz(), "yyyy-MM-dd");
  const groups = groupSubscriptionsByCategory(
    items.filter((item) => item.status !== "cancelled")
  );

  async function handleStatus(
    item: Subscription,
    status: "active" | "paused"
  ) {
    setBusyId(item.id);
    const result = await updateSubscriptionStatusAction({
      id: item.id,
      status,
    });
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onSubscriptionUpdated(result.data);
  }

  async function handleDelete(item: Subscription) {
    const confirmed = window.confirm(
      `Supprimer l'abonnement ?\n${item.name} — ${formatEuro(Number(item.amount))}`
    );
    if (!confirmed) return;

    setBusyId(item.id);
    const result = await deleteSubscriptionAction({ id: item.id });
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onSubscriptionDeleted(item.id);
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Repeat className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          Aucun abonnement
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Commence par Free, Netflix ou Spotify.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mes abos
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Par catégorie · date de prélèvement
        </p>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="px-5 py-2 dark:bg-transparent sm:px-6">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
                {group.category}
              </p>
            </div>
            <ul>
              {group.items.map((item) => {
                const busy = busyId === item.id;
                const paused = item.status === "paused";
                const tone = billingTone(item.next_billing_date, today);
                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3.5 first:border-t-0 sm:gap-4 sm:px-6 dark:border-zinc-800/80 ${
                      paused ? "opacity-70" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                          {item.name}
                        </p>
                        {paused ? (
                          <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                            Pause
                          </span>
                        ) : null}
                        {item.payment_method === "swile" ? (
                          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-400">
                            Swile
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-0.5 truncate text-sm ${
                          tone === "overdue"
                            ? "text-rose-600 dark:text-rose-400"
                            : tone === "soon"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {intervalLabel(item.billing_interval)}
                        {item.next_billing_date
                          ? ` · ${format(parseISO(item.next_billing_date), "d MMM", { locale: fr })}`
                          : ""}
                        {tone === "overdue" ? " · en retard" : ""}
                        {tone === "soon" ? " · bientôt" : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      <div className="mr-1 text-right sm:mr-2">
                        <p className="text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {mask(formatEuro(Number(item.amount)))}
                        </p>
                        {item.billing_interval === "yearly" ? (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            ≈ {mask(formatEuro(monthlyEquivalent(item)))}/m
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() =>
                          void handleStatus(
                            item,
                            paused ? "active" : "paused"
                          )
                        }
                        className="size-9 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label={paused ? "Reprendre" : "Mettre en pause"}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : paused ? (
                          <Play className="size-4" />
                        ) : (
                          <Pause className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => void handleDelete(item)}
                        className="size-9 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label="Supprimer l'abonnement"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
