"use client";

import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react";
import { computeCreditKpis, MAD_TO_EUR } from "@/lib/credit-kpis";
import { formatEuro, formatMad } from "@/lib/format";
import type { Credit } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { PrivacyToggle } from "@/components/privacy-toggle";

type CreditsDashboardProps = {
  credits: Credit[];
};

export function CreditsDashboard({ credits }: CreditsDashboardProps) {
  const { mask } = usePrivacy();
  const kpis = computeCreditKpis(credits);

  return (
    <section className="mb-5 space-y-4 md:mb-8 md:space-y-5">
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Total ouvert
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-5xl dark:text-zinc-50">
              {mask(formatEuro(kpis.totalEur))}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {kpis.openCount} en cours
              {kpis.repaidCount > 0
                ? ` · ${kpis.repaidCount} remboursé${kpis.repaidCount > 1 ? "s" : ""}`
                : ""}
              {kpis.owedMad > 0 || kpis.creditMad > 0
                ? ` · MAD ≈ ×${MAD_TO_EUR}`
                : ""}
            </p>
          </div>
          <PrivacyToggle prominent />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="size-4" />
            <p className="text-[13px] font-medium tracking-wide uppercase">
              On me doit
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {mask(formatEuro(kpis.owedEurEquiv))}
          </p>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {[
              kpis.owedEur > 0 ? mask(formatEuro(kpis.owedEur)) : null,
              kpis.owedMad > 0 ? mask(formatMad(kpis.owedMad)) : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <ArrowUpRight className="size-4" />
            <p className="text-[13px] font-medium tracking-wide uppercase">
              Crédits
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            {mask(formatEuro(kpis.creditEurEquiv))}
          </p>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {[
              kpis.creditEur > 0 ? mask(formatEuro(kpis.creditEur)) : null,
              kpis.creditMad > 0 ? mask(formatMad(kpis.creditMad)) : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      </div>

      {kpis.openCount === 0 ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <HandCoins className="size-4 shrink-0" />
          Aucun montant ouvert pour le moment.
        </div>
      ) : null}
    </section>
  );
}
