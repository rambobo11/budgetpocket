import type { Upcoming } from "@/lib/types";

export type UpcomingKpis = {
  openCount: number;
  doneCount: number;
  toPay: number;
  toReceive: number;
  overdueCount: number;
};

export function computeUpcomingKpis(
  items: Upcoming[],
  todayYmd: string
): UpcomingKpis {
  const open = items.filter((item) => item.status === "open");
  const done = items.filter((item) => item.status === "done");

  let toPay = 0;
  let toReceive = 0;
  let overdueCount = 0;

  for (const item of open) {
    const amount = Number(item.amount);
    if (item.kind === "À payer") toPay += amount;
    else toReceive += amount;

    if (item.due_date && item.due_date < todayYmd) {
      overdueCount += 1;
    }
  }

  return {
    openCount: open.length,
    doneCount: done.length,
    toPay: Number(toPay.toFixed(2)),
    toReceive: Number(toReceive.toFixed(2)),
    overdueCount,
  };
}

export function sortUpcoming(items: Upcoming[]): Upcoming[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "open" ? -1 : 1;
    }
    if (a.due_date && b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}
