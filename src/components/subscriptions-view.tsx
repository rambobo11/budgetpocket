"use client";

import { useState } from "react";
import type { Subscription } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { SubscriptionsDashboard } from "@/components/subscriptions-dashboard";
import { SubscriptionForm } from "@/components/subscription-form";
import { SubscriptionList } from "@/components/subscription-list";

type SubscriptionsViewProps = {
  initialItems: Subscription[];
};

export function SubscriptionsView({ initialItems }: SubscriptionsViewProps) {
  const [items, setItems] = useState(initialItems);

  function handleAdded(item: Subscription) {
    setItems((previous) => [item, ...previous]);
  }

  function handleDeleted(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }

  function handleUpdated(item: Subscription) {
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
            Abonnements
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Catalogue · coût mensuel · hors salaire.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PrivacyToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <SubscriptionsDashboard items={items} />

      <div className="grid gap-5 md:grid-cols-2 md:items-start md:gap-6">
        <div className="order-2 md:order-1 md:sticky md:top-6">
          <SubscriptionForm onSubscriptionAdded={handleAdded} />
        </div>
        <div className="order-1 md:order-2">
          <SubscriptionList
            items={items}
            onSubscriptionDeleted={handleDeleted}
            onSubscriptionUpdated={handleUpdated}
          />
        </div>
      </div>
    </PageShell>
  );
}
