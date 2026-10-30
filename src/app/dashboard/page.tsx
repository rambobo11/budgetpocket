import { currentMonthStart } from "@/lib/date";
import {
  getCategoryLimits,
  getExpensesForMonth,
  getIncomesForBudgetMonth,
  getUserBalances,
} from "@/lib/data/queries";
import { budgetMonthKey } from "@/lib/incomes";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { StatsDashboard } from "@/components/stats-dashboard";

export default async function DashboardPage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const [expenses, incomes, balances, limits] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForBudgetMonth(budgetMonthKey(month)),
    getUserBalances(),
    getCategoryLimits(),
  ]);

  return (
    <StatsDashboard
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialBalances={balances}
      initialLimits={limits}
      initialMonthIso={month.toISOString()}
    />
  );
}
