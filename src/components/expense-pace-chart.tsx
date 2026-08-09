"use client";

import { useId, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Expense } from "@/lib/types";
import {
  computeExpensePaceSeries,
  formatEuro,
  formatSignedEuro,
} from "@/lib/kpis";
import { usePrivacy } from "@/components/privacy-provider";

type ExpensePaceChartProps = {
  month: Date;
  expenses: Expense[];
  previousExpenses: Expense[];
};

const WIDTH = 680;
const HEIGHT = 248;
const PAD = { top: 22, right: 20, bottom: 32, left: 76 };
const BAR_HEIGHT_RATIO = 0.42;

/** Couleurs SVG explicites — Tailwind fill/dark:fill est peu fiable sur <svg>. */
const CHART_COLORS = {
  light: {
    bar: "#0d9488",
    barActive: "#0f766e",
    barLabel: "#115e59",
    line: "#18181b",
    previous: "#78716c",
    area: "#0d9488",
    grid: "#d4d4d8",
    axis: "#52525b",
    dot: "#18181b",
  },
  dark: {
    bar: "#2dd4bf",
    barActive: "#5eead4",
    barLabel: "#99f6e4",
    line: "#fafafa",
    previous: "#d6d3d1",
    area: "#2dd4bf",
    grid: "#52525b",
    axis: "#a1a1aa",
    dot: "#fafafa",
  },
} as const;

