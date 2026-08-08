"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, subMonths } from "date-fns";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import type { Asset, Credit, Expense, Income } from "@/lib/types";
import { currentMonthStart } from "@/lib/date";
import { fetchAssets } from "@/lib/assets";
import { fetchExpensesBetween } from "@/lib/expenses";
import { fetchIncomesBetween, lastNMonths } from "@/lib/patrimoine-analytics";
import {
  buildSynthesisMarkdown,
  synthesisFilename,
  type SynthesisPeriod,
  type SynthesisSections,
} from "@/lib/synthesis";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

type SynthesisViewProps = {
  initialAssets: Asset[];
  initialCredits: Credit[];
};

const PERIODS: { value: SynthesisPeriod; label: string }[] = [
  { value: "1", label: "Mois courant" },
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
];

async function fetchCredits(): Promise<Credit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("credits")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Credit[];
}

export function SynthesisView({
  initialAssets,
  initialCredits,
}: SynthesisViewProps) {
  const [endMonth] = useState(() => currentMonthStart());
  const [period, setPeriod] = useState<SynthesisPeriod>("1");
  const [sections, setSections] = useState<SynthesisSections>({
    expenses: true,
    incomes: true,
    patrimoine: true,
    credits: true,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [credits, setCredits] = useState<Credit[]>(initialCredits);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const months = Number(period);
    // +1 mois pour permettre le delta MoM sur période 1 mois
    const fromMonth = subMonths(endMonth, Math.max(months, 2) - 1);

    startTransition(async () => {
      setLoadError(null);
      try {
        const [nextExpenses, nextIncomes, nextAssets, nextCredits] =
          await Promise.all([
            fetchExpensesBetween(fromMonth, endMonth),
            fetchIncomesBetween(
              lastNMonths(Math.max(months, 2), endMonth)[0],
              endMonth
            ),
            fetchAssets(),
            fetchCredits(),
          ]);
        setExpenses(nextExpenses);
        setIncomes(nextIncomes);
        setAssets(nextAssets);
        setCredits(nextCredits);
      } catch {
        setLoadError("Impossible de charger les données. Réessaie.");
      }
    });
  }, [period, endMonth]);

  const markdown = useMemo(
    () =>
      buildSynthesisMarkdown({
        period,
        endMonth,
        sections,
        expenses,
        incomes,
        assets,
        credits,
      }),
    [period, endMonth, sections, expenses, incomes, assets, credits]
  );

  function toggleSection(key: keyof SynthesisSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("Impossible de copier. Sélectionne le texte manuellement.");
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = synthesisFilename(period, endMonth);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const sectionToggles: {
    key: keyof SynthesisSections;
    label: string;
    hint: string;
  }[] = [
    { key: "expenses", label: "Dépenses", hint: "Totaux, catégories, top lignes" },
    { key: "incomes", label: "Revenus", hint: "Sources et évolution" },
    { key: "patrimoine", label: "Patrimoine", hint: "Snapshot actifs / allocation" },
    { key: "credits", label: "Crédits", hint: "Créances et crédits ouverts" },
  ];

  return (
    <PageShell>
      <header className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-zinc-50">
            Synthèse
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Markdown prêt à coller dans une IA finance / investissement.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <PrivacyToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <div
        className={`flex flex-col gap-4 transition-opacity md:gap-6 ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Période
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                  period === item.value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-5 text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Sections
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {sectionToggles.map((item) => (
              <li key={item.key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={sections[item.key]}
                    onChange={() => toggleSection(item.key)}
                    className="mt-1 size-4 rounded border-zinc-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {item.label}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {item.hint}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {loadError ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {loadError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleCopy()}
              disabled={isPending}
              className="h-11 rounded-2xl bg-zinc-900 px-4 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copier
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={isPending}
              className="h-11 rounded-2xl border-zinc-200 px-4 dark:border-zinc-700"
            >
              <Download className="size-4" />
              Télécharger .md
            </Button>
            {isPending ? (
              <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                Chargement…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                <FileText className="size-4" />
                {format(endMonth, "yyyy-MM")} · {markdown.length} car.
              </span>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Aperçu Markdown
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Colle ce texte dans ChatGPT / Claude pour une analyse.
            </p>
          </div>
          <pre className="max-h-[min(70vh,40rem)] overflow-auto px-5 py-4 text-[12px] leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 sm:text-[13px]">
            {markdown}
          </pre>
        </section>
      </div>
    </PageShell>
  );
}
