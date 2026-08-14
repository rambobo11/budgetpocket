import type { Category, Subscription } from "@/lib/types";

export type SubscriptionKpis = {
  activeCount: number;
  pausedCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  dueWithin7Days: number;
  nextBillingDate: string | null;
  nextBillingName: string | null;
};

export function monthlyEquivalent(sub: Subscription): number {
  const amount = Number(sub.amount);
  if (sub.billing_interval === "yearly") {
    return Number((amount / 12).toFixed(2));
  }
  return Number(amount.toFixed(2));
}

export function yearlyEquivalent(sub: Subscription): number {
  const amount = Number(sub.amount);
  if (sub.billing_interval === "monthly") {
    return Number((amount * 12).toFixed(2));
  }
  return Number(amount.toFixed(2));
}

export function computeSubscriptionKpis(
  items: Subscription[],
  todayYmd: string
): SubscriptionKpis {
  const active = items.filter((item) => item.status === "active");
  const paused = items.filter((item) => item.status === "paused");

  let monthlyTotal = 0;
  let yearlyTotal = 0;
  let dueWithin7Days = 0;

  for (const item of active) {
    monthlyTotal += monthlyEquivalent(item);
    yearlyTotal += yearlyEquivalent(item);
    if (item.next_billing_date) {
      const diffDays = daysBetween(todayYmd, item.next_billing_date);
      if (diffDays >= 0 && diffDays <= 7) dueWithin7Days += 1;
    }
  }

  const upcoming = [...active]
    .filter((item) => item.next_billing_date)
    .sort((a, b) =>
      (a.next_billing_date ?? "").localeCompare(b.next_billing_date ?? "")
    );

  const next = upcoming[0] ?? null;

  return {
    activeCount: active.length,
    pausedCount: paused.length,
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    yearlyTotal: Number(yearlyTotal.toFixed(2)),
    dueWithin7Days,
    nextBillingDate: next?.next_billing_date ?? null,
    nextBillingName: next?.name ?? null,
  };
}

export function sortSubscriptions(items: Subscription[]): Subscription[] {
  const statusRank: Record<string, number> = {
    active: 0,
    paused: 1,
    cancelled: 2,
  };

  return [...items].sort((a, b) => {
    const byStatus =
      (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    if (a.next_billing_date && b.next_billing_date) {
      return a.next_billing_date.localeCompare(b.next_billing_date);
    }
    if (a.next_billing_date) return -1;
    if (b.next_billing_date) return 1;
    return a.name.localeCompare(b.name, "fr");
  });
}

export function groupSubscriptionsByCategory(
  items: Subscription[]
): { category: Category | string; items: Subscription[] }[] {
  const map = new Map<string, Subscription[]>();
  for (const item of sortSubscriptions(items)) {
    const key = item.category || "Autres";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([category, groupItems]) => ({ category, items: groupItems }))
    .sort((a, b) => a.category.localeCompare(b.category, "fr"));
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const from = Date.parse(`${fromYmd}T12:00:00.000Z`);
  const to = Date.parse(`${toYmd}T12:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

export function intervalLabel(interval: Subscription["billing_interval"]) {
  return interval === "yearly" ? "Annuel" : "Mensuel";
}
