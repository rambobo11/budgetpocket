import { addMonths, format, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const LAST_DONE_KEY = "pocketbudget-backup-last-done";
const SNOOZE_KEY = "pocketbudget-backup-snooze-until";

/** Intervalle entre deux rappels d’export Supabase. */
export const BACKUP_INTERVAL_MONTHS = 2;

/** Report “Plus tard” (jours). */
export const BACKUP_SNOOZE_DAYS = 7;

export function getLastBackupDoneAt(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_DONE_KEY);
    if (!raw) return null;
    const date = parseISO(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Première visite : pose une date de départ = maintenant,
 * pour que le 1er rappel arrive seulement dans 2 mois.
 */
export function ensureBackupBaseline(at: Date = new Date()): Date {
  const existing = getLastBackupDoneAt();
  if (existing) return existing;
  markBackupDone(at);
  return at;
}

export function markBackupDone(at: Date = new Date()): void {
  try {
    localStorage.setItem(LAST_DONE_KEY, at.toISOString());
    localStorage.removeItem(SNOOZE_KEY);
  } catch {
    /* ignore */
  }
}

export function snoozeBackupReminder(
  days: number = BACKUP_SNOOZE_DAYS,
  from: Date = new Date()
): void {
  try {
    const until = new Date(from);
    until.setDate(until.getDate() + days);
    localStorage.setItem(SNOOZE_KEY, until.toISOString());
  } catch {
    /* ignore */
  }
}

function getSnoozeUntil(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return null;
    const date = parseISO(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function getNextBackupDueAt(lastDone: Date): Date {
  return addMonths(lastDone, BACKUP_INTERVAL_MONTHS);
}

export function isBackupReminderDue(now: Date = new Date()): boolean {
  const snoozeUntil = getSnoozeUntil();
  if (snoozeUntil && isBefore(now, snoozeUntil)) {
    return false;
  }

  const lastDone = ensureBackupBaseline(now);
  const dueAt = getNextBackupDueAt(lastDone);
  return !isBefore(now, dueAt);
}

export function formatBackupDate(date: Date): string {
  return format(date, "d MMM yyyy", { locale: fr });
}
