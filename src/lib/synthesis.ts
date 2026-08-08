import { format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  computePatrimoineKpis,
  isLiveCryptoAsset,
  MAD_TO_EUR,
  splitPatrimoineAssets,
} from "@/lib/assets";
import { computeCreditKpis } from "@/lib/credit-kpis";
import { formatEuro, formatMad } from "@/lib/format";
import {
  computeExpenseDelta,
  computeExpenseHistory,
  computeExpenseInsights,
  computeMonthKpis,
  expenseMonthKey,
} from "@/lib/kpis";
import { budgetMonthKey } from "@/lib/incomes";
import {
  buildIncomeHistory,
  computeIncomeMonthKpis,
  lastNMonths,
} from "@/lib/patrimoine-analytics";
import type { Asset, Credit, Expense, Income } from "@/lib/types";

export type SynthesisPeriod = "1" | "3" | "6";

export type SynthesisSections = {
  expenses: boolean;
  incomes: boolean;
  patrimoine: boolean;
  credits: boolean;
};

export type SynthesisInput = {
  period: SynthesisPeriod;
  endMonth: Date;
  sections: SynthesisSections;
  expenses: Expense[];
  incomes: Income[];
  assets: Asset[];
  credits: Credit[];
};

const TOP_LINES = 40;
const MAX_DETAIL_LINES = 100;

function periodMonths(period: SynthesisPeriod): number {
  return Number(period);
}

function periodLabel(period: SynthesisPeriod, endMonth: Date): string {
  const months = periodMonths(period);
  if (months === 1) {
    return format(startOfMonth(endMonth), "MMMM yyyy", { locale: fr });
  }
  const start = subMonths(startOfMonth(endMonth), months - 1);
  return `${format(start, "MMM yyyy", { locale: fr })} → ${format(endMonth, "MMM yyyy", { locale: fr })}`;
}

function euro(n: number) {
  return formatEuro(n);
}

function filterExpensesForPeriod(
  expenses: Expense[],
  endMonth: Date,
  period: SynthesisPeriod
): Expense[] {
  const months = lastNMonths(periodMonths(period), endMonth);
  const keys = new Set(months.map((m) => budgetMonthKey(m)));
  return expenses.filter((e) => keys.has(expenseMonthKey(e.created_at)));
}

