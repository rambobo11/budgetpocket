import { subMonths } from "date-fns";
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
  const previousMonth = subMonths(month, 1);
  const [
    expenses,
    incomes,
    balances,
    previousExpenses,
    previousIncomes,
    previousBalances,
    limits,
  ] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForBudgetMonth(budgetMonthKey(month)),
    getUserBalances(month),
    getExpensesForMonth(previousMonth),
    getIncomesForBudgetMonth(budgetMonthKey(previousMonth)),
    getUserBalances(previousMonth),
    getCategoryLimits(),
  ]);

  return (
    <StatsDashboard
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialBalances={balances}
      initialPreviousExpenses={previousExpenses}
      initialPreviousIncomes={previousIncomes}
      initialPreviousBalances={previousBalances}
      initialLimits={limits}
      initialMonthIso={month.toISOString()}
    />
  );
}
