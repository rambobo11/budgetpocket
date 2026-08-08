import { getCredits } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { CreditsView } from "@/components/credits-view";

export default async function CreditsPage() {
  await requireUserOrRedirect();
  const credits = await getCredits();
  return <CreditsView initialCredits={credits} />;
}
