/**
 * LED Lighting Retrofit — Measure Card
 *
 * Above-fold: 5-second scan — savings headline, payback, CO₂
 * Below-fold: 30-second detail — cost breakdown, NPV, incentives, flags
 *
 * Handles edge cases: greenhouse (non-applicable), already LED, data center note,
 * small building DIY note, long payback warning.
 */

"use client";

import { useState } from "react";
import type { LedCalculationResult, LedFlag } from "@/lib/measures/led-lighting";
import { formatDollars, formatKwh } from "@/lib/rates";

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

interface LedMeasureCardProps {
  result: LedCalculationResult;
}

export function LedMeasureCard({ result }: LedMeasureCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Non-applicable building type (greenhouse)
  if (!result.measureApplicable) {
    return <LedNonApplicableCard result={result} />;
  }

  // Already LED — no savings
  if (result.savingsPct === 0 && result.annualSavingsKwh === 0) {
    return <LedAlreadyOptimizedCard result={result} />;
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--vm-white)",
        border: "1px solid var(--vm-gray-200)",
        boxShadow: "var(--vm-card-shadow)",
      }}
    >
      {/* Above-fold: 5-second scan */}
      <div style={{ padding: "var(--vm-card-padding)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--vm-navy)" }}
            >
              LED Lighting Retrofit
            </h3>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <RateClassLabel rateClass={result.rateClassUsed} />
        </div>

        {/* Savings headline */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <MetricBlock
            label="Annual savings"
            value={formatDollars(result.annualTotalSavingsDollars)}
            subtext={`${formatKwh(result.annualSavingsKwh)} kWh/yr`}
            highlight
          />
          <MetricBlock
            label="Simple payback"
            value={formatPayback(result.paybackLower, result.paybackUpper, result.paybackImmediate)}
            subtext="After incentives"
          />
          <MetricBlock
            label="CO₂ reduction"
            value={`${result.co2ReductionTonnes} t`}
            subtext="per year"
          />
        </div>

        {/* Incentive callout */}
        {result.incentiveEstimate > 0 && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#166534",
            }}
          >
            Estimated SaveOnEnergy incentive:{" "}
            <span className="font-semibold">
              {formatDollars(result.incentiveEstimate)}
            </span>
          </div>
        )}

        {/* Flags (above-fold: show warnings only) */}
        {result.flags
          .filter((f) => f.type === "warning")
          .map((flag, i) => (
            <FlagBanner key={i} flag={flag} />
          ))}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 text-sm font-medium py-2 rounded-lg"
          style={{
            color: "var(--vm-green-cta)",
            backgroundColor: "transparent",
            border: "1px solid var(--vm-gray-200)",
          }}
        >
          {expanded ? "Show less" : "View detailed breakdown"}
        </button>
      </div>

      {/* Below-fold: 30-second detail */}
      {expanded && (
        <div
          style={{
            padding: "0 var(--vm-card-padding) var(--vm-card-padding)",
            borderTop: "1px solid var(--vm-gray-100)",
          }}
        >
          <LedDetailView result={result} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail View (Below-Fold)
// ---------------------------------------------------------------------------

function LedDetailView({ result }: { result: LedCalculationResult }) {
  return (
    <div className="pt-4 space-y-6">
      {/* Energy breakdown */}
      <section>
        <SectionTitle>Energy Breakdown</SectionTitle>
        <DetailRow
          label="Estimated lighting energy"
          value={`${formatKwh(result.lightingEnergyKwh)} kWh/yr`}
          note={`${(result.lightingShareUsed * 100).toFixed(0)}% of total electricity`}
        />
        <DetailRow
          label="LED savings potential"
          value={`${(result.savingsPct * 100).toFixed(0)}%`}
          note={`→ ${formatKwh(result.annualSavingsKwh)} kWh saved`}
        />
      </section>

      {/* Dollar savings */}
      <section>
        <SectionTitle>Annual Savings</SectionTitle>
        <DetailRow
          label="Energy savings"
          value={formatDollars(result.annualEnergySavingsDollars)}
          note={`at ${formatRate(result.electricityRateUsed)}/kWh`}
        />
        {result.annualDemandSavingsDollars > 0 && (
          <DetailRow
            label="Demand charge savings"
            value={formatDollars(result.annualDemandSavingsDollars)}
            note={`${result.peakDemandReductionKw} kW × ${formatRate(result.demandChargeRateUsed!)}/kW × 12 mo`}
          />
        )}
        <DetailRow
          label="Total annual savings"
          value={formatDollars(result.annualTotalSavingsDollars)}
          bold
        />
      </section>

      {/* Cost and incentive */}
      <section>
        <SectionTitle>Cost &amp; Incentives</SectionTitle>
        <DetailRow
          label="Estimated project cost"
          value={`${formatDollars(result.costMidpoint)} – ${formatDollars(result.costUpper)}`}
        />
        <DetailRow
          label="SaveOnEnergy incentive"
          value={`– ${formatDollars(result.incentiveEstimate)}`}
          note="$0.20/kWh saved, capped at 50% of project cost"
          highlight
        />
        <DetailRow
          label="Net cost after incentive"
          value={`${formatDollars(result.netCostMidpoint)} – ${formatDollars(result.netCostUpper)}`}
          bold
        />
      </section>

      {/* NPV table */}
      <section>
        <SectionTitle>10-Year Net Present Value</SectionTitle>
        <NpvTable result={result} />
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--vm-gray-400)" }}
        >
          NPV calculated at 6% discount rate over 10 years. Savings escalated
          at scenario rate annually.
        </p>
      </section>

      {/* All flags */}
      {result.flags.length > 0 && (
        <section>
          <SectionTitle>Notes</SectionTitle>
          {result.flags.map((flag, i) => (
            <FlagBanner key={i} flag={flag} />
          ))}
        </section>
      )}

      {/* Confidence note */}
      <div
        className="text-xs pt-3"
        style={{
          color: "var(--vm-gray-400)",
          borderTop: "1px solid var(--vm-gray-100)",
        }}
      >
        {result.confidenceNote}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPV Table
// ---------------------------------------------------------------------------

function NpvTable({ result }: { result: LedCalculationResult }) {
  return (
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
              10-Year NPV
            </th>
          </tr>
        </thead>
        <tbody>
          <NpvRow label="Conservative" rate="2.0%/yr" value={result.npvConservative} />
          <NpvRow
            label="Base Case"
            rate="2.5%/yr"
            value={result.npvBase}
            highlighted
          />
          <NpvRow label="High Growth" rate="4.5%/yr" value={result.npvHigh} />
        </tbody>
      </table>
    </div>
  );
}

function NpvRow({
  label,
  rate,
  value,
  highlighted,
}: {
  label: string;
  rate: string;
  value: number;
  highlighted?: boolean;
}) {
  return (
    <tr
      style={{
        borderTop: "1px solid var(--vm-gray-100)",
        backgroundColor: highlighted ? "var(--vm-gray-50)" : undefined,
      }}
    >
      <td
        className={`px-4 py-2 ${highlighted ? "font-semibold" : ""}`}
        style={{ color: highlighted ? "var(--vm-navy)" : "var(--vm-gray-700)" }}
      >
        {label}
      </td>
      <td className="px-4 py-2" style={{ color: "var(--vm-gray-500)" }}>
        {rate}
      </td>
      <td
        className={`px-4 py-2 text-right ${highlighted ? "font-bold" : "font-medium"}`}
        style={{
          color: value >= 0
            ? (highlighted ? "var(--vm-green)" : "var(--vm-gray-700)")
            : "var(--vm-error)",
        }}
      >
        {formatDollars(value)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Edge Case Cards
// ---------------------------------------------------------------------------

function LedNonApplicableCard({ result }: { result: LedCalculationResult }) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--vm-white)",
        border: "1px solid var(--vm-gray-200)",
        boxShadow: "var(--vm-card-shadow)",
      }}
    >
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--vm-navy)" }}
      >
        LED Lighting Retrofit
      </h3>
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "#FEF3C7",
          border: "1px solid #FDE68A",
          color: "#92400E",
        }}
      >
        {result.measureNote ??
          "This measure is not applicable to your building type."}
      </div>
    </div>
  );
}

