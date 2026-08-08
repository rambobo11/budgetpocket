"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  HandCoins,
  Landmark,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const links: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/", label: "Dépenses", icon: Plus },
  { href: "/incomes", label: "Revenus", icon: Wallet },
  { href: "/patrimoine", label: "Patrimoine", icon: Landmark },
  { href: "/credits", label: "Crédit", icon: HandCoins },
  { href: "/dashboard", label: "Stats", icon: BarChart3 },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 md:mb-8">
      <div className="flex w-full rounded-full bg-zinc-200/80 p-1 dark:bg-zinc-800">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

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
      </div>
    </nav>
  );
}
