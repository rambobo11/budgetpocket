import { currentMonthStart } from "@/lib/date";
import { getCategoryLimits, getExpensesForMonth } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const [expenses, limits] = await Promise.all([
    getExpensesForMonth(month),
    getCategoryLimits(),
  ]);

  return <Dashboard initialExpenses={expenses} initialLimits={limits} />;
}
