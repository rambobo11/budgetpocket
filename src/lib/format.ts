import type { AssetCurrency } from "@/lib/types";

/** Formatage monétaire partagé (UI). */

/** Taux approx. pour convertir MAD → EUR (1 MAD ≈ 0,092 €). */
export const MAD_TO_EUR = 0.092;

export function toEuro(amount: number, currency: AssetCurrency): number {
  if (currency === "MAD") {
    return Number((amount * MAD_TO_EUR).toFixed(2));
  }
  return Number(amount.toFixed(2));
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatMad(amount: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(amount);
}
