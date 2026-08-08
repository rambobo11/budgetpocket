import { getAssets } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { PatrimoineView } from "@/components/patrimoine-view";

export default async function PatrimoinePage() {
  await requireUserOrRedirect();
  const assets = await getAssets();
  return <PatrimoineView initialAssets={assets} />;
}
