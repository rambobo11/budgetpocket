"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2, Pencil, Trash2, Landmark, X } from "lucide-react";
import {
  deleteAssetAction,
  updateAssetValueAction,
} from "@/app/actions/assets";
import {
  formatAssetValue,
  isLiveCryptoAsset,
} from "@/lib/assets";
import {
  formatCryptoQuantity,
  getCryptoCoin,
} from "@/lib/crypto";
import type { Asset } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetListProps = {
  assets: Asset[];
  onAssetDeleted?: (id: string) => void;
  onAssetUpdated?: (asset: Asset) => void;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyHint?: string;
  /** Nombre d’actifs visibles avant « Voir plus » */
  initialVisible?: number;
};

function isLiveCrypto(asset: Asset) {
  return isLiveCryptoAsset(asset);
}

export function AssetList({
  assets,
  onAssetDeleted,
  onAssetUpdated,
  title = "Mes actifs",
  subtitle,
  emptyTitle = "Aucun actif pour l’instant",
  emptyHint = "Ajoute crypto, actions, cash ou compte MA.",
  initialVisible = 5,
}: AssetListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { mask } = usePrivacy();

  const hasMore = assets.length > initialVisible;
  const visibleAssets =
    expanded || !hasMore ? assets : assets.slice(0, initialVisible);
  const hiddenCount = assets.length - initialVisible;

  async function handleDelete(asset: Asset) {
    const confirmed = window.confirm(
      `Supprimer cet actif ?\n${asset.name} — ${formatAssetValue(asset)}`
    );
    if (!confirmed) return;

    setDeletingId(asset.id);
    const result = await deleteAssetAction({ id: asset.id });
    setDeletingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    onAssetDeleted?.(asset.id);
  }

  function startEdit(asset: Asset) {
    setEditingId(asset.id);
    if (isLiveCrypto(asset)) {
      setEditValue(String(asset.quantity));
    } else {
      setEditValue(String(asset.value_original ?? asset.value_eur));
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveValue(asset: Asset) {
    const parsed = Number(editValue);
    if (editValue === "" || Number.isNaN(parsed) || parsed < 0) {
      window.alert(isLiveCrypto(asset) ? "Quantité invalide." : "Valeur invalide.");
      return;
    }

    setSavingId(asset.id);
    const result = await updateAssetValueAction({
      id: asset.id,
      value: parsed,
    });
    setSavingId(null);

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    setEditingId(null);
    setEditValue("");
    onAssetUpdated?.(result.data);
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Landmark className="size-5" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle ??
            `${assets.length} actif${assets.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleAssets.map((asset) => {
          const isEditing = editingId === asset.id;
          const coin = asset.coingecko_id
            ? getCryptoCoin(asset.coingecko_id)
            : null;
          const live = isLiveCrypto(asset);

          return (
            <li key={asset.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                      {asset.name}
                    </p>
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                      {asset.asset_type}
                    </span>
                    {live ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-400">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {live && coin && asset.quantity != null
                      ? `${mask(formatCryptoQuantity(Number(asset.quantity), coin.symbol))} · `
                      : asset.quantity != null
                        ? `${mask(`Qté ${Number(asset.quantity)}`)} · `
                        : ""}
                    MAJ{" "}
                    {format(new Date(asset.updated_at), "d MMM · HH:mm", {
                      locale: fr,
                    })}
                    {asset.notes ? ` · ${asset.notes}` : ""}
                  </p>

                  {isEditing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-9 w-36 rounded-lg border-zinc-200 pr-10 dark:border-zinc-700 dark:bg-zinc-950"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-zinc-400">
                          {live
                            ? (coin?.symbol ?? "")
                            : (asset.currency ?? "EUR") === "MAD"
                              ? "MAD"
                              : "€"}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => saveValue(asset)}
                        disabled={savingId === asset.id}
                        className="size-9 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        aria-label="Enregistrer"
                      >
                        {savingId === asset.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        className="size-9 rounded-full"
                        aria-label="Annuler"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(asset)}
                      className="inline-flex items-center gap-1 text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
                      title={live ? "Modifier la quantité" : "Modifier la valeur"}
                    >
                      {mask(formatAssetValue(asset))}
                      <Pencil className="size-3.5 text-zinc-400" />
                    </button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(asset)}
                    disabled={deletingId === asset.id}
                    className="size-9 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Supprimer l'actif"
                  >
                    {deletingId === asset.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <div className="border-t border-zinc-100 px-4 py-3 sm:px-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="w-full rounded-xl py-2.5 text-center text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
          >
            {expanded
              ? "Voir moins"
              : `Voir plus (${hiddenCount} autre${hiddenCount > 1 ? "s" : ""})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
