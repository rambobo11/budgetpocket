"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createAssetAction } from "@/app/actions/assets";
import {
  defaultCurrencyForType,
  formatEuro,
  MAD_TO_EUR,
  toEuro,
} from "@/lib/assets";
import {
  CRYPTO_COINS,
  cryptoValueEur,
  fetchCryptoPrices,
  formatCryptoQuantity,
  getCryptoCoin,
} from "@/lib/crypto";
import { parseDecimalInput } from "@/lib/number-input";
import {
  ASSET_TYPES,
  type Asset,
  type AssetCurrency,
  type AssetType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetFormProps = {
  onAssetAdded: (asset: Asset) => void;
  onCancel?: () => void;
  allowedTypes?: readonly AssetType[];
  title?: string;
  description?: string;
};

export function AssetForm({
  onAssetAdded,
  onCancel,
  allowedTypes = ASSET_TYPES,
  title = "Ajouter un actif",
  description = "Crypto en live, actions, cash, compte MA…",
}: AssetFormProps) {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [currency, setCurrency] = useState<AssetCurrency>("EUR");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [coingeckoId, setCoingeckoId] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCrypto =
    assetType === "Crypto" || assetType === "Compte Binance";
  const selectedCoin = coingeckoId ? getCryptoCoin(coingeckoId) : null;

  useEffect(() => {
    if (!isCrypto || !coingeckoId) {
      setLivePrice(null);
      return;
    }

    let cancelled = false;
    setPriceLoading(true);

    fetchCryptoPrices([coingeckoId])
      .then((prices) => {
        if (cancelled) return;
        setLivePrice(prices[coingeckoId] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLivePrice(null);
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCrypto, coingeckoId]);

  function handleTypeChange(valueType: AssetType) {
    setAssetType(valueType);
    const nextCurrency = defaultCurrencyForType(valueType);
    setCurrency(nextCurrency);
    setCoingeckoId(null);
    setLivePrice(null);

    if (valueType === "Compte MA") {
      if (!name.trim()) setName("Compte bancaire MA");
      if (!notes.trim()) setNotes("Spotify ~23 MAD / mois");
    }

    if (valueType === "Primes voyage") {
      if (!name.trim()) setName("Chèques vacances ANCV");
      if (!notes.trim()) setNotes("Prime voyage · ANCV");
    }

    if (valueType === "Avantages") {
      setCurrency("EUR");
    }

    if (valueType === "Crypto" || valueType === "Compte Binance") {
      setCurrency("EUR");
      setName("");
      setValue("");
      if (valueType === "Compte Binance" && !notes.trim()) {
        setNotes("Binance");
      }
    }
  }

  function handleCoinChange(id: string) {
    setCoingeckoId(id);
    const coin = getCryptoCoin(id);
    if (coin) {
      setName(`${coin.name} (${coin.symbol})`);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedQuantity =
      quantity.trim() === "" ? null : parseDecimalInput(quantity);

    if (!assetType) {
      setError("Choisissez un type.");
      return;
    }

    if (isCrypto) {
      if (!coingeckoId || !selectedCoin) {
        setError("Choisissez une crypto (ex. Solana).");
        return;
      }
      if (
        parsedQuantity === null ||
        Number.isNaN(parsedQuantity) ||
        parsedQuantity <= 0
      ) {
        setError("Indiquez la quantité (ex. 3 SOL).");
        return;
      }
      if (livePrice == null) {
        setError("Prix introuvable. Réessaie dans un instant.");
        return;
      }
    } else {
      if (!name.trim()) {
        setError("Indiquez un nom (ex. Compte bancaire MA…).");
        return;
      }

      const parsedValue = parseDecimalInput(value);
      if (value === "" || Number.isNaN(parsedValue) || parsedValue < 0) {
        setError("Indiquez une valeur valide.");
        return;
      }

      if (
        parsedQuantity !== null &&
        (Number.isNaN(parsedQuantity) || parsedQuantity < 0)
      ) {
        setError("Quantité invalide.");
        return;
      }
    }

    setLoading(true);

    const result = await createAssetAction(
      isCrypto && selectedCoin && livePrice != null && parsedQuantity != null
        ? {
            name: `${selectedCoin.name} (${selectedCoin.symbol})`,
            assetType,
            currency: "EUR",
            quantity: parsedQuantity,
            coingeckoId: selectedCoin.id,
            notes:
              notes.trim() ||
              (assetType === "Compte Binance" ? "Binance" : null),
          }
        : {
            name: name.trim(),
            assetType,
            currency,
            valueOriginal: parseDecimalInput(value),
            quantity: parsedQuantity,
            coingeckoId: null,
            notes: notes.trim() || null,
          }
    );

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onAssetAdded(result.data);
    setName("");
    setAssetType(null);
    setCurrency("EUR");
    setValue("");
    setQuantity("");
    setCoingeckoId(null);
    setLivePrice(null);
    setNotes("");
    setLoading(false);
  }

  const typeOptions = allowedTypes;

  const parsedQuantityPreview =
    quantity !== "" ? parseDecimalInput(quantity) : Number.NaN;
  const parsedValuePreview =
    value !== "" ? parseDecimalInput(value) : Number.NaN;

  const cryptoPreview =
    isCrypto &&
    livePrice != null &&
    !Number.isNaN(parsedQuantityPreview) &&
    parsedQuantityPreview > 0
      ? cryptoValueEur(parsedQuantityPreview, livePrice)
      : null;

  const previewEuro =
    !isCrypto && !Number.isNaN(parsedValuePreview)
      ? toEuro(parsedValuePreview, currency)
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-9 shrink-0 rounded-full px-3 text-sm text-zinc-500"
          >
            Fermer
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Type
          </Label>
          <Select
            value={assetType}
            onValueChange={(value) => {
              if (value) handleTypeChange(value as AssetType);
            }}
          >
            <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
              {typeOptions.map((item) => (
                <SelectItem key={item} value={item} className="rounded-lg">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isCrypto ? (
          <>
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Crypto
              </Label>
              <Select
                value={coingeckoId}
                onValueChange={(value) => {
                  if (value) handleCoinChange(value);
                }}
              >
                <SelectTrigger className="h-12! w-full rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20">
                  <SelectValue placeholder="Ex. Solana, Bitcoin…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900">
                  {CRYPTO_COINS.map((coin) => (
                    <SelectItem key={coin.id} value={coin.id} className="rounded-lg">
                      {coin.name} ({coin.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="asset-quantity"
                className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
              >
                Quantité
              </Label>
              <div className="relative">
                <Input
                  id="asset-quantity"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex. 3"
                  className="h-14 rounded-2xl border-zinc-200 bg-zinc-50/80 pr-16 text-center text-2xl font-semibold tracking-tight text-zinc-900 shadow-none placeholder:text-zinc-300 focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus-visible:border-zinc-500 dark:focus-visible:bg-zinc-950 dark:focus-visible:ring-zinc-500/20"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-zinc-400">
                  {selectedCoin?.symbol ?? "—"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
              {priceLoading ? (
                <p className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="size-3.5 animate-spin" />
                  Prix en cours…
                </p>
              ) : livePrice != null && selectedCoin ? (
                <>
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Prix live · CoinGecko
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    1 {selectedCoin.symbol} = {formatEuro(livePrice)}
                  </p>
                  {cryptoPreview != null ? (
                    <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatCryptoQuantity(
                        parsedQuantityPreview,
                        selectedCoin.symbol
                      )}{" "}
                      ≈ {formatEuro(cryptoPreview)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  Choisis une crypto pour voir le prix en direct.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="asset-name"
                className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
              >
                Nom
              </Label>
              <Input
                id="asset-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Compte bancaire MA…"
                className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Devise
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(["EUR", "MAD"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrency(item)}
                    className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                      currency === item
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                    }`}
                  >
                    {item === "EUR" ? "Euro (€)" : "Dirham (MAD)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="asset-value"
                className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
              >
                Solde / valeur
              </Label>
              <div className="relative">
                <Input
                  id="asset-value"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0,00"
                  className="h-14 rounded-2xl border-zinc-200 bg-zinc-50/80 pr-14 text-center text-2xl font-semibold tracking-tight text-zinc-900 shadow-none placeholder:text-zinc-300 focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus-visible:border-zinc-500 dark:focus-visible:bg-zinc-950 dark:focus-visible:ring-zinc-500/20"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-zinc-400">
                  {currency === "MAD" ? "MAD" : "€"}
                </span>
              </div>
              {currency === "MAD" && previewEuro != null ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ≈ {formatEuro(previewEuro)} (taux approx. 1 MAD = {MAD_TO_EUR}{" "}
                  €)
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="asset-quantity-optional"
                className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
              >
                Quantité{" "}
                <span className="normal-case tracking-normal text-zinc-400">
                  (optionnel)
                </span>
              </Label>
              <Input
                id="asset-quantity-optional"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex. 10 actions…"
                className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="asset-notes"
            className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          >
            Notes{" "}
            <span className="normal-case tracking-normal text-zinc-400">
              (optionnel)
            </span>
          </Label>
          <Input
            id="asset-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isCrypto ? "Ex. wallet Phantom" : "Ex. Spotify 23 MAD / mois"
            }
            className="h-12 rounded-xl border-zinc-200 bg-white px-4 text-base shadow-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-500 dark:focus-visible:ring-zinc-500/20"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading || (isCrypto && priceLoading)}
          className="mt-1 h-12 rounded-2xl bg-zinc-900 text-[15px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Ajout…
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Ajouter à mon patrimoine
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
