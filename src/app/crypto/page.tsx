import { getCryptoTrades } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { CryptoView } from "@/components/crypto-view";

export default async function CryptoPage() {
  await requireUserOrRedirect();
  const trades = await getCryptoTrades();
  return <CryptoView initialTrades={trades} />;
}