function LedAlreadyOptimizedCard({ result }: { result: LedCalculationResult }) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--vm-white)",
        border: "1px solid var(--vm-gray-200)",
        boxShadow: "var(--vm-card-shadow)",
      }}
    >
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--vm-navy)" }}
      >
        LED Lighting Retrofit
      </h3>
      <ConfidenceBadge confidence="green" />
      <div
        className="mt-3 rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          color: "#166534",
        }}
      >
        {result.measureNote ??
          "Your lighting is already LED — no further retrofit needed."}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI Atoms
// ---------------------------------------------------------------------------

function MetricBlock({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--vm-gray-500)" }}>
        {label}
      </div>
      <div
        className="text-xl font-bold mt-0.5"
        style={{ color: highlight ? "var(--vm-green)" : "var(--vm-navy)" }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-xs mt-0.5" style={{ color: "var(--vm-gray-400)" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  note,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-baseline py-1.5 ${bold ? "pt-2 mt-1" : ""}`}
      style={bold ? { borderTop: "1px solid var(--vm-gray-200)" } : undefined}
    >
      <div>
        <span
          className={`text-sm ${bold ? "font-semibold" : ""}`}
          style={{ color: "var(--vm-gray-700)" }}
        >
          {label}
        </span>
        {note && (
          <span
            className="text-xs ml-2"
            style={{ color: "var(--vm-gray-400)" }}
          >
            {note}
          </span>
        )}
      </div>
      <span
        className={`text-sm ${bold ? "font-bold" : "font-medium"}`}
        style={{
          color: highlight ? "var(--vm-green)" : "var(--vm-gray-700)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-sm font-semibold mb-2"
      style={{ color: "var(--vm-gray-700)" }}
    >
      {children}
    </h4>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const config = CONFIDENCE_BADGE_CONFIG[confidence] ?? CONFIDENCE_BADGE_CONFIG.yellow;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
}

const CONFIDENCE_BADGE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  green: { label: "High confidence", bg: "#D1FAE5", text: "#065F46" },
  yellow: { label: "Moderate confidence", bg: "#FEF3C7", text: "#92400E" },
  red: { label: "Rough estimate", bg: "#FEE2E2", text: "#991B1B" },
};

function RateClassLabel({ rateClass }: { rateClass: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded"
      style={{
        backgroundColor: "var(--vm-gray-100)",
        color: "var(--vm-gray-500)",
      }}
    >
      {rateClass === "unknown" ? "Est. rate" : rateClass.replace("_", " ").toUpperCase()}
    </span>
  );
}

function FlagBanner({ flag }: { flag: LedFlag }) {
  const isWarning = flag.type === "warning";
  return (
    <div
      className="rounded-lg p-3 mb-2 text-sm"
      style={{
        backgroundColor: isWarning ? "#FEF3C7" : "#F3F4F6",
        border: `1px solid ${isWarning ? "#FDE68A" : "#E5E7EB"}`,
        color: isWarning ? "#92400E" : "#4B5563",
      }}
    >
      {flag.message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatPayback(
  lower: number | null,
  upper: number | null,
  immediate: boolean
): string {
  if (immediate) return "Immediate";
  if (lower === null || upper === null) return "N/A";
  if (Math.abs(lower - upper) < 0.5) return `${lower.toFixed(1)} yr`;
  return `${lower.toFixed(1)}–${upper.toFixed(1)} yr`;
}

function formatRate(rate: number): string {
  return `$${rate.toFixed(3)}`;
}
