"use client";

import { useEffect, useState } from "react";
import { DatabaseBackup, X } from "lucide-react";
import {
  BACKUP_INTERVAL_MONTHS,
  BACKUP_SNOOZE_DAYS,
  formatBackupDate,
  getLastBackupDoneAt,
  isBackupReminderDue,
  markBackupDone,
  snoozeBackupReminder,
} from "@/lib/backup-reminder";
import { Button } from "@/components/ui/button";

export function BackupReminderBanner() {
  const [visible, setVisible] = useState(false);
  const [lastDoneLabel, setLastDoneLabel] = useState<string | null>(null);

  useEffect(() => {
    // Pose la baseline au 1er passage : pas de rappel avant 2 mois.
    const due = isBackupReminderDue();
    setVisible(due);
    const last = getLastBackupDoneAt();
    setLastDoneLabel(last ? formatBackupDate(last) : null);
  }, []);

  if (!visible) return null;

  function handleDone() {
    markBackupDone();
    setVisible(false);
  }

  function handleLater() {
    snoozeBackupReminder();
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200">
          <DatabaseBackup className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            Rappel backup Supabase
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            Tous les {BACKUP_INTERVAL_MONTHS} mois : exporte tes tables
            (expenses, incomes, assets, credits, upcoming) en CSV depuis
            Supabase → Table Editor, pour rester sur le plan gratuit en
            sécurité.
            {lastDoneLabel ? (
              <>
                {" "}
                Dernier point de départ / export :{" "}
                <span className="font-medium">{lastDoneLabel}</span>.
              </>
            ) : null}          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleDone}
              className="h-9 rounded-full bg-amber-900 px-3.5 text-amber-50 hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-white"
            >
              J’ai exporté
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleLater}
              className="h-9 rounded-full px-3.5 text-amber-900 hover:bg-amber-100/80 dark:text-amber-100 dark:hover:bg-amber-900/50"
            >
              Plus tard ({BACKUP_SNOOZE_DAYS} j)
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLater}
          className="shrink-0 rounded-full p-1.5 text-amber-800/70 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-200/70 dark:hover:bg-amber-900/60 dark:hover:text-amber-50"
          aria-label="Fermer le rappel"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
