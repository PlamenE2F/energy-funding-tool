/**
 * Solar PV — Measure Card
 *
 * Above-fold: 5-second scan — savings headline, payback, CO₂, est. incentive
 * Below-fold: 30-second detail — generation, self-consumption, cost, incentives,
 *   NPV, alternative pathway, assumptions, demand note, Tier 3 CTA
 *
 * Matches LED and HVAC card visual patterns (design tokens, expand/collapse,
 * 3-column metric blocks, confidence badge, flag banners).
 *
 * Handles edge cases: greenhouse (non-applicable), small building, data center,
 *   NM offset warning, NM cap note, payback guard, Class A note.
 */

"use client";

import { useState } from "react";
import type { SolarCalculationResult, SolarFlag } from "@/lib/measures/solar-pv";
import { formatDollars, formatKwh } from "@/lib/rates";

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

interface SolarPvMeasureCardProps {
  result: SolarCalculationResult;
  ownershipType?: "own" | "lease" | "other" | null;
}

export function SolarPvMeasureCard({ result, ownershipType }: SolarPvMeasureCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Non-applicable building type (greenhouse)
  if (!result.solarShowCard) {
    return <SolarNonApplicableCard result={result} />;
  }

  const rec = result.recommended;
  const alt = result.recommendedPathway === "btm" ? result.nm : result.btm;
  const pathwayLabel =
    result.recommendedPathway === "btm"
      ? "Behind-the-Meter"
      : "Net Metered";
  const altLabel =
    result.recommendedPathway === "btm"
      ? "Net Metered"
      : "Behind-the-Meter";

  // Incentive display logic:
  // BTM: show SaveOnEnergy (low estimate) — guaranteed program
  // NM: show CT ITC (high estimate) — since SOE is $0 for NM
  const incentiveDisplay =
    result.recommendedPathway === "btm"
      ? {
          value: rec.incentiveLow > 0 ? rec.incentiveLow : rec.incentiveHigh,
          label: rec.incentiveLow > 0 ? "SaveOnEnergy" : "CT ITC",
          prefix: rec.incentiveLow > 0 ? "Est. " : "Up to ",
        }
      : {
          value: rec.incentiveHigh,
          label: "CT ITC",
          prefix: "Up to ",
        };

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
              Rooftop Solar PV: {pathwayLabel}
            </h3>
            <span
              className="text-xs mt-0.5 inline-block"
              style={{ color: "var(--vm-gray-500)" }}
            >
              On-Site Generation — {rec.systemKwRounded} kW system
            </span>
            <div className="mt-1">
              <ConfidenceBadge confidence={result.confidence} />
            </div>
          </div>
          <RateClassLabel rateClass={result.rateClassUsed} />
        </div>

        {/* Savings headline — 3 columns matching LED/HVAC */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <MetricBlock
            label="Annual savings"
            value={formatDollars(rec.annualDollarSavings)}
            subtext={`${rec.offsetPct}% offset`}
            highlight
          />
          <MetricBlock
            label="Simple payback"
            value={formatPayback(rec.paybackMidpoint, rec.paybackUpper)}
            subtext="After incentives"
          />
          <MetricBlock
            label="CO₂ reduction"
            value={`${result.co2ReductionTonnes} t`}
            subtext={`≈ ${result.carsEquivalent} cars off road`}
          />
        </div>

        {/* Incentive callout — matching LED/HVAC pattern */}
        {incentiveDisplay.value > 0 && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#166534",
            }}
          >
            {incentiveDisplay.prefix}
            <span className="font-semibold">
              {formatDollars(incentiveDisplay.value)}
            </span>{" "}
            {incentiveDisplay.label}
            {rec.incentiveHigh > incentiveDisplay.value && (
              <span>
                {" "}
                (up to {formatDollars(rec.incentiveHigh)} with CT ITC)
              </span>
            )}
          </div>
        )}

        {/* Flags (above-fold: show warnings only) */}
        {result.flags
          .filter((f) => f.type === "warning")
          .map((flag, i) => (
            <FlagBanner key={i} flag={flag} />
          ))}

        {/* Expand toggle — matching LED/HVAC button style */}
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
          <SolarDetailView
            result={result}
            rec={rec}
            alt={alt}
            altLabel={altLabel}
            ownershipType={ownershipType ?? null}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail View (Below-Fold)
// ---------------------------------------------------------------------------

