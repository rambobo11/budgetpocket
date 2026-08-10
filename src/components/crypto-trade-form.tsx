"use client";

import { useState } from "react";
import { format } from "date-fns";
import { createCryptoTradeAction } from "@/app/actions/crypto-trades";
import { CRYPTO_COINS } from "@/lib/crypto";
import { nowInAppTz } from "@/lib/date";
import {
  CRYPTO_QUOTE_CURRENCIES,
  CRYPTO_TRADE_SIDES,
  type CryptoQuoteCurrency,
  type CryptoTrade,
  type CryptoTradeSide,
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

type CryptoTradeFormProps = {
  onCreated: (trade: CryptoTrade) => void;
};

export function CryptoTradeForm({ onCreated }: CryptoTradeFormProps) {
  const [side, setSide] = useState<CryptoTradeSide>("buy");
  const [coingeckoId, setCoingeckoId] = useState("bitcoin");
  const [quantity, setQuantity] = useState("");
  const [priceQuote, setPriceQuote] = useState("");
  const [quoteCurrency, setQuoteCurrency] =
    useState<CryptoQuoteCurrency>("USDC");
  const [feeQuote, setFeeQuote] = useState("");
  const [tradedAt, setTradedAt] = useState(
    () => format(nowInAppTz(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createCryptoTradeAction({
      side,
      coingeckoId,
      quantity,
      priceQuote,
      quoteCurrency,
      feeQuote: feeQuote.trim() === "" ? 0 : feeQuote,
      tradedAt,
      notes: notes.trim() === "" ? null : notes,
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setQuantity("");
    setPriceQuote("");
    setFeeQuote("");
    setNotes("");
    onCreated(result.data);
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nouveau trade
      </h2>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
        Achat ou vente · prix unitaire · date
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-500 dark:text-zinc-400">Sens</Label>
          <div className="grid grid-cols-2 gap-2">
            {CRYPTO_TRADE_SIDES.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setSide(entry)}
                className={`h-10 rounded-xl border text-sm font-medium ${
                  side === entry
                    ? entry === "buy"
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-rose-700 bg-rose-700 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                }`}
              >
                {entry === "buy" ? "Achat" : "Vente"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-500 dark:text-zinc-400">Crypto</Label>
          <Select
            value={coingeckoId}
            onValueChange={(value) => {
              if (value) setCoingeckoId(value);
            }}
          >
            <SelectTrigger className="h-10! w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRYPTO_COINS.map((coin) => (
                <SelectItem key={coin.id} value={coin.id}>
                  {coin.name} ({coin.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trade-qty" className="text-xs text-zinc-500 dark:text-zinc-400">
            Quantité
          </Label>
          <Input
            id="trade-qty"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00061938"
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trade-price" className="text-xs text-zinc-500 dark:text-zinc-400">
            Prix unitaire
          </Label>
          <Input
            id="trade-price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            value={priceQuote}
            onChange={(e) => setPriceQuote(e.target.value)}
            placeholder="64580"
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-500 dark:text-zinc-400">
            Devise du prix
          </Label>
          <Select
            value={quoteCurrency}
            onValueChange={(value) => {
              if (value) setQuoteCurrency(value as CryptoQuoteCurrency);
            }}
          >
            <SelectTrigger className="h-10! w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRYPTO_QUOTE_CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trade-date" className="text-xs text-zinc-500 dark:text-zinc-400">
            Date
          </Label>
          <Input
            id="trade-date"
            type="date"
            required
            value={tradedAt}
            onChange={(e) => setTradedAt(e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="trade-fee" className="text-xs text-zinc-500 dark:text-zinc-400">
            Frais (optionnel)
          </Label>
          <Input
            id="trade-fee"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={feeQuote}
            onChange={(e) => setFeeQuote(e.target.value)}
            placeholder="0"
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="trade-notes" className="text-xs text-zinc-500 dark:text-zinc-400">
            Note
          </Label>
          <Input
            id="trade-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Binance spot…"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        className="mt-4 h-11 w-full rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Enregistrement…" : "Enregistrer le trade"}
      </Button>
    </form>
  );
}
