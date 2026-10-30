import { currentMonthStart } from "@/lib/date";
import { getExpensesForMonth } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  await requireUserOrRedirect();
  const expenses = await getExpensesForMonth(currentMonthStart());
  return <Dashboard initialExpenses={expenses} />;
}
