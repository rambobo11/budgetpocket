"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Impossible de charger
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {error.message || "Réessaie dans un instant."}
      </p>
      <Button type="button" className="mt-6 w-fit rounded-2xl" onClick={reset}>
        Réessayer
      </Button>
    </main>
  );
}
