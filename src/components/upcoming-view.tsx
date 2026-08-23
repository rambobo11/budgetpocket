"use client";

import { useState } from "react";
import type { Upcoming } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
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
      <AppHeader
        title={
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-zinc-50">
            À venir
          </h1>
        }
        subtitle="Dépenses prévues et remboursements attendus."
      />

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
