"use client";

import { useEffect, useState } from "react";
import type { Credit } from "@/lib/types";
import { ensureFamilyCreditsAction } from "@/app/actions/credits";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { CreditForm } from "@/components/credit-form";
import { CreditList } from "@/components/credit-list";
import { CreditsDashboard } from "@/components/credits-dashboard";

type CreditsViewProps = {
  initialCredits: Credit[];
};

export function CreditsView({ initialCredits }: CreditsViewProps) {
  const [credits, setCredits] = useState<Credit[]>(initialCredits);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void ensureFamilyCreditsAction().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setSeedError(result.error);
        return;
      }
      if (result.data.added.length > 0) {
        setCredits((previous) => [...result.data.added, ...previous]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreditAdded(credit: Credit) {
    setCredits((previous) => [credit, ...previous]);
  }

  function handleCreditDeleted(id: string) {
    setCredits((previous) => previous.filter((credit) => credit.id !== id));
  }

  function handleCreditUpdated(credit: Credit) {
    setCredits((previous) =>
      previous.map((item) => (item.id === credit.id ? credit : item))
    );
  }

  return (
    <PageShell>
      <header className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-zinc-50">
            Crédit
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Créances et crédits à rembourser / à récupérer.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PrivacyToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      {seedError ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {seedError}
        </p>
      ) : null}

      <CreditsDashboard credits={credits} />

      <div className="grid gap-5 md:grid-cols-2 md:gap-6 md:items-start">
        <CreditForm onCreditAdded={handleCreditAdded} />
        <CreditList
          credits={credits}
          onCreditDeleted={handleCreditDeleted}
          onCreditUpdated={handleCreditUpdated}
        />
      </div>
    </PageShell>
  );
}
