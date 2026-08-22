import { currentMonthStart } from "@/lib/date";
import { getExpensesForMonth } from "@/lib/data/queries";
import { ensureSwileCreatineExpenseAction } from "@/app/actions/seed-swile-creatine";
import { repairChristmasSwilePrimeAction } from "@/app/actions/repair-swile-prime";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  await requireUserOrRedirect();
  // Idempotent no-op après 1er run (creatine 25 € Swile 11/08 + Prime Noël).
  await ensureSwileCreatineExpenseAction();
  // Remet Prime Noël à 25,71 € (tickets Swile ne doivent plus la vider).
  await repairChristmasSwilePrimeAction();
  const expenses = await getExpensesForMonth(currentMonthStart());
  return <Dashboard initialExpenses={expenses} />;
}
