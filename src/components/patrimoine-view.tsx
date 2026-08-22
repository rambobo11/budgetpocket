"use client";

import { useEffect, useState } from "react";
import {
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
} from "lucide-react";
import type { Asset, AssetType, Credit } from "@/lib/types";
import {
  computeAvantagesKpis,
  formatEuro,
  isLiveCryptoAsset,
  splitPatrimoineAssets,
} from "@/lib/assets";
import {
  importAvantagesHoldingsAction,
  importBinanceHoldingsAction,
  migrateAnnexeCLabelAction,
  refreshCryptoPricesAction,
} from "@/app/actions/assets";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { AppNav } from "@/components/app-nav";
import { PageShell } from "@/components/page-shell";
import { AssetForm } from "@/components/asset-form";
import { AssetList } from "@/components/asset-list";
import { PatrimoineDashboard } from "@/components/patrimoine-dashboard";
import { Button } from "@/components/ui/button";

type PatrimoineViewProps = {
  initialAssets: Asset[];
  initialCredits: Credit[];
};

const PATRIMOINE_TYPES = [
  "Crypto",
  "Compte Binance",
  "Actions",
  "Cash",
  "Compte MA",
  "Autres",
] as const satisfies readonly AssetType[];

const AVANTAGES_TYPES = [
  "Primes voyage",
  "Avantages",
] as const satisfies readonly AssetType[];

const typeIcons: Record<string, typeof Gift> = {
  "Primes voyage": Ticket,
  Avantages: Gift,
};

