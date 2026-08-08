"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { computeUpcomingKpis } from "@/lib/upcoming-kpis";
import { format } from "date-fns";
import type { Upcoming } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { PrivacyToggle } from "@/components/privacy-toggle";

type UpcomingDashboardProps = {
  items: Upcoming[];
};

export function UpcomingDashboard({ items }: UpcomingDashboardProps) {
  const { mask } = usePrivacy();
  const today = format(new Date(), "yyyy-MM-dd");
  const kpis = computeUpcomingKpis(items, today);

  return (
    <section className="mb-5 space-y-4 md:mb-8 md:space-y-5">
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Ouverts
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-5xl dark:text-zinc-50">
              {kpis.openCount}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {kpis.doneCount > 0
                ? `${kpis.doneCount} terminé${kpis.doneCount > 1 ? "s" : ""}`
                : "CVEC, remboursements, échéances…"}
              {kpis.overdueCount > 0
                ? ` · ${kpis.overdueCount} en retard`
                : ""}
            </p>
          </div>
          <PrivacyToggle prominent />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="size-4" />
            <p className="text-[13px] font-medium tracking-wide uppercase">
              À payer
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {mask(formatEuro(kpis.toPay))}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="size-4" />
            <p className="text-[13px] font-medium tracking-wide uppercase">
              À recevoir
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {mask(formatEuro(kpis.toReceive))}
          </p>
        </div>
      </div>

      {kpis.openCount === 0 ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <CalendarClock className="size-4 shrink-0" />
          Rien de prévu pour le moment.
        </div>
      ) : null}
    </section>
  );
}
