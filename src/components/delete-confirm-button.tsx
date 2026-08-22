"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteConfirmButtonProps = {
  ariaLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
};

/**
 * Trash → Annuler / Supprimer (évite window.confirm sur iOS PWA).
 */
export function DeleteConfirmButton({
  ariaLabel = "Supprimer",
  busy = false,
  onConfirm,
  className = "",
}: DeleteConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className={`flex shrink-0 items-center gap-1 ${className}`}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="h-8 rounded-full px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void onConfirm()}
          className="h-8 rounded-full px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Supprimer"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={busy}
      onClick={() => setConfirming(true)}
      className={`size-9 shrink-0 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 ${className}`}
      aria-label={ariaLabel}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </Button>
  );
}
