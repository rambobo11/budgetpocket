"use client";

import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { useTheme } from "next-themes";
import {
  buildCashflowModel,
  type CashflowLink,
  type CashflowNode,
} from "@/lib/cashflow";
import { formatEuro } from "@/lib/format";
import { formatSignedEuro } from "@/lib/kpis";
import type { Expense, Income } from "@/lib/types";
import { usePrivacy } from "@/components/privacy-provider";

type CashflowSankeyProps = {
  incomes: Income[];
  expenses: Expense[];
};

type LayoutNode = CashflowNode & {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type LayoutLink = {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  width: number;
  y0: number;
  y1: number;
};

const WIDTH = 920;
const HEIGHT = 420;
const NODE_WIDTH = 16;
const NODE_PADDING = 20;

/** Palette claire / saturée — lisible en light & dark (évite le gris-noir). */
const FLOW_PALETTE = [
  "#0d9488", // teal
  "#0284c7", // sky
  "#ea580c", // orange
  "#ca8a04", // amber
  "#16a34a", // green
  "#e11d48", // rose
  "#0891b2", // cyan
  "#65a30d", // lime
  "#c2410c", // burnt orange
  "#2563eb", // blue
];

function hashColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FLOW_PALETTE[hash % FLOW_PALETTE.length];
}

function nodeColor(
  node: Pick<CashflowNode, "id" | "kind">,
  isDark: boolean
): string {
  switch (node.kind) {
    case "source":
      return hashColor(node.id);
    case "budget":
      return isDark ? "#a1a1aa" : "#3f3f46";
    case "category":
      return hashColor(node.id);
    case "savings":
      return "#10b981";
    case "deficit":
      return "#f43f5e";
    default:
      return "#71717a";
  }
}

function linkStroke(link: LayoutLink, isDark: boolean): string {
  // Couleur du flux = destination (plus lisible type Finary)
  if (link.target.kind === "budget") {
    return nodeColor(link.source, isDark);
  }
  return nodeColor(link.target, isDark);
}

export function CashflowSankey({ incomes, expenses }: CashflowSankeyProps) {
  const { mask } = usePrivacy();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const labelFill = isDark ? "#fafafa" : "#18181b";
  const amountFill = isDark ? "#a1a1aa" : "#52525b";
  const linkOpacity = isDark ? 0.55 : 0.42;

  const model = useMemo(
    () => buildCashflowModel(incomes, expenses),
    [incomes, expenses]
  );

  const graph = useMemo(() => {
    if (!model.hasData) return null;

    const layout = sankey<CashflowNode, CashflowLink>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [12, 16],
        [WIDTH - 12, HEIGHT - 16],
      ]);

    const raw: SankeyGraph<CashflowNode, CashflowLink> = {
      nodes: model.nodes.map((node) => ({ ...node })),
      links: model.links.map((link) => ({ ...link })),
    };

    return layout(raw) as unknown as {
      nodes: LayoutNode[];
      links: LayoutLink[];
    };
  }, [model]);

  const path = sankeyLinkHorizontal();
  const animKey = `${model.incomeTotal}-${model.expenseTotal}-${model.nodes
    .map((n) => n.id)
    .join("|")}`;

  if (!model.hasData || !graph) {
    return (
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Cashflow
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Revenus → budget → catégories
        </p>
        <p className="px-2 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Ajoute des revenus et des dépenses sur ce mois pour voir le flux.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <style>{`
        @keyframes pb-sankey-flow {
          from { stroke-dashoffset: 1; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: var(--pb-link-opacity); }
        }
        @keyframes pb-sankey-node {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pb-sankey-link {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: pb-sankey-flow 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .pb-sankey-node {
          opacity: 0;
          animation: pb-sankey-node 550ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .pb-sankey-link,
          .pb-sankey-node {
            animation: none !important;
            opacity: 1 !important;
            stroke-dashoffset: 0 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cashflow
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Revenus → budget → catégories
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Entrées {mask(formatEuro(model.incomeTotal))}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Sorties {mask(formatEuro(model.expenseTotal))}
          </span>
          <span
            className={`rounded-full px-3 py-1 font-semibold tabular-nums ${
              model.savings >= 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
            }`}
          >
            {mask(formatSignedEuro(model.savings))}
          </span>
        </div>
      </div>

      <div className="mt-4 -mx-1 overflow-x-auto">
        <svg
          key={animKey}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto min-w-[640px] w-full"
          role="img"
          aria-label="Diagramme de cashflow du mois"
          style={{ ["--pb-link-opacity" as string]: String(linkOpacity) }}
        >
          {graph.links.map((link, index) => {
            const d = path(link as never);
            if (!d) return null;
            return (
              <path
                key={`${link.source.id}-${link.target.id}-${index}`}
                className="pb-sankey-link"
                d={d}
                fill="none"
                stroke={linkStroke(link, isDark)}
                strokeOpacity={linkOpacity}
                strokeWidth={Math.max(link.width, 2)}
                pathLength={1}
                style={{
                  animationDelay: `${80 + index * 45}ms`,
                }}
              >
                <title>
                  {link.source.label} → {link.target.label}:{" "}
                  {mask(formatEuro(link.value))}
                </title>
              </path>
            );
          })}

          {graph.nodes.map((node, index) => {
            const fill = nodeColor(node, isDark);
            const labelLeft = node.x0 < WIDTH / 2;
            const textX = labelLeft ? node.x1 + 12 : node.x0 - 12;
            const textAnchor = labelLeft ? "start" : "end";
            const midY = (node.y0 + node.y1) / 2;
            const delay = `${120 + index * 40}ms`;

            return (
              <g
                key={node.id}
                className="pb-sankey-node"
                style={{ animationDelay: delay }}
              >
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(node.y1 - node.y0, 2)}
                  rx={5}
                  fill={fill}
                >
                  <title>
                    {node.label}: {mask(formatEuro(node.value))}
                  </title>
                </rect>
                <text
                  x={textX}
                  y={midY - 7}
                  textAnchor={textAnchor}
                  fill={labelFill}
                  style={{ fontSize: 13, fontWeight: 650 }}
                >
                  {node.label}
                </text>
                <text
                  x={textX}
                  y={midY + 11}
                  textAnchor={textAnchor}
                  fill={amountFill}
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  {mask(formatEuro(node.value))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
