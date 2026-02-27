/**
 * Solar PV — Measure Card
 *
 * Above-fold: 5-second scan — savings headline, system size, payback, CO₂, offset %
 * Below-fold: 30-second detail — generation, self-consumption, cost, incentives,
 *   NPV, alternative pathway, assumptions, demand note, Tier 3 CTA
 *
 * Handles edge cases: greenhouse (non-applicable), small building, data center,
 *   NM offset warning, NM cap note, payback guard, Class A note.
 */

"use client";

import { useState } from "react";
import type { SolarCalculationResult, SolarFlag, SolarPathway } from "@/lib/measures/solar-pv";
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
            <h3 className="text-lg font-semibold">
              Solar PV: {pathwayLabel}
            </h3>
            <p className="text-sm text-gray-500">
              {rec.systemKwRounded} kW system — {rec.offsetPct}% electricity offset
            </p>
          </div>
          <ConfidenceBadge confidence={result.confidence} />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <MetricBox
            label="Annual Savings"
            value={formatDollars(rec.annualDollarSavings)}
            sublabel="/year"
          />
          <MetricBox
            label="Simple Payback"
            value={
              rec.paybackMidpoint !== null
                ? `${rec.paybackMidpoint} yr`
                : "N/A"
            }
            sublabel={
              rec.paybackUpper !== null
                ? `${rec.paybackUpper} yr upper`
                : ""
            }
          />
          <MetricBox
            label="CO₂ Reduction"
            value={`${result.co2ReductionTonnes} t/yr`}
            sublabel={`≈ ${result.carsEquivalent} cars off road`}
          />
          <MetricBox
            label="Estimated Incentives"
            value={`Up to ${formatDollars(rec.incentiveHigh)}`}
            sublabel={result.recommendedPathway === "btm" ? "SaveOnEnergy + CT ITC" : "CT ITC"}
          />
        </div>

        {/* Warning flags above fold */}
        {result.flags
          .filter((f) => f.type === "warning")
          .map((flag, i) => (
            <FlagBanner key={i} flag={flag} />
          ))}

        {/* Ownership CTA */}
        <OwnershipCta
          ownershipType={ownershipType ?? null}
          annualSavings={rec.annualDollarSavings}
          offsetPct={rec.offsetPct}
        />

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-4 py-2"
        >
          {expanded ? "Hide details" : "See full analysis"}
        </button>
      </div>

      {/* Below-fold: 30-second detail */}
      {expanded && (
        <div
          style={{
            padding: "var(--vm-card-padding)",
            borderTop: "1px solid var(--vm-gray-200)",
            backgroundColor: "var(--vm-gray-50)",
          }}
        >
          {/* Generation estimate */}
          <DetailSection title="Generation Estimate">
            <DetailRow
              label="Annual generation"
              value={formatKwh(rec.annualGenerationKwh)}
            />
            <DetailRow
              label="Irradiance zone"
              value={`${result.irradianceZone.replace(/_/g, " ")} (${result.zoneIrradiance} kWh/kWp)`}
            />
            <DetailRow
              label="Effective irradiance"
              value={`${result.effectiveIrradiance} kWh/kWp`}
            />
          </DetailSection>

          {/* Self-consumption breakdown */}
          <DetailSection title="Self-Consumption">
            <DetailRow
              label="Self-consumed"
              value={`${formatKwh(rec.selfConsumedKwh)} (${Math.round(rec.selfConsumptionPct * 100)}%)`}
            />
            <DetailRow
              label={result.recommendedPathway === "btm" ? "Wasted (no export)" : "Exported (NM credits)"}
              value={formatKwh(rec.exportedOrWastedKwh)}
            />
            {result.recommendedPathway === "net_metered" && (
              <DetailRow
                label="NM credit rate"
                value={`$${result.nmCreditRate}/kWh`}
              />
            )}
          </DetailSection>

          {/* Dollar breakdown */}
          <DetailSection title="Dollar Savings">
            <DetailRow
              label="Self-consumed value"
              value={formatDollars(rec.selfConsumedKwh * result.effectiveRateUsed)}
            />
            {result.recommendedPathway === "net_metered" && (
              <DetailRow
                label="Export credits"
                value={formatDollars(rec.exportedOrWastedKwh * result.nmCreditRate)}
              />
            )}
            <DetailRow
              label="Total annual savings"
              value={formatDollars(rec.annualDollarSavings)}
              bold
            />
          </DetailSection>

          {/* Cost and incentives */}
          <DetailSection title="Cost & Incentives">
            <DetailRow
              label="Gross cost (midpoint)"
              value={formatDollars(rec.costMidpoint)}
            />
            <DetailRow
              label="Gross cost (upper)"
              value={formatDollars(rec.costUpper)}
            />
            {rec.incentiveSoe > 0 && (
              <DetailRow
                label="SaveOnEnergy"
                value={`-${formatDollars(rec.incentiveSoe)}`}
              />
            )}
            {rec.incentiveCtItc > 0 && (
              <DetailRow
                label="CT ITC (30%)"
                value={`-${formatDollars(rec.incentiveCtItc)}`}
              />
            )}
            {result.recommendedPathway === "btm" && (
              <p className="text-xs text-gray-500 mt-1">
                SaveOnEnergy and Net Metering are mutually exclusive. BTM pathway qualifies for SaveOnEnergy.
              </p>
            )}
            {result.recommendedPathway === "net_metered" && (
              <p className="text-xs text-gray-500 mt-1">
                Net Metered systems are not eligible for SaveOnEnergy incentives.
              </p>
            )}
            <DetailRow
              label="Net cost (midpoint)"
              value={formatDollars(rec.netCostMidpoint)}
              bold
            />
          </DetailSection>

          {/* NPV scenarios */}
          <DetailSection title="10-Year NPV (with panel degradation)">
            <DetailRow
              label="Conservative (2.0%/yr)"
              value={formatDollars(rec.npvConservative)}
            />
            <DetailRow
              label="Base case (2.5%/yr)"
              value={formatDollars(rec.npvBase)}
              bold
            />
            <DetailRow
              label="High growth (4.5%/yr)"
              value={formatDollars(rec.npvHigh)}
            />
            <p className="text-xs text-gray-500 mt-1">
              NPV includes {(100 * 0.005).toFixed(1)}%/yr panel degradation and 6% discount rate.
            </p>
          </DetailSection>

          {/* Alternative pathway */}
          <DetailSection title={`Alternative: ${altLabel}`}>
            <DetailRow
              label="System size"
              value={`${alt.systemKwRounded} kW`}
            />
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
            <p className="text-xs text-gray-500 mt-1">
              {result.recommendedPathway === "btm"
                ? "Net Metering allows a larger system but does not qualify for SaveOnEnergy."
                : "Behind-the-Meter qualifies for SaveOnEnergy but sizes to daytime baseload only."}
            </p>
          </DetailSection>

          {/* Key assumptions */}
          <DetailSection title="Key Assumptions">
            <DetailRow label="Panel density" value="15 W/sqft (commercial flat-roof)" />
            <DetailRow label="Storey factor" value={`${result.storefFactorUsed}`} />
            <DetailRow label="Roof utilization" value={`${Math.round(result.roofUtilizationUsed * 100)}%`} />
            <DetailRow label="Panel degradation" value="0.5%/year (NREL)" />
            <DetailRow label="Orientation derate" value="0.90 (flat-roof)" />
            <DetailRow label="Effective rate used" value={`$${result.effectiveRateUsed}/kWh`} />
          </DetailSection>

          {/* Notes */}
          <DetailSection title="Notes">
            <p className="text-xs text-gray-600">{result.demandNote}</p>
            <p className="text-xs text-gray-600 mt-2">
              System continues producing for 15+ years beyond this analysis.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Inverter replacement at 12–15 years (~$0.15–$0.25/W) not included in 10-year analysis.
            </p>
          </DetailSection>

          {/* Info flags */}
          {result.flags
            .filter((f) => f.type === "info" || f.type === "edge_case")
            .map((flag, i) => (
              <FlagBanner key={i} flag={flag} />
            ))}

          {/* Tier 3 CTA */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-800 mb-1">
              Want a detailed solar assessment?
            </p>
            <p className="text-blue-700">
              A Tier 3 analysis uses satellite imagery, interval data, and shade
              analysis to optimize system sizing and provide bankable projections.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Non-Applicable Card (Greenhouse)
// ---------------------------------------------------------------------------

function SolarNonApplicableCard({
  result,
}: {
  result: SolarCalculationResult;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--vm-white)",
        border: "1px solid var(--vm-gray-200)",
        boxShadow: "var(--vm-card-shadow)",
      }}
    >
      <div style={{ padding: "var(--vm-card-padding)" }}>
        <h3 className="text-lg font-semibold mb-2">Solar PV</h3>
        <p className="text-sm text-gray-600">{result.greenhouseNote}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[confidence] ?? colors.yellow}`}
    >
      {confidence}
    </span>
  );
}

function MetricBox({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}

function FlagBanner({ flag }: { flag: SolarFlag }) {
  const bg =
    flag.type === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-blue-50 border-blue-200 text-blue-800";
  return (
    <div className={`p-3 rounded-lg border text-sm mb-2 ${bg}`}>
      {flag.message}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-600">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
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
      <p className="text-sm text-green-700 mt-3">
        Install solar, save {formatDollars(annualSavings)}/year and offset{" "}
        {offsetPct}% of your electricity.
      </p>
    );
  }
  if (ownershipType === "lease") {
    return (
      <p className="text-sm text-blue-700 mt-3">
        Share this with your building owner — solar adds property value and
        reduces operating costs.
      </p>
    );
  }
  return (
    <p className="text-sm text-gray-600 mt-3">
      Discuss with building stakeholders.
    </p>
  );
}
