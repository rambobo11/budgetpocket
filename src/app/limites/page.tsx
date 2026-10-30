import { currentMonthStart } from "@/lib/date";
import {
  getCategoryLimits,
  getExpensesForMonth,
} from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { CategoryLimitsView } from "@/components/category-limits-view";

export default async function LimitesPage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const [limits, expenses] = await Promise.all([
    getCategoryLimits(),
    getExpensesForMonth(month),
  ]);

  return (
    <CategoryLimitsView initialLimits={limits} initialExpenses={expenses} />
  );
}
