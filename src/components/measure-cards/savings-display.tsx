/**
 * Measure Card Savings Display
 *
 * Renders savings information according to the building's rate class:
 *
 * RPP customers (no demand charges):
 *   Annual energy savings: XX,XXX kWh → $X,XXX/year
 *   (Based on your TOU rate)
 *
 * Class B customers (energy + demand):
 *   Annual energy savings: XX,XXX kWh → $X,XXX/year
 *   Annual demand savings: XX kW reduction → $X,XXX/year
 *   Total annual savings: $X,XXX/year
 *   (Based on your spot market rate and demand charges)
 *
 * Card summary shows base case only for 10-year:
 *   "10-year savings: $XX,XXX (at current rate trends)"
 */

"use client";

import type { MeasureSavings } from "@/lib/rates/types";
import { formatDollars, formatKwh } from "@/lib/rates";

// ---------------------------------------------------------------------------
// Savings Summary (card face — 5-second scan)
// ---------------------------------------------------------------------------

interface SavingsSummaryProps {
  savings: MeasureSavings;
}

export function SavingsSummary({ savings }: SavingsSummaryProps) {
  const showDemand =
    savings.peakReductionApplicable && savings.demandSavingsAnnual;

  return (
    <div className="vm-savings-summary">
      {/* Energy savings */}
      <div className="flex justify-between items-baseline">
        <span
          className="text-sm"
          style={{ color: "var(--vm-gray-600)" }}
        >
          Annual energy savings
        </span>
        <span className="text-sm font-medium">
          {formatKwh(savings.energySavingsKwh)} kWh →{" "}
          <span style={{ color: "var(--vm-green)" }}>
            {formatDollars(savings.energySavingsDollars)}/yr
          </span>
        </span>
      </div>

      {/* Demand savings (Class B+ only) */}
      {showDemand && (
        <div className="flex justify-between items-baseline mt-1">
          <span
            className="text-sm"
            style={{ color: "var(--vm-gray-600)" }}
          >
            Annual demand savings
          </span>
          <span className="text-sm font-medium">
            {savings.peakReductionKw} kW reduction →{" "}
            <span style={{ color: "var(--vm-green)" }}>
              {formatDollars(savings.demandSavingsAnnual!)}/yr
            </span>
          </span>
        </div>
      )}

      {/* Total (only shown when there are demand savings) */}
      {showDemand && (
        <div
          className="flex justify-between items-baseline mt-2 pt-2"
          style={{ borderTop: "1px solid var(--vm-gray-200)" }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--vm-gray-700)" }}
          >
            Total annual savings
          </span>
          <span
            className="text-base font-bold"
            style={{ color: "var(--vm-green)" }}
          >
            {formatDollars(savings.totalSavingsAnnual)}/yr
          </span>
        </div>
      )}

      {/* 10-year base case (card summary — no toggle) */}
      <div
        className="mt-3 text-sm"
        style={{ color: "var(--vm-gray-500)" }}
      >
        10-year savings:{" "}
        <span className="font-medium" style={{ color: "var(--vm-gray-700)" }}>
          {formatDollars(savings.tenYearProjections.baseCase)}
        </span>{" "}
        (at current rate trends)
      </div>

      {/* Rate basis label */}
      <div
        className="mt-1 text-xs"
        style={{ color: "var(--vm-gray-400)" }}
      >
        {savings.rateBasisLabel}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Savings Detail (expanded view — 30-second analysis)
// ---------------------------------------------------------------------------

interface SavingsDetailProps {
  savings: MeasureSavings;
}

export function SavingsDetail({ savings }: SavingsDetailProps) {
  return (
    <div className="vm-savings-detail">
      {/* Summary section (same as card face) */}
      <SavingsSummary savings={savings} />

      {/* 10-year projection table (three scenarios) */}
      <div className="mt-6">
        <h4
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--vm-gray-700)" }}
        >
          10-Year Savings Projection
        </h4>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--vm-gray-200)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--vm-gray-50)" }}>
                <th
                  className="text-left px-4 py-2 font-medium"
                  style={{ color: "var(--vm-gray-600)" }}
                >
                  Scenario
                </th>
                <th
                  className="text-left px-4 py-2 font-medium"
                  style={{ color: "var(--vm-gray-600)" }}
                >
                  Rate Escalation
                </th>
                <th
                  className="text-right px-4 py-2 font-medium"
                  style={{ color: "var(--vm-gray-600)" }}
                >
                  10-Year Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--vm-gray-100)" }}>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-700)" }}>
                  Conservative
                </td>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-500)" }}>
                  2.0%/yr
                </td>
                <td
                  className="px-4 py-2 text-right font-medium"
                  style={{ color: "var(--vm-gray-700)" }}
                >
                  {formatDollars(savings.tenYearProjections.conservative)}
                </td>
              </tr>
              <tr
                style={{
                  borderTop: "1px solid var(--vm-gray-100)",
                  backgroundColor: "var(--vm-gray-50)",
                }}
              >
                <td
                  className="px-4 py-2 font-semibold"
                  style={{ color: "var(--vm-navy)" }}
                >
                  Base Case
                </td>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-500)" }}>
                  2.5%/yr
                </td>
                <td
                  className="px-4 py-2 text-right font-bold"
                  style={{ color: "var(--vm-green)" }}
                >
                  {formatDollars(savings.tenYearProjections.baseCase)}
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--vm-gray-100)" }}>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-700)" }}>
                  High Growth
                </td>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-500)" }}>
                  4.0–5.0%/yr
                </td>
                <td
                  className="px-4 py-2 text-right font-medium"
                  style={{ color: "var(--vm-gray-700)" }}
                >
                  {formatDollars(savings.tenYearProjections.highGrowth)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs" style={{ color: "var(--vm-gray-400)" }}>
          Conservative: Historical average, stable grid. Base Case: Current
          trend, moderate electrification growth. High Growth: IESO capacity
          expansion, data center demand, accelerated electrification.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate Class Badge
// ---------------------------------------------------------------------------

interface RateClassBadgeProps {
  rateClass: MeasureSavings["rateClass"];
}

export function RateClassBadge({ rateClass }: RateClassBadgeProps) {
  const config = BADGE_CONFIG[rateClass] ?? BADGE_CONFIG.unknown;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {config.label}
    </span>
  );
}

const BADGE_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  rpp_tou: {
    label: "TOU",
    bgColor: "#DBEAFE",
    textColor: "#1E40AF",
  },
  rpp_ulo: {
    label: "ULO",
    bgColor: "#DBEAFE",
    textColor: "#1E40AF",
  },
  rpp_tiered: {
    label: "Tiered",
    bgColor: "#DBEAFE",
    textColor: "#1E40AF",
  },
  class_b: {
    label: "Class B",
    bgColor: "#FEF3C7",
    textColor: "#92400E",
  },
  class_a: {
    label: "Class A",
    bgColor: "#D1FAE5",
    textColor: "#065F46",
  },
  unknown: {
    label: "Estimated",
    bgColor: "#F3F4F6",
    textColor: "#4B5563",
  },
};