export function PatrimoineView({
  initialAssets,
  initialCredits,
}: PatrimoineViewProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [showAddPatrimoine, setShowAddPatrimoine] = useState(false);
  const [showAddAvantage, setShowAddAvantage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingAvantages, setImportingAvantages] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const { mask } = usePrivacy();

  const avantagesKpis = computeAvantagesKpis(assets);
  const { patrimoine: patrimoineAssets, avantages: avantagesAssets } =
    splitPatrimoineAssets(assets);

  const hasLiveCrypto = assets.some((asset) => isLiveCryptoAsset(asset));
  const hasBinance = assets.some(
    (asset) => asset.asset_type === "Compte Binance"
  );
  const hasAvantages = avantagesAssets.length > 0;

  async function refreshPrices() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const result = await refreshCryptoPricesAction();
      if (!result.ok) {
        setRefreshError(result.error);
        return;
      }
      setAssets(result.data);
      setLastRefresh(new Date());
    } catch {
      setRefreshError("Prix crypto indisponibles pour le moment.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleImportBinance() {
    setImporting(true);
    const result = await importBinanceHoldingsAction();
    setImporting(false);
    if (!result.ok) {
      setRefreshError(result.error);
      return;
    }
    if (result.data.added.length > 0) {
      setAssets((previous) =>
        [...result.data.added, ...previous].sort(
          (a, b) => Number(b.value_eur) - Number(a.value_eur)
        )
      );
      setLastRefresh(new Date());
    }
  }

  async function handleImportAvantages() {
    setImportingAvantages(true);
    const result = await importAvantagesHoldingsAction();
    setImportingAvantages(false);
    if (!result.ok) {
      setRefreshError(result.error);
      return;
    }
    if (result.data.added.length > 0) {
      setAssets((previous) =>
        [...result.data.added, ...previous].sort(
          (a, b) => Number(b.value_eur) - Number(a.value_eur)
        )
      );
    }
  }

  useEffect(() => {
    setAssets(initialAssets);

    const needsMigrate = initialAssets.some(
      (asset) => (asset.asset_type as string) === "Annexe C"
    );
    if (!needsMigrate) return;

    let cancelled = false;
    void migrateAnnexeCLabelAction().then((result) => {
      if (!cancelled && result.ok) setAssets(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [initialAssets]);

  function handleAssetAdded(asset: Asset) {
    setAssets((previous) =>
      [asset, ...previous].sort(
        (a, b) => Number(b.value_eur) - Number(a.value_eur)
      )
    );
    setShowAddPatrimoine(false);
    setShowAddAvantage(false);
  }

  function handleAssetDeleted(id: string) {
    setAssets((previous) => previous.filter((asset) => asset.id !== id));
  }

  function handleAssetUpdated(asset: Asset) {
    setAssets((previous) =>
      previous
        .map((item) => (item.id === asset.id ? asset : item))
        .sort((a, b) => Number(b.value_eur) - Number(a.value_eur))
    );
  }

  return (
    <PageShell>
      <header className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
            Patrimoine
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            onClick={() => {
              setShowAddPatrimoine((open) => !open);
              setShowAddAvantage(false);
            }}
            className="h-9 gap-1.5 rounded-full bg-zinc-900 px-3.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            aria-label="Ajouter au patrimoine"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
          {hasLiveCrypto ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void refreshPrices()}
              disabled={refreshing}
              className="size-9 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Actualiser les prix crypto"
              title="Actualiser les prix crypto"
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          ) : null}
          <ThemeToggle />
          <PrivacyToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <PatrimoineDashboard assets={assets} credits={initialCredits} />

      {hasLiveCrypto && (refreshing || lastRefresh || refreshError) ? (
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          {refreshing
            ? "Mise à jour des prix crypto…"
            : lastRefresh
              ? `Prix actualisés à ${lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : null}
          {refreshError ? ` ${refreshError}` : ""}
        </p>
      ) : null}

      {/* ——— GESTION PATRIMOINE ——— */}
      <section className="flex flex-col gap-5 md:gap-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Gérer
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Mes actifs
            </h2>
          </div>
        </div>

        {!hasBinance ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Importer ton wallet Binance (prix live)
              </p>
              <Button
                type="button"
                onClick={() => void handleImportBinance()}
                disabled={importing}
                className="h-9 rounded-full bg-zinc-900 px-4 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Importer Binance"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-8">
          {showAddPatrimoine ? (
            <div className="md:sticky md:top-8">
              <AssetForm
                onAssetAdded={handleAssetAdded}
                onCancel={() => setShowAddPatrimoine(false)}
                allowedTypes={PATRIMOINE_TYPES}
                title="Ajouter au patrimoine"
                description="Crypto, Binance, actions, cash, compte MA…"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddPatrimoine(true)}
              className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/50 px-6 py-10 text-center transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/70 md:sticky md:top-8"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Plus className="size-6" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                  Ajouter un actif
                </span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  Crypto, compte, actions…
                </span>
              </span>
            </button>
          )}

          <AssetList
            assets={patrimoineAssets}
            onAssetDeleted={handleAssetDeleted}
            onAssetUpdated={handleAssetUpdated}
            title="Liste des actifs"
            emptyHint="Crypto Binance, compte MA, cash, actions…"
          />
        </div>
      </section>

      {/* ——— CSE / CADEAUX ——— */}
      <section className="mt-10 flex flex-col gap-5 border-t border-zinc-200/80 pt-10 dark:border-zinc-800 md:mt-12 md:gap-6 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Cadeaux & CSE
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(avantagesKpis.total))}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Hors patrimoine · ANCV, Swile, HelloCSE…
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowAddAvantage((open) => !open);
              setShowAddPatrimoine(false);
            }}
            className="h-9 gap-1.5 rounded-full px-3 text-sm text-zinc-600 dark:text-zinc-300"
          >
            <Plus className="size-4" />
            Prime
          </Button>
        </div>

        {!hasAvantages ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                ANCV 400 € · Swile 25,71 € · HelloCSE 150 €
              </p>
              <Button
                type="button"
                onClick={() => void handleImportAvantages()}
                disabled={importingAvantages}
                className="h-9 rounded-full bg-zinc-900 px-4 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {importingAvantages ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Importer mes primes"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {avantagesKpis.byType.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {avantagesKpis.byType.map((item) => {
              const Icon = typeIcons[item.type] ?? Gift;
              return (
                <div
                  key={item.type}
                  className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-[12px] font-medium tracking-wide text-zinc-500 uppercase">
                    {item.type}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {mask(formatEuro(item.value))}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.count} solde{item.count > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-8">
          {showAddAvantage ? (
            <div className="md:sticky md:top-8">
              <AssetForm
                onAssetAdded={handleAssetAdded}
                onCancel={() => setShowAddAvantage(false)}
                allowedTypes={AVANTAGES_TYPES}
                title="Ajouter une prime CSE"
                description="Chèques vacances, Swile, HelloCSE…"
              />
            </div>
          ) : null}

          <div className={showAddAvantage ? "" : "md:col-span-2"}>
            <AssetList
              assets={avantagesAssets}
              onAssetDeleted={handleAssetDeleted}
              onAssetUpdated={handleAssetUpdated}
              title="Détail des primes"
              subtitle={
                avantagesAssets.length > 0
                  ? `${avantagesAssets.length} solde${avantagesAssets.length > 1 ? "s" : ""} · hors patrimoine`
                  : undefined
              }
              emptyTitle="Aucune prime CSE"
              emptyHint="ANCV, prime Noël Swile, culture HelloCSE…"
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
