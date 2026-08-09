"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  FileText,
  HandCoins,
  Landmark,
  MoreHorizontal,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const primaryLinks: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/", label: "Dépenses", icon: Plus },
  { href: "/incomes", label: "Revenus", icon: Wallet },
  { href: "/patrimoine", label: "Patrimoine", icon: Landmark },
  { href: "/credits", label: "Crédit", icon: HandCoins },
  { href: "/a-venir", label: "À venir", icon: CalendarClock },
];

const moreLinks: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/dashboard",
    label: "Stats",
    description: "KPIs, cashflow, catégories",
    icon: BarChart3,
  },
  {
    href: "/synthese",
    label: "Synthèse",
    description: "Export Markdown pour IA",
    icon: FileText,
  },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = moreLinks.some((link) => isActivePath(pathname, link.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (moreRef.current && !moreRef.current.contains(target)) {
        setMoreOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <nav className="mb-5 md:mb-8">
      <div className="flex w-full rounded-full bg-zinc-200/80 p-1 dark:bg-zinc-800">
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-2 text-[11px] font-semibold tracking-tight transition-all sm:gap-1.5 sm:px-3 sm:text-xs md:py-2.5 md:text-sm ${
                active
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="size-3.5 shrink-0 sm:size-4" strokeWidth={2.25} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}

        <div ref={moreRef} className="relative flex min-w-0 flex-1">
          <button
            type="button"
            aria-label="Plus"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((value) => !value)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-2 text-[11px] font-semibold tracking-tight transition-all sm:gap-1.5 sm:px-3 sm:text-xs md:py-2.5 md:text-sm ${
              moreActive || moreOpen
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <MoreHorizontal
              className="size-3.5 shrink-0 sm:size-4"
              strokeWidth={2.25}
            />
            <span className="truncate">Plus</span>
          </button>

          {moreOpen ? (
            <div
              role="menu"
              className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-zinc-900"
            >
              {moreLinks.map(({ href, label, description, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                    }`}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <Icon className="size-4" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
