import { currentMonthStart } from "@/lib/date";
import {
  getExpensesForMonth,
  getIncomesForBudgetMonth,
} from "@/lib/data/queries";
import { budgetMonthKey } from "@/lib/incomes";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { StatsDashboard } from "@/components/stats-dashboard";

export default async function DashboardPage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const [expenses, incomes] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForBudgetMonth(budgetMonthKey(month)),
  ]);

  return (
    <StatsDashboard
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialMonthIso={month.toISOString()}
    />
  );
}
