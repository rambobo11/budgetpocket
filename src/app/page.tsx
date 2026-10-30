import { format } from "date-fns";
import { currentMonthStart } from "@/lib/date";
import {
  getCategoryLimits,
  getExpensesForMonth,
  getIncomesForBudgetMonth,
  getUserBalances,
} from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  await requireUserOrRedirect();
  const month = currentMonthStart();
  const budgetMonth = format(month, "yyyy-MM-dd");
  const [expenses, incomes, balances, limits] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForBudgetMonth(budgetMonth),
    getUserBalances(),
    getCategoryLimits(),
  ]);

  return (
    <Dashboard
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialBalances={balances}
      initialLimits={limits}
    />
  );
}