function filterIncomesForPeriod(
  incomes: Income[],
  endMonth: Date,
  period: SynthesisPeriod
): Income[] {
  const months = lastNMonths(periodMonths(period), endMonth);
  const keys = new Set(months.map((m) => budgetMonthKey(m)));
  return incomes.filter((i) => keys.has(i.budget_month.slice(0, 10)));
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

function buildExpensesSection(
  expenses: Expense[],
  allExpenses: Expense[],
  endMonth: Date,
  period: SynthesisPeriod
): string[] {
  const lines: string[] = ["## Dépenses", ""];
  const months = periodMonths(period);
  const kpis = computeMonthKpis(expenses);

  if (months === 1) {
    const history = computeExpenseHistory(endMonth, allExpenses, 2);
    const previous = history[0];
    const current = history[1] ?? history[0];
    const delta = computeExpenseDelta(
      current?.total ?? kpis.total,
      previous && history.length > 1 ? previous.total : 0
    );
    const insights = computeExpenseInsights(endMonth, kpis);

    lines.push(`- **Total** : ${euro(kpis.total)} (${kpis.count} opérations)`);
    lines.push(
      `- **vs mois précédent** : ${euro(delta.delta)} (${delta.deltaPercent != null ? `${delta.deltaPercent.toFixed(1)} %` : "n/a"})`
    );
    lines.push(`- **Moyenne / jour actif** : ${euro(kpis.dailyAverage)}`);
    if (insights.projectedTotal != null) {
      lines.push(
        `- **Projection fin de mois** : ${euro(insights.projectedTotal)}`
      );
    }
    lines.push(
      `- **CB** : ${euro(kpis.cbTotal)} (${insights.cbSharePercent?.toFixed(0) ?? 0} %) · **Swile** : ${euro(kpis.swileTotal)} (${insights.swileSharePercent?.toFixed(0) ?? 0} %)`
    );
  } else {
    const history = computeExpenseHistory(endMonth, expenses, months);
    const total = history.reduce((sum, m) => sum + m.total, 0);
    lines.push(
      `- **Total période** : ${euro(total)} (${expenses.length} opérations)`
    );
    lines.push(
      `- **Moyenne / mois** : ${euro(months > 0 ? total / months : 0)}`
    );
    lines.push("");
    lines.push("### Évolution mensuelle");
    lines.push("");
    lines.push(
      mdTable(
        ["Mois", "Total", "Ops"],
        history.map((m) => [
          m.label,
          euro(m.total),
          String(m.count),
        ])
      )
    );
  }

  if (kpis.byCategory.length > 0) {
    lines.push("");
    lines.push("### Répartition par catégorie");
    lines.push("");
    lines.push(
      mdTable(
        ["Catégorie", "Montant", "Part", "Ops"],
        kpis.byCategory.map((c) => [
          c.category,
          euro(c.amount),
          `${c.percent.toFixed(0)} %`,
          String(c.count),
        ])
      )
    );
  }

  const sorted = [...expenses].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  );
  const top = sorted.slice(0, TOP_LINES);
  if (top.length > 0) {
    lines.push("");
    lines.push(`### Top ${top.length} dépenses`);
    lines.push("");
    lines.push(
      mdTable(
        ["Date", "Montant", "Catégorie", "Paiement", "Description"],
        top.map((e) => [
          format(new Date(e.created_at), "yyyy-MM-dd"),
          euro(Number(e.amount)),
          e.category,
          e.payment_method ?? "cb",
          (e.description ?? "—").replace(/\|/g, "/"),
        ])
      )
    );
    if (expenses.length > MAX_DETAIL_LINES) {
      lines.push("");
      lines.push(
        `> ${expenses.length} dépenses au total — détail limité au top ${TOP_LINES} pour garder le contexte lisible.`
      );
    }
  }

  lines.push("");
  return lines;
}

function buildIncomesSection(
  incomes: Income[],
  allIncomes: Income[],
  endMonth: Date,
  period: SynthesisPeriod
): string[] {
  const lines: string[] = ["## Revenus", ""];
  const months = periodMonths(period);
  const history = buildIncomeHistory(
    lastNMonths(months, endMonth),
    incomes
  );
  const total = history.reduce((sum, m) => sum + m.total, 0);

  if (months === 1) {
    const previousIncomes = allIncomes.filter(
      (i) =>
        i.budget_month.slice(0, 10) ===
        budgetMonthKey(subMonths(endMonth, 1))
    );
    const currentIncomes = allIncomes.filter(
      (i) => i.budget_month.slice(0, 10) === budgetMonthKey(endMonth)
    );
    const kpis = computeIncomeMonthKpis(
      endMonth,
      currentIncomes,
      previousIncomes
    );
    lines.push(
      `- **Total** : ${euro(kpis.current.total)} (${currentIncomes.length} entrées)`
    );
    lines.push(
      `- **vs mois précédent** : ${euro(kpis.delta)} (${kpis.deltaPercent != null ? `${kpis.deltaPercent.toFixed(1)} %` : "n/a"})`
    );
    if (kpis.current.bySource.length > 0) {
      lines.push("");
      lines.push("### Par source");
      lines.push("");
      lines.push(
        mdTable(
          ["Source", "Montant", "Part"],
          kpis.current.bySource.map((s) => [
            s.source,
            euro(s.amount),
            `${s.percent.toFixed(0)} %`,
          ])
        )
      );
    }
  } else {
    lines.push(
      `- **Total période** : ${euro(total)} (${incomes.length} entrées)`
    );
    lines.push(
      `- **Moyenne / mois** : ${euro(months > 0 ? total / months : 0)}`
    );
    lines.push("");
    lines.push("### Évolution mensuelle");
    lines.push("");
    lines.push(
      mdTable(
        ["Mois", "Total"],
        history.map((m) => [m.label, euro(m.total)])
      )
    );
  }

  const sorted = [...incomes].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  );
  const top = sorted.slice(0, Math.min(TOP_LINES, sorted.length));
  if (top.length > 0) {
    lines.push("");
    lines.push(`### Détail (top ${top.length})`);
    lines.push("");
    lines.push(
      mdTable(
        ["Mois budget", "Montant", "Source", "Description"],
        top.map((i) => [
          i.budget_month.slice(0, 7),
          euro(Number(i.amount)),
          i.source,
          (i.description ?? "—").replace(/\|/g, "/"),
        ])
      )
    );
  }

  lines.push("");
  return lines;
}

