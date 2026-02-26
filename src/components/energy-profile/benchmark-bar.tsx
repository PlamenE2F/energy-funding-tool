/**
 * Benchmark Comparison Bar
 *
 * Visual comparison of user's EUI against the median.
 * Three-tier indicator: Below median (better), Near median (±15%), Above median (worse).
 * Shows cost intensity range for GREEN types.
 * Shows caveat for YELLOW types.
 */

"use client";

import type { BenchmarkTier } from "@/lib/eui/types";

interface BenchmarkBarProps {
  userEui: number;
  benchmarkEui: number;
  benchmarkTier: BenchmarkTier;
  userVsMedianPct: number;
  caveatText: string | null;
  costIntensityLow: number | null;
  costIntensityHigh: number | null;
  comparisonNote: string | null;
}

const TIER_CONFIG: Record<
  BenchmarkTier,
  { label: string; color: string; bgColor: string }
> = {
  below_median: {
    label: "Below Median",
    color: "#065F46",
    bgColor: "#D1FAE5",
  },
  near_median: {
    label: "Near Median",
    color: "#92400E",
    bgColor: "#FEF3C7",
  },
  above_median: {
    label: "Above Median",
    color: "#991B1B",
    bgColor: "#FEE2E2",
  },
};

export function BenchmarkBar({
  userEui,
  benchmarkEui,
  benchmarkTier,
  userVsMedianPct,
  caveatText,
  costIntensityLow,
  costIntensityHigh,
  comparisonNote,
}: BenchmarkBarProps) {
  const tierConfig = TIER_CONFIG[benchmarkTier];
  const absPct = Math.abs(userVsMedianPct);
  const direction = userVsMedianPct > 0 ? "more" : "less";

  // Calculate bar positions (user relative to benchmark)
  const maxEui = Math.max(userEui, benchmarkEui) * 1.3;
  const userPct = (userEui / maxEui) * 100;
  const benchmarkPct = (benchmarkEui / maxEui) * 100;

  return (
    <div>
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: "var(--vm-gray-700)" }}
      >
        Benchmark Comparison
      </h3>

      {/* Tier Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: tierConfig.bgColor,
            color: tierConfig.color,
          }}
        >
          {tierConfig.label}
        </span>
        <span className="text-sm" style={{ color: "var(--vm-gray-600)" }}>
          Your building uses {absPct.toFixed(0)}% {direction} energy than the
          median for comparable buildings
        </span>
      </div>

      {/* Visual Bar */}
      <div
        className="relative h-8 rounded-lg overflow-hidden mb-2"
        style={{ backgroundColor: "var(--vm-gray-100)" }}
      >
        {/* User bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-lg transition-all"
          style={{
            width: `${Math.min(userPct, 100)}%`,
            backgroundColor: tierConfig.bgColor,
            border: `2px solid ${tierConfig.color}`,
          }}
        />
        {/* Benchmark marker */}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{
            left: `${Math.min(benchmarkPct, 100)}%`,
            backgroundColor: "var(--vm-gray-600)",
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs" style={{ color: "var(--vm-gray-500)" }}>
        <span>Your EUI: {userEui.toFixed(1)} kWh/sqft</span>
        <span>Median: {benchmarkEui.toFixed(1)} kWh/sqft</span>
      </div>

      {/* Cost Intensity (GREEN types only) */}
      {costIntensityLow !== null && costIntensityHigh !== null && (
        <p className="mt-3 text-sm" style={{ color: "var(--vm-gray-600)" }}>
          Comparable buildings in Ontario typically spend $
          {costIntensityLow.toFixed(2)}–${costIntensityHigh.toFixed(2)}
          /sqft/year on energy
        </p>
      )}

      {/* Comparison note (electricity-only) */}
      {comparisonNote && (
        <p className="mt-2 text-xs" style={{ color: "var(--vm-gray-400)" }}>
          {comparisonNote}
        </p>
      )}

      {/* Caveat (YELLOW types) */}
      {caveatText && (
        <div
          className="mt-3 rounded-lg p-3 text-sm"
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid var(--vm-amber)",
            color: "#92400E",
          }}
        >
          {caveatText}
        </div>
      )}
    </div>
  );
}
