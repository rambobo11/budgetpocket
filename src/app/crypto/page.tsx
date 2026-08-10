import { getAssets, getCryptoTrades } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { CryptoView } from "@/components/crypto-view";

export default async function CryptoPage() {
  await requireUserOrRedirect();
  const [trades, assets] = await Promise.all([
    getCryptoTrades(),
    getAssets(),
  ]);

  const binanceAssets = assets.filter(
    (asset) =>
      asset.asset_type === "Compte Binance" &&
      Boolean(asset.coingecko_id) &&
      asset.quantity != null &&
      Number(asset.quantity) > 0
  );

  return (
    <CryptoView initialTrades={trades} initialAssets={binanceAssets} />
  );
}
