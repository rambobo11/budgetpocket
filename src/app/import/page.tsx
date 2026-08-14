"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { importHistoricalExpensesAction } from "@/app/actions/import";
import { Button } from "@/components/ui/button";

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await importHistoricalExpensesAction();

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setMessage(
      `${result.data.inserted} dépenses importées. Désactive ALLOW_HISTORICAL_IMPORT ensuite.`
    );
    setLoading(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 md:max-w-xl">
      <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase">
        PocketBudget
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Import historique
      </h1>
      <p className="mt-2 text-[15px] text-zinc-500 dark:text-zinc-400">
        One-shot sécurisé : désactivé par défaut. Active{" "}
        <code className="text-xs">ALLOW_HISTORICAL_IMPORT=true</code> dans{" "}
        <code className="text-xs">.env.local</code>, importe une fois, puis
        retire le flag.
      </p>
      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Rate-limit 1× / 24h. Ne reclique pas — ça doublerait les données.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          onClick={handleImport}
          disabled={loading}
          className="h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Import en cours…
            </>
          ) : (
            "Importer l’historique"
          )}
        </Button>

        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Retour au dashboard
        </Link>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </main>
  );
}
