"use client";

import { useState } from "react";
import type { Upcoming } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { UpcomingDashboard } from "@/components/upcoming-dashboard";
import { UpcomingForm } from "@/components/upcoming-form";
import { UpcomingList } from "@/components/upcoming-list";

type UpcomingViewProps = {
  initialItems: Upcoming[];
};

export function UpcomingView({ initialItems }: UpcomingViewProps) {
  const [items, setItems] = useState<Upcoming[]>(initialItems);

  function handleAdded(item: Upcoming) {
    setItems((previous) => [item, ...previous]);
  }

  function handleDeleted(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }

  function handleUpdated(item: Upcoming) {
    setItems((previous) =>
      previous.map((entry) => (entry.id === item.id ? item : entry))
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
            À venir
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Dépenses prévues et remboursements attendus.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PrivacyToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <UpcomingDashboard items={items} />

      <div className="grid gap-5 md:grid-cols-2 md:items-start md:gap-6">
        <UpcomingForm onUpcomingAdded={handleAdded} />
        <UpcomingList
          items={items}
          onUpcomingDeleted={handleDeleted}
          onUpcomingUpdated={handleUpdated}
        />
      </div>
    </PageShell>
  );
}