function buildPath(
  values: number[],
  xAt: (i: number) => number,
  yAt: (v: number) => number
) {
  if (values.length === 0) return "";
  return values
    .map((value, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`;
    })
    .join(" ");
}

function buildArea(
  values: number[],
  xAt: (i: number) => number,
  yAt: (v: number) => number,
  baselineY: number
) {
  if (values.length === 0) return "";
  const line = buildPath(values, xAt, yAt);
  const lastX = xAt(values.length - 1);
  const firstX = xAt(0);
  return `${line} L${lastX.toFixed(1)} ${baselineY.toFixed(1)} L${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

export function ExpensePaceChart({
  month,
  expenses,
  previousExpenses,
}: ExpensePaceChartProps) {
  const { mask } = usePrivacy();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;
  const gradientId = useId().replace(/:/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const series = useMemo(
    () => computeExpensePaceSeries(month, expenses, previousExpenses),
    [month, expenses, previousExpenses]
  );

  const chart = useMemo(() => {
    const { points } = series;
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const maxCumulative = Math.max(
      ...points.map((p) =>
        Math.max(p.currentCumulative, p.previousCumulative)
      ),
      1
    );
    const maxDaily = Math.max(...points.map((p) => p.currentDaily), 1);
    const n = Math.max(points.length - 1, 1);
    const slot =
      points.length > 0 ? innerW / Math.max(points.length, 1) : innerW;
    const barWidth = Math.min(Math.max(slot * 0.58, 8), 30);

    const xAt = (i: number) => PAD.left + (i / n) * innerW;
    const yAt = (v: number) =>
      PAD.top + innerH - (v / maxCumulative) * innerH;
    const barY = (daily: number) => {
      const h = (daily / maxDaily) * innerH * BAR_HEIGHT_RATIO;
      return {
        y: PAD.top + innerH - h,
        height: Math.max(h, daily > 0 ? 3 : 0),
      };
    };
    const baselineY = PAD.top + innerH;

    const currentValues = points.map((p) => p.currentCumulative);
    const previousValues = points.map((p) => p.previousCumulative);

    const yTicks = [0, 0.5, 1].map((ratio) => ({
      value: maxCumulative * ratio,
      y: yAt(maxCumulative * ratio),
    }));

    const xLabelIndexes =
      points.length <= 10
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
            (v, i, arr) => arr.indexOf(v) === i
          );

    return {
      xAt,
      yAt,
      barY,
      barWidth,
      baselineY,
      innerH,
      currentPath: buildPath(currentValues, xAt, yAt),
      previousPath: buildPath(previousValues, xAt, yAt),
      areaPath: buildArea(currentValues, xAt, yAt, baselineY),
      yTicks,
      xLabelIndexes,
    };
  }, [series]);

  const positiveDelta = series.deltaAtDate <= 0;
  const activeIndex = pinnedIndex ?? hoverIndex;
  const active =
    activeIndex != null
      ? series.points[activeIndex]
      : (series.points.at(-1) ?? null);
  const isInspecting = activeIndex != null;

  if (series.isEmpty) {
    return (
      <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Rythme du mois
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Cumul + dépense du jour vs mois précédent
        </p>
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucune dépense sur ce mois ni le précédent.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Rythme du mois
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Survole ou clique une barre · vs {series.previousLabel}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            positiveDelta
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
          }`}
        >
          {positiveDelta ? (
            <TrendingDown className="size-3.5" />
          ) : (
            <TrendingUp className="size-3.5" />
          )}
          {mask(formatSignedEuro(series.deltaAtDate))} à date
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ backgroundColor: colors.bar }}
          />
          Jour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ backgroundColor: colors.line }}
          />
          Cumul
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-4"
            style={{
              height: 2,
              backgroundImage: `repeating-linear-gradient(90deg, ${colors.previous} 0 3px, transparent 3px 6px)`,
            }}
          />
          Mois précédent
        </span>
      </div>

      {active ? (
        <div
          className="mt-3 rounded-2xl px-3.5 py-2.5 transition-colors"
          style={
            isInspecting
              ? isDark
                ? {
                    backgroundColor: "#042f2e",
                    boxShadow: "inset 0 0 0 1px rgba(45, 212, 191, 0.4)",
                  }
                : {
                    backgroundColor: "#f0fdfa",
                    boxShadow: "inset 0 0 0 1px rgba(13, 148, 136, 0.35)",
                  }
              : isDark
                ? { backgroundColor: "#27272a" }
                : { backgroundColor: "#f4f4f5" }
          }
        >
          <p
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: isDark ? "#5eead4" : "#115e59" }}
          >
            {isInspecting ? `Dépenses du ${active.day}` : `Jour ${active.day}`}
          </p>
          <p
            className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums"
            style={{ color: isDark ? "#fafafa" : "#18181b" }}
          >
            {mask(formatEuro(active.currentDaily))}
          </p>
          <p
            className="mt-1 text-xs tabular-nums"
            style={{ color: isDark ? "#a1a1aa" : "#52525b" }}
          >
            cumul {mask(formatEuro(active.currentCumulative))}
            {" · "}
            préc. {mask(formatEuro(active.previousCumulative))}
          </p>
        </div>
      ) : null}

      <div className="relative mt-2 w-full overflow-x-auto overflow-y-visible">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[300px] cursor-crosshair"
          role="img"
          aria-label="Dépenses journalières et cumul du mois versus mois précédent"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.area} stopOpacity="0.22" />
              <stop offset="100%" stopColor={colors.area} stopOpacity="0" />
            </linearGradient>
          </defs>

          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={tick.y + 3}
                textAnchor="end"
                fill={colors.axis}
                style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
              >
                {mask(formatEuro(tick.value))}
              </text>
            </g>
          ))}

          {series.points.map((point, index) => {
            const cx = chart.xAt(index);
            const { y, height } = chart.barY(point.currentDaily);
            const isActive = activeIndex === index;
            const hitWidth = Math.max(
              (WIDTH - PAD.left - PAD.right) / series.points.length,
              18
            );
            const hitY = PAD.top + chart.innerH * (1 - BAR_HEIGHT_RATIO) - 8;
            const hitH = chart.innerH * BAR_HEIGHT_RATIO + 16;

            return (
              <g key={`bar-${point.day}`}>
                {point.currentDaily > 0 || isActive ? (
                  <rect
                    x={cx - chart.barWidth / 2}
                    y={point.currentDaily > 0 ? y : chart.baselineY - 3}
                    width={chart.barWidth}
                    height={point.currentDaily > 0 ? height : 3}
                    rx={4}
                    fill={isActive ? colors.barActive : colors.bar}
                    opacity={isActive ? 1 : 0.88}
                  />
                ) : null}
                {isActive ? (
                  <text
                    x={cx}
                    y={Math.max(
                      (point.currentDaily > 0 ? y : chart.baselineY - 3) - 8,
                      PAD.top + 10
                    )}
                    textAnchor="middle"
                    fill={colors.barLabel}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {mask(formatEuro(point.currentDaily))}
                  </text>
                ) : null}
                <rect
                  x={cx - hitWidth / 2}
                  y={hitY}
                  width={hitWidth}
                  height={hitH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(index)}
                  onFocus={() => setHoverIndex(index)}
                  onClick={() =>
                    setPinnedIndex((prev) => (prev === index ? null : index))
                  }
                >
                  <title>
                    Jour {point.day} : {mask(formatEuro(point.currentDaily))}
                  </title>
                </rect>
              </g>
            );
          })}

          <path d={chart.areaPath} fill={`url(#${gradientId})`} />
          <path
            d={chart.previousPath}
            fill="none"
            stroke={colors.previous}
            strokeWidth={2.25}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={chart.currentPath}
            fill="none"
            stroke={colors.line}
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {series.points.map((point, index) => {
            const cx = chart.xAt(index);
            const cy = chart.yAt(point.currentCumulative);
            const isActive = activeIndex === index;
            const hitWidth = Math.max(
              (WIDTH - PAD.left - PAD.right) / series.points.length,
              18
            );
            return (
              <g key={`line-${point.day}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 5 : 0}
                  fill={colors.dot}
                />
                <rect
                  x={cx - hitWidth / 2}
                  y={PAD.top}
                  width={hitWidth}
                  height={chart.innerH * (1 - BAR_HEIGHT_RATIO)}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(index)}
                  onClick={() =>
                    setPinnedIndex((prev) => (prev === index ? null : index))
                  }
                >
                  <title>
                    Jour {point.day} : {mask(formatEuro(point.currentDaily))}
                  </title>
                </rect>
              </g>
            );
          })}

          {chart.xLabelIndexes.map((index) => {
            const point = series.points[index];
            if (!point) return null;
            return (
              <text
                key={`x-${point.day}`}
                x={chart.xAt(index)}
                y={HEIGHT - 8}
                textAnchor="middle"
                fill={colors.axis}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {point.day}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
