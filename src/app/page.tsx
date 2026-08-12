import { currentMonthStart } from "@/lib/date";
import { getExpensesForMonth } from "@/lib/data/queries";
import { ensureSwileCreatineExpenseAction } from "@/app/actions/seed-swile-creatine";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  await requireUserOrRedirect();
  // Idempotent no-op après 1er run (creatine 25 € Swile 11/08 + Prime Noël).
  await ensureSwileCreatineExpenseAction();
  const expenses = await getExpensesForMonth(currentMonthStart());
  return <Dashboard initialExpenses={expenses} />;
}
