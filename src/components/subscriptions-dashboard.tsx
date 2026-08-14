"use client";

import { CalendarClock, Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEuro } from "@/lib/format";
import { computeSubscriptionKpis } from "@/lib/subscriptions";
import type { Subscription } from "@/lib/types";
import { nowInAppTz } from "@/lib/date";
import { usePrivacy } from "@/components/privacy-provider";
import { PrivacyToggle } from "@/components/privacy-toggle";

type SubscriptionsDashboardProps = {
  items: Subscription[];
};

export function SubscriptionsDashboard({ items }: SubscriptionsDashboardProps) {
  const { mask } = usePrivacy();
  const today = format(nowInAppTz(), "yyyy-MM-dd");
  const kpis = computeSubscriptionKpis(items, today);

  return (
    <section className="mb-5 space-y-3 md:mb-8 md:space-y-4">
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Coût / mois
            </p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-4xl dark:text-zinc-50">
              {mask(formatEuro(kpis.monthlyTotal))}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {mask(formatEuro(kpis.yearlyTotal))} / an · {kpis.activeCount}{" "}
              actif
              {kpis.activeCount > 1 ? "s" : ""}
              {kpis.pausedCount > 0
                ? ` · ${kpis.pausedCount} en pause`
                : ""}
            </p>
          </div>
          <PrivacyToggle prominent />
        </div>
        <p className="mt-4 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Totaux prévisionnels — le salaire ne bouge qu’au paiement (Quick Add).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.35rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Repeat className="size-3.5" />
            <p className="text-[11px] font-medium tracking-wide uppercase">
              Dans 7 j
            </p>
          </div>
          <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {kpis.dueWithin7Days}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            prélèvement
            {kpis.dueWithin7Days > 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-[1.35rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <CalendarClock className="size-3.5" />
            <p className="text-[11px] font-medium tracking-wide uppercase">
              Prochain
            </p>
          </div>
          {kpis.nextBillingDate && kpis.nextBillingName ? (
            <>
              <p className="mt-2 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                {kpis.nextBillingName}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {format(parseISO(kpis.nextBillingDate), "d MMM yyyy", {
                  locale: fr,
                })}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucune date
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
