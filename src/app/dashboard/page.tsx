import { currentMonthStart } from "@/lib/date";
import { getExpensesForMonth } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { StatsDashboard } from "@/components/stats-dashboard";

export default async function DashboardPage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const expenses = await getExpensesForMonth(month);

  return (
    <StatsDashboard
      initialExpenses={expenses}
      initialMonthIso={month.toISOString()}
    />
  );
}
