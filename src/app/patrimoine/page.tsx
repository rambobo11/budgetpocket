import { getAssets, getCredits } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { ensureAirbnbPrimeNoelExpenseAction } from "@/app/actions/seed-airbnb-prime-noel";
import { PatrimoineView } from "@/components/patrimoine-view";

export default async function PatrimoinePage() {
  await requireUserOrRedirect();
  await ensureAirbnbPrimeNoelExpenseAction();
  const [assets, credits] = await Promise.all([getAssets(), getCredits()]);
  return (
    <PatrimoineView initialAssets={assets} initialCredits={credits} />
  );
}
