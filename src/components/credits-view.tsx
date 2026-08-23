"use client";

import { useEffect, useState } from "react";
import type { Credit } from "@/lib/types";
import { ensureFamilyCreditsAction } from "@/app/actions/credits";
import { AppHeader } from "@/components/app-header";
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
      <AppHeader
        title={
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-zinc-50">
            Crédit
          </h1>
        }
        subtitle="Créances et crédits à rembourser / à récupérer."
      />

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