function buildPatrimoineSection(assets: Asset[]): string[] {
  const lines: string[] = ["## Patrimoine (snapshot)", ""];
  const kpis = computePatrimoineKpis(assets);
  const { patrimoine, avantages } = splitPatrimoineAssets(assets);
  const liveCount = patrimoine.filter(isLiveCryptoAsset).length;

  lines.push(
    `- **Patrimoine net (hors primes CSE)** : ${euro(kpis.total)} · ${kpis.count} actif${kpis.count > 1 ? "s" : ""}`
  );
  lines.push(
    `- **Note** : les valeurs crypto sont un **snapshot** (dernier refresh CoinGecko), pas un flux live permanent.`
  );
  lines.push(
    `- **Taux MAD→EUR utilisé** : ${MAD_TO_EUR} (approx. fixe)`
  );
  if (liveCount > 0) {
    lines.push(`- **Actifs crypto live** : ${liveCount}`);
  }

  if (kpis.byType.length > 0) {
    lines.push("");
    lines.push("### Allocation");
    lines.push("");
    lines.push(
      mdTable(
        ["Type", "Valeur EUR", "Part", "Nb"],
        kpis.byType.map((t) => [
          t.type,
          euro(t.value),
          `${t.percent.toFixed(0)} %`,
          String(t.count),
        ])
      )
    );
  }

  if (patrimoine.length > 0) {
    lines.push("");
    lines.push("### Actifs");
    lines.push("");
    lines.push(
      mdTable(
        ["Nom", "Type", "Valeur EUR", "Devise orig.", "Qté"],
        patrimoine.map((a) => [
          a.name.replace(/\|/g, "/"),
          a.asset_type,
          euro(Number(a.value_eur)),
          `${Number(a.value_original).toFixed(2)} ${a.currency}`,
          a.quantity != null ? String(a.quantity) : "—",
        ])
      )
    );
  }

  if (avantages.length > 0) {
    const avantagesTotal = avantages.reduce(
      (sum, a) => sum + Number(a.value_eur),
      0
    );
    lines.push("");
    lines.push(
      `### Primes / avantages CSE (hors patrimoine net) — ${euro(avantagesTotal)}`
    );
    lines.push("");
    lines.push(
      mdTable(
        ["Nom", "Type", "Valeur EUR"],
        avantages.map((a) => [
          a.name.replace(/\|/g, "/"),
          a.asset_type,
          euro(Number(a.value_eur)),
        ])
      )
    );
  }

  lines.push("");
  return lines;
}

