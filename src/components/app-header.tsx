"use client";

import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

type AppHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Ligne sous le titre (ex. total du mois). */
  meta?: ReactNode;
  /** Actions supplémentaires à gauche des toggles. */
  actions?: ReactNode;
};

/**
 * Chrome commun : marque compacte + titre + toggles.
 * Réduit la hauteur sous le safe-area iPhone.
 */
export function AppHeader({ title, subtitle, meta, actions }: AppHeaderProps) {
  return (
    <header className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.1em] text-zinc-400 uppercase dark:text-zinc-500">
          PocketBudget
        </p>
        <div className="mt-0.5">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </div>
        ) : null}
        {meta ? <div className="mt-1.5">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {actions}
        <ThemeToggle />
        <PrivacyToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
