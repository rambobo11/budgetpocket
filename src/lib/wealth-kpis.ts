import { splitPatrimoineAssets } from "@/lib/assets";
import { computeCreditKpis } from "@/lib/credit-kpis";
import type { Asset, Credit, Expense } from "@/lib/types";
import { expenseMonthKey } from "@/lib/kpis";
import { budgetMonthKey } from "@/lib/incomes";
import { lastNMonths } from "@/lib/patrimoine-analytics";

const LIQUID_TYPES = new Set(["Cash", "Compte MA"]);
const INVESTED_TYPES = new Set(["Crypto", "Compte Binance", "Actions"]);

export type WealthKpis = {
  /** Cash + Compte MA (EUR). */
  liquidEur: number;
  liquidPercent: number | null;
  /** Crypto + Binance + Actions (EUR). */
  investedEur: number;
  investedPercent: number | null;
  topAssetName: string | null;
  topAssetEur: number;
  topAssetPercent: number | null;
  /** Crédits ouverts (ce que tu dois), éq. EUR. */
  debtsEur: number;
  /** Brut − dettes. */
  netEur: number;
  /** Liquidités ÷ dépenses mensuelles moyennes. */
  runwayMonths: number | null;
  avgMonthlyExpenses: number;
  runwayMonthsSampled: number;
};

export function computeWealthKpis(input: {
  assets: Asset[];
  credits: Credit[];
  /** Dépenses sur N mois pour calculer la moyenne (runway). */
  expenses: Expense[];
  endMonth: Date;
  expenseMonths?: number;
}): WealthKpis {
  const { patrimoine } = splitPatrimoineAssets(input.assets);
  const total = patrimoine.reduce(
    (sum, asset) => sum + Number(asset.value_eur),
    0
  );

  let liquidEur = 0;
  let investedEur = 0;
  let topAsset: Asset | null = null;

  for (const asset of patrimoine) {
    const value = Number(asset.value_eur);
    if (LIQUID_TYPES.has(asset.asset_type)) liquidEur += value;
    if (INVESTED_TYPES.has(asset.asset_type)) investedEur += value;
    if (!topAsset || value > Number(topAsset.value_eur)) {
      topAsset = asset;
    }
  }

  const creditKpis = computeCreditKpis(input.credits);
  const debtsEur = creditKpis.creditEurEquiv;
  const netEur = total - debtsEur;

  const sampleMonths = input.expenseMonths ?? 3;
  const months = lastNMonths(sampleMonths, input.endMonth);
  const keys = new Set(months.map((m) => budgetMonthKey(m)));
  const periodExpenses = input.expenses.filter((e) =>
    keys.has(expenseMonthKey(e.created_at))
  );
  const expensesTotal = periodExpenses
    .filter((e) => (e.payment_method ?? "cb") !== "swile")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const avgMonthlyExpenses =
    sampleMonths > 0 ? expensesTotal / sampleMonths : 0;
  const runwayMonths =
    avgMonthlyExpenses > 0 ? liquidEur / avgMonthlyExpenses : null;

  const topAssetEur = topAsset ? Number(topAsset.value_eur) : 0;

  return {
    liquidEur: Number(liquidEur.toFixed(2)),
    liquidPercent: total > 0 ? (liquidEur / total) * 100 : null,
    investedEur: Number(investedEur.toFixed(2)),
    investedPercent: total > 0 ? (investedEur / total) * 100 : null,
    topAssetName: topAsset?.name ?? null,
    topAssetEur: Number(topAssetEur.toFixed(2)),
    topAssetPercent: total > 0 && topAsset ? (topAssetEur / total) * 100 : null,
    debtsEur: Number(debtsEur.toFixed(2)),
    netEur: Number(netEur.toFixed(2)),
    runwayMonths:
      runwayMonths == null ? null : Number(runwayMonths.toFixed(1)),
    avgMonthlyExpenses: Number(avgMonthlyExpenses.toFixed(2)),
    runwayMonthsSampled: sampleMonths,
  };
}