function buildCreditsSection(credits: Credit[]): string[] {
  const lines: string[] = ["## Crédits / créances ouverts", ""];
  const open = credits.filter((c) => c.status === "open");
  const kpis = computeCreditKpis(credits);

  lines.push(`- **Ouverts** : ${kpis.openCount}`);
  lines.push(
    `- **On me doit (éq. EUR)** : ${euro(kpis.owedEurEquiv)}${kpis.owedMad > 0 ? ` (dont ${formatMad(kpis.owedMad)})` : ""}`
  );
  lines.push(
    `- **Crédits à rembourser (éq. EUR)** : ${euro(kpis.creditEurEquiv)}${kpis.creditMad > 0 ? ` (dont ${formatMad(kpis.creditMad)})` : ""}`
  );

  if (open.length > 0) {
    lines.push("");
    lines.push(
      mdTable(
        ["Personne / libellé", "Type", "Montant", "Devise", "Note"],
        open.map((c) => [
          c.person.replace(/\|/g, "/"),
          c.kind,
          Number(c.amount).toFixed(2),
          c.currency ?? "EUR",
          (c.notes ?? "—").replace(/\|/g, "/"),
        ])
      )
    );
  } else {
    lines.push("");
    lines.push("_Aucun crédit ouvert._");
  }

  lines.push("");
  return lines;
}

/** Génère un Markdown prêt à coller dans une IA finance / investissement. */
export function buildSynthesisMarkdown(input: SynthesisInput): string {
  const {
    period,
    endMonth,
    sections,
    expenses: allExpenses,
    incomes: allIncomes,
    assets,
    credits,
  } = input;

  const expenses = filterExpensesForPeriod(allExpenses, endMonth, period);
  const incomes = filterIncomesForPeriod(allIncomes, endMonth, period);
  const label = periodLabel(period, endMonth);
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });

  const parts: string[] = [
    "# Synthèse budget PocketBudget",
    "",
    "> Analyse ce budget personnel (France / EUR) et propose des pistes concrètes : réduction de dépenses, épargne, allocation patrimoine, gestion des crédits. Sois direct, chiffré, et priorise 3–5 actions.",
    "",
    `- **Période** : ${label}`,
    `- **Généré le** : ${generatedAt}`,
    `- **Devise principale** : EUR`,
    `- **Sections** : ${[
      sections.expenses && "dépenses",
      sections.incomes && "revenus",
      sections.patrimoine && "patrimoine",
      sections.credits && "crédits",
    ]
      .filter(Boolean)
      .join(", ") || "aucune"}`,
    "",
  ];

  if (sections.expenses && sections.incomes) {
    const expenseTotal = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );
    const incomeTotal = incomes.reduce(
      (sum, i) => sum + Number(i.amount),
      0
    );
    const savings = incomeTotal - expenseTotal;
    const rate =
      incomeTotal > 0 ? (savings / incomeTotal) * 100 : null;
    parts.push("## Vue d’ensemble");
    parts.push("");
    parts.push(`- **Revenus** : ${euro(incomeTotal)}`);
    parts.push(`- **Dépenses** : ${euro(expenseTotal)}`);
    parts.push(`- **Épargne nette** : ${euro(savings)}`);
    if (rate != null) {
      parts.push(`- **Taux d’épargne** : ${rate.toFixed(1)} %`);
    }
    parts.push("");
  }

  if (sections.expenses) {
    parts.push(
      ...buildExpensesSection(expenses, allExpenses, endMonth, period)
    );
  }
  if (sections.incomes) {
    parts.push(...buildIncomesSection(incomes, allIncomes, endMonth, period));
  }
  if (sections.patrimoine) {
    parts.push(...buildPatrimoineSection(assets));
  }
  if (sections.credits) {
    parts.push(...buildCreditsSection(credits));
  }

  if (
    !sections.expenses &&
    !sections.incomes &&
    !sections.patrimoine &&
    !sections.credits
  ) {
    parts.push("_Aucune section sélectionnée._");
    parts.push("");
  }

  parts.push("---");
  parts.push("");
  parts.push(
    "_Données exportées depuis PocketBudget — usage personnel / conseil IA._"
  );
  parts.push("");

  return parts.join("\n");
}

export function synthesisFilename(period: SynthesisPeriod, endMonth: Date) {
  const stamp = format(endMonth, "yyyy-MM");
  return `pocketbudget-synthese-${period}m-${stamp}.md`;
}
