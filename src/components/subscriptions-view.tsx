"use client";

import { useState } from "react";
import type { Subscription } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
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
      <AppHeader
        title={
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-zinc-50">
            Abonnements
          </h1>
        }
        subtitle="Catalogue · coût mensuel · hors salaire."
      />

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
