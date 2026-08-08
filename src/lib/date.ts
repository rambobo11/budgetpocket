import { endOfMonth, format, startOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** Fuseau métier de l’app (évite le décalage UTC serveur Vercel). */
export const APP_TIMEZONE = "Europe/Paris";

/** Instant courant, projeté en calendrier Europe/Paris. */
export function nowInAppTz(date: Date = new Date()): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

/** Début de mois courant (calendrier Paris). */
export function currentMonthStart(): Date {
  return startOfMonth(nowInAppTz());
}

/** Date par défaut pour un mois affiché (aujourd’hui si mois courant). */
export function defaultDateForMonth(month: Date): string {
  const now = nowInAppTz();
  const isCurrent =
    now.getFullYear() === month.getFullYear() &&
    now.getMonth() === month.getMonth();

  if (isCurrent) {
    return format(now, "yyyy-MM-dd");
  }

  return format(startOfMonth(month), "yyyy-MM-dd");
}

/** Bornes min/max (yyyy-MM-dd) pour un input date sur le mois affiché. */
export function monthBounds(month: Date) {
  return {
    min: format(startOfMonth(month), "yyyy-MM-dd"),
    max: format(endOfMonth(month), "yyyy-MM-dd"),
  };
}

/**
 * Bornes ISO UTC du mois calendaire (année/mois lus sur `month`),
 * interprétées en Europe/Paris.
 */
export function monthIsoBounds(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const start = fromZonedTime(
    new Date(year, monthIndex, 1, 0, 0, 0, 0),
    APP_TIMEZONE
  );
  const end = fromZonedTime(
    new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
    APP_TIMEZONE
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Stocke une date calendaire (yyyy-MM-dd) à midi UTC —
 * indépendant du TZ du process (dev local vs Vercel).
 */
export function calendarDateToIso(dateYmd: string): string {
  return `${dateYmd}T12:00:00.000Z`;
}

/** Vérifie qu’une chaîne yyyy-MM-dd est un jour calendaire réel. */
export function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Vérifie yyyy-MM (mois 01–12). */
export function isRealBudgetMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}
