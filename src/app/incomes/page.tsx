import { format } from "date-fns";
import { currentMonthStart } from "@/lib/date";
import { getIncomesForBudgetMonth } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { IncomesView } from "@/components/incomes-view";

export default async function IncomesPage() {
  await requireUserOrRedirect();
  const budgetMonth = format(currentMonthStart(), "yyyy-MM-dd");
  const incomes = await getIncomesForBudgetMonth(budgetMonth);

  return <IncomesView initialIncomes={incomes} />;
}
