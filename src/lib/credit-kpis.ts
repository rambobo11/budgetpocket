import { MAD_TO_EUR, toEuro } from "@/lib/assets";
import type { Credit } from "@/lib/types";

export type CreditKpis = {
  openCount: number;
  repaidCount: number;
  /** Total ouvert converti en EUR (approx. pour MAD). */
  totalEur: number;
  owedEur: number;
  owedMad: number;
  creditEur: number;
  creditMad: number;
  owedEurEquiv: number;
  creditEurEquiv: number;
};

export function computeCreditKpis(credits: Credit[]): CreditKpis {
  const open = credits.filter((c) => c.status === "open");
  const repaid = credits.filter((c) => c.status === "repaid");

  let owedEur = 0;
  let owedMad = 0;
  let creditEur = 0;
  let creditMad = 0;

  for (const credit of open) {
    const amount = Number(credit.amount);
    const currency = credit.currency ?? "EUR";
    const isOwed = credit.kind === "On me doit";

    if (isOwed) {
      if (currency === "MAD") owedMad += amount;
      else owedEur += amount;
    } else if (currency === "MAD") {
      creditMad += amount;
    } else {
      creditEur += amount;
    }
  }

  const owedEurEquiv = owedEur + toEuro(owedMad, "MAD");
  const creditEurEquiv = creditEur + toEuro(creditMad, "MAD");

  return {
    openCount: open.length,
    repaidCount: repaid.length,
    totalEur: Number((owedEurEquiv + creditEurEquiv).toFixed(2)),
    owedEur,
    owedMad,
    creditEur,
    creditMad,
    owedEurEquiv: Number(owedEurEquiv.toFixed(2)),
    creditEurEquiv: Number(creditEurEquiv.toFixed(2)),
  };
}

export { MAD_TO_EUR };
