import { getAssets, getCredits } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { SynthesisView } from "@/components/synthesis-view";

export default async function SynthesePage() {
  await requireUserOrRedirect();
  const [assets, credits] = await Promise.all([getAssets(), getCredits()]);

  return (
    <SynthesisView initialAssets={assets} initialCredits={credits} />
  );
}