function SolarDetailView({
  result,
  rec,
  alt,
  altLabel,
  ownershipType,
}: {
  result: SolarCalculationResult;
  rec: SolarCalculationResult["recommended"];
  alt: SolarCalculationResult["btm"] | SolarCalculationResult["nm"];
  altLabel: string;
  ownershipType: "own" | "lease" | "other" | null;
}) {
  return (
    <div className="pt-4 space-y-6">
      {/* Generation estimate */}
      <section>
        <SectionTitle>Generation Estimate</SectionTitle>
        <DetailRow
          label="Annual generation"
          value={`${formatKwh(rec.annualGenerationKwh)} kWh`}
        />
        <DetailRow
          label="Electricity offset"
          value={`${rec.offsetPct}%`}
        />
        <DetailRow
          label="Irradiance zone"
          value={`${result.irradianceZone.replace(/_/g, " ")} (${result.zoneIrradiance} kWh/kWp)`}
        />
        <DetailRow
          label="Effective irradiance"
          value={`${result.effectiveIrradiance} kWh/kWp (after 0.90 orientation derate)`}
        />
      </section>

      {/* Self-consumption */}
      <section>
        <SectionTitle>Self-Consumption Breakdown</SectionTitle>
        <DetailRow
          label="Self-consumed on-site"
          value={`${formatKwh(rec.selfConsumedKwh)} kWh (${Math.round(rec.selfConsumptionPct * 100)}%)`}
        />
        <DetailRow
          label={result.recommendedPathway === "btm" ? "Excess (not exported)" : "Exported to grid"}
          value={`${formatKwh(rec.exportedOrWastedKwh)} kWh`}
        />
        {result.recommendedPathway === "net_metered" && (
          <DetailRow
            label="Net metering credit rate"
            value={`$${result.nmCreditRate.toFixed(2)}/kWh`}
          />
        )}
      </section>

      {/* Dollar savings */}
      <section>
        <SectionTitle>Annual Savings</SectionTitle>
        <DetailRow
          label="Self-consumed value"
          value={formatDollars(Math.round(rec.selfConsumedKwh * result.effectiveRateUsed))}
          note={`at $${result.effectiveRateUsed}/kWh`}
          highlight
        />
        {result.recommendedPathway === "net_metered" && (
          <DetailRow
            label="Export credits"
            value={formatDollars(Math.round(rec.exportedOrWastedKwh * result.nmCreditRate))}
            note={`at $${result.nmCreditRate.toFixed(2)}/kWh`}
            highlight
          />
        )}
        <DetailRow
          label="Total annual savings"
          value={formatDollars(rec.annualDollarSavings)}
          bold
        />
      </section>

      {/* Cost and incentives */}
      <section>
        <SectionTitle>Cost &amp; Incentives</SectionTitle>
        <DetailRow
          label="Estimated project cost"
          value={`${formatDollars(rec.costMidpoint)} – ${formatDollars(rec.costUpper)}`}
        />
        {rec.incentiveSoe > 0 && (
          <DetailRow
            label="SaveOnEnergy"
            value={`– ${formatDollars(rec.incentiveSoe)}`}
            note={rec.systemKw <= 10 ? "$1,000/kW-DC" : "$860/kW-AC"}
            highlight
          />
        )}
        {rec.incentiveCtItc > 0 && (
          <DetailRow
            label="CT ITC (up to 30%)"
            value={`– ${formatDollars(rec.incentiveCtItc)}`}
            note="Consult tax advisor"
          />
        )}
        {result.recommendedPathway === "btm" && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--vm-gray-400)" }}
          >
            SaveOnEnergy and Net Metering are mutually exclusive. BTM pathway qualifies for SaveOnEnergy.
          </p>
        )}
        {result.recommendedPathway === "net_metered" && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--vm-gray-400)" }}
          >
            Net Metered systems are not eligible for SaveOnEnergy incentives.
          </p>
        )}
        <DetailRow
          label="Net cost after incentives"
          value={`${formatDollars(rec.netCostMidpoint)} – ${formatDollars(rec.netCostUpper)}`}
          bold
        />
      </section>

      {/* NPV table */}
      <section>
        <SectionTitle>10-Year NPV (with panel degradation)</SectionTitle>
        <SolarNpvTable rec={rec} />
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--vm-gray-400)" }}
        >
          NPV includes 0.5%/yr panel degradation (NREL) and 6% discount rate.
          System continues producing for 15+ years beyond this analysis.
        </p>
      </section>

      {/* Emissions */}
      <section>
        <SectionTitle>CO₂ Reduction</SectionTitle>
        <DetailRow
          label="Scope 2 avoided (grid electricity)"
          value={`${result.co2ReductionTonnes} t/yr`}
        />
        <DetailRow
          label="Cars equivalent"
          value={`≈ ${result.carsEquivalent} vehicles off road`}
        />
      </section>

      {/* Alternative pathway */}
      <section>
        <SectionTitle>Alternative: {altLabel}</SectionTitle>
        <DetailRow label="System size" value={`${alt.systemKwRounded} kW`} />
        <DetailRow
          label="Annual savings"
          value={formatDollars(alt.annualDollarSavings)}
        />
        <DetailRow
          label="Net cost (midpoint)"
          value={formatDollars(alt.netCostMidpoint)}
        />
        <DetailRow
          label="10-year NPV (base)"
          value={formatDollars(alt.npvBase)}
        />
        <p
          className="text-xs mt-1"
          style={{ color: "var(--vm-gray-400)" }}
        >
          {result.recommendedPathway === "btm"
            ? "Net Metering allows a larger system but does not qualify for SaveOnEnergy."
            : "Behind-the-Meter qualifies for SaveOnEnergy but sizes to daytime baseload only."}
        </p>
      </section>

      {/* Key assumptions */}
      <section>
        <SectionTitle>Key Assumptions</SectionTitle>
        <DetailRow label="Panel density" value="15 W/sqft (commercial flat-roof)" />
        <DetailRow label="Storey factor" value={`${result.storefFactorUsed}`} />
        <DetailRow label="Roof utilization" value={`${Math.round(result.roofUtilizationUsed * 100)}%`} />
        <DetailRow label="Panel degradation" value="0.5%/year (NREL)" />
        <DetailRow label="Orientation derate" value="0.90 (flat-roof)" />
        <DetailRow label="Effective rate used" value={`$${result.effectiveRateUsed}/kWh`} />
      </section>

      {/* Demand note */}
      <section>
        <SectionTitle>Notes</SectionTitle>
        <FlagBanner
          flag={{ type: "info", message: result.demandNote }}
        />
        {result.classANote && (
          <FlagBanner
            flag={{ type: "info", message: result.classANote }}
          />
        )}
        <p
          className="text-xs"
          style={{ color: "var(--vm-gray-400)" }}
        >
          Inverter replacement at 12–15 years (~$0.15–$0.25/W) not included in 10-year analysis.
        </p>
      </section>

      {/* Info flags */}
      {result.flags
        .filter((f) => f.type === "info" || f.type === "edge_case")
        .filter((f) => f.message !== result.demandNote && f.message !== result.classANote)
        .map((flag, i) => (
          <FlagBanner key={i} flag={flag} />
        ))}

      {/* Ownership CTA */}
      <OwnershipCta
        ownershipType={ownershipType}
        annualSavings={rec.annualDollarSavings}
        offsetPct={rec.offsetPct}
      />

      {/* Tier 3 prompt */}
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "var(--vm-gray-50)",
          border: "1px solid var(--vm-gray-200)",
          color: "var(--vm-gray-600)",
        }}
      >
        Get a detailed solar assessment with satellite imagery, interval data,
        and shade analysis for optimized sizing and bankable projections.
      </div>

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

function SolarNpvTable({ rec }: { rec: SolarCalculationResult["recommended"] }) {
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
          <NpvRow label="Conservative" rate="2.0%/yr" value={rec.npvConservative} />
          <NpvRow label="Base Case" rate="2.5%/yr" value={rec.npvBase} highlighted />
          <NpvRow label="High Growth" rate="4.5%/yr" value={rec.npvHigh} />
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
            ? highlighted
              ? "var(--vm-green)"
              : "var(--vm-gray-700)"
            : "var(--vm-error)",
        }}
      >
        {formatDollars(value)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Edge Case Card
// ---------------------------------------------------------------------------

function SolarNonApplicableCard({
  result,
}: {
  result: SolarCalculationResult;
}) {
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
        Rooftop Solar PV
      </h3>
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "#FEF3C7",
          border: "1px solid #FDE68A",
          color: "#92400E",
        }}
      >
        {result.greenhouseNote ??
          "This measure is not applicable to your building type."}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI Atoms — matching LED/HVAC pattern
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
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
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

function FlagBanner({ flag }: { flag: SolarFlag }) {
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

function OwnershipCta({
  ownershipType,
  annualSavings,
  offsetPct,
}: {
  ownershipType: "own" | "lease" | "other" | null;
  annualSavings: number;
  offsetPct: number;
}) {
  if (ownershipType === "own") {
    return (
      <div
        className="rounded-lg p-3 mb-2 text-sm"
        style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          color: "#166534",
        }}
      >
        Install solar, save {formatDollars(annualSavings)}/year and offset{" "}
        {offsetPct}% of your electricity.
      </div>
    );
  }
  if (ownershipType === "lease") {
    return (
      <div
        className="rounded-lg p-3 mb-2 text-sm"
        style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          color: "#1E40AF",
        }}
      >
        Share this with your building owner — solar adds property value and
        reduces operating costs.
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatPayback(midpoint: number | null, upper: number | null): string {
  if (midpoint === null || upper === null) return "N/A";
  if (Math.abs(midpoint - upper) < 0.5) return `${midpoint.toFixed(1)} yr`;
  return `${midpoint.toFixed(0)}–${upper.toFixed(0)} yr`;
}
