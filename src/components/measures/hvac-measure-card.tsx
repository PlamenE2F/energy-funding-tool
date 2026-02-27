/**
 * HVAC Upgrades — Measure Card
 *
 * Above-fold: 5-second scan — savings headline, payback, CO₂, incentive callout
 * Below-fold: 30-second detail — energy/dollar/cost breakdown, NPV, emissions,
 *   incentive programs, alternative scenario, demand notes
 *
 * Handles: fuel switching (gas/oil/propane → HP), electric efficiency (HE-06/07),
 *   combined pathway display, incremental cost framing, negative savings,
 *   ownership-aware CTA, HE-01 alternative for gas buildings.
 */

"use client";

import { useState } from "react";
import type { HvacCalculationResult, HvacFlag } from "@/lib/measures/hvac";
import { formatDollars, formatKwh } from "@/lib/rates";

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

interface HvacMeasureCardProps {
  result: HvacCalculationResult;
}

export function HvacMeasureCard({ result }: HvacMeasureCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasPositiveSavings = result.annualTotalSavings > 0;
  const savingsLabel = hasPositiveSavings
    ? `${formatDollars(result.annualTotalSavings)}/yr`
    : "May not reduce costs";

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
              HVAC Upgrade: {result.scenarioPrimaryName}
            </h3>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <RateClassLabel rateClass={result.rateClassUsed} />
        </div>

        {/* Savings headline */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <MetricBlock
            label="Annual savings"
            value={savingsLabel}
            subtext={
              hasPositiveSavings
                ? result.co2NetReduction > 0
                  ? `${result.co2NetReduction} t CO₂/yr`
                  : undefined
                : "See CO₂ reduction below"
            }
            highlight={hasPositiveSavings}
          />
          <MetricBlock
            label="Simple payback"
            value={formatPayback(result.paybackMidpoint, result.paybackUpper)}
            subtext="After incentives"
          />
          <MetricBlock
            label="CO₂ reduction"
            value={`${result.co2NetReduction} t`}
            subtext={
              result.co2ReductionPct !== null
                ? `${result.co2ReductionPct}% heating emissions`
                : "per year"
            }
          />
        </div>

        {/* Incentive callout */}
        {result.incentiveLow > 0 && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#166534",
            }}
          >
            Up to{" "}
            <span className="font-semibold">
              {formatDollars(result.incentiveHigh)}
            </span>{" "}
            in potential incentives
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
          <HvacDetailView result={result} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail View (Below-Fold)
// ---------------------------------------------------------------------------

function HvacDetailView({ result }: { result: HvacCalculationResult }) {
  const isFuelSwitching = result.gasDisplacedM3 !== null || result.oilDisplacedLitres !== null || result.propaneDisplacedLitres !== null;

  return (
    <div className="pt-4 space-y-6">
      {/* Energy breakdown */}
      <section>
        <SectionTitle>Energy Breakdown</SectionTitle>
        <DetailRow
          label="HVAC electricity pool"
          value={`${formatKwh(result.hvacElectricityPoolKwh)} kWh/yr`}
        />
        {result.hvacGasPoolM3 !== null && (
          <DetailRow
            label="HVAC gas pool"
            value={`${formatKwh(result.hvacGasPoolM3)} m³/yr`}
            note={result.gasPoolEstimated ? "(estimated)" : undefined}
          />
        )}
        {isFuelSwitching && result.heatingElectricityAddedKwh !== null && (
          <>
            <DetailRow
              label="Heat pump electricity added"
              value={`+${formatKwh(result.heatingElectricityAddedKwh)} kWh/yr`}
            />
            {result.coolingKwhSavings !== null && (
              <DetailRow
                label="Cooling efficiency savings"
                value={`−${formatKwh(result.coolingKwhSavings)} kWh/yr`}
              />
            )}
          </>
        )}
        {!isFuelSwitching && result.annualKwhSavings > 0 && (
          <DetailRow
            label="Electricity savings"
            value={`${formatKwh(result.annualKwhSavings)} kWh/yr`}
          />
        )}
        {result.annualGasM3Savings !== null && (
          <DetailRow
            label="Gas savings"
            value={`${formatKwh(result.annualGasM3Savings)} m³/yr`}
          />
        )}
      </section>

      {/* Dollar breakdown */}
      <section>
        <SectionTitle>Annual Savings</SectionTitle>
        {result.dollarSavingsGas !== null && (
          <DetailRow
            label={isFuelSwitching ? "Fuel cost avoided" : "Gas savings"}
            value={formatDollars(result.dollarSavingsGas)}
            highlight
          />
        )}
        {result.dollarCostElectricityAdded !== null && (
          <DetailRow
            label="New HP electricity cost"
            value={`−${formatDollars(result.dollarCostElectricityAdded)}`}
          />
        )}
        {result.dollarSavingsCooling !== null && (
          <DetailRow
            label="Cooling efficiency savings"
            value={`+${formatDollars(result.dollarSavingsCooling)}`}
            highlight
          />
        )}
        {result.demandSavingsAnnual > 0 && (
          <DetailRow
            label="Demand charge savings"
            value={formatDollars(result.demandSavingsAnnual)}
            note={
              result.coolingKwReduction !== null
                ? `${result.coolingKwReduction} kW × ${formatRate(result.demandChargeRateUsed!)}/kW × 12 mo`
                : undefined
            }
          />
        )}
        <DetailRow
          label="Total annual savings"
          value={formatDollars(result.annualTotalSavings)}
          bold
        />
      </section>

      {/* Cost and incentives */}
      <section>
        <SectionTitle>Cost &amp; Incentives</SectionTitle>
        <DetailRow
          label="Estimated project cost"
          value={`${formatDollars(result.projectCostMidpoint)} – ${formatDollars(result.projectCostUpper)}`}
        />
        {result.incrementalCost !== null && (
          <DetailRow
            label="Additional over standard replacement"
            value={`~${formatDollars(result.incrementalCost)}`}
            note="If replacing HVAC anyway"
          />
        )}
        {result.incentiveSoe > 0 && (
          <DetailRow
            label="SaveOnEnergy (cooling efficiency)"
            value={formatDollars(result.incentiveSoe)}
            highlight
          />
        )}
        {result.incentiveEnbridge > 0 && (
          <DetailRow
            label="Enbridge Gas (gas savings)"
            value={formatDollars(result.incentiveEnbridge)}
            highlight
          />
        )}
        {result.incentiveCtItc > 0 && (
          <DetailRow
            label="CT ITC (up to)"
            value={formatDollars(result.incentiveCtItc)}
            note="Consult tax advisor"
          />
        )}
        {result.incentiveOhpa > 0 && (
          <DetailRow
            label="OHPA (oil-to-HP)"
            value={formatDollars(result.incentiveOhpa)}
            note="Check eligibility"
          />
        )}
        <DetailRow
          label="Net cost after incentives"
          value={`${formatDollars(result.netCostMidpoint)} – ${formatDollars(result.netCostUpper)}`}
          bold
        />
      </section>

      {/* NPV table */}
      <section>
        <SectionTitle>10-Year Net Present Value</SectionTitle>
        <HvacNpvTable result={result} isFuelSwitching={isFuelSwitching} />
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--vm-gray-400)" }}
        >
          NPV calculated at 6% discount rate over 10 years.
          {isFuelSwitching
            ? " Electricity and gas escalated separately."
            : " Savings escalated at scenario rate annually."}
        </p>
      </section>

      {/* Emissions detail */}
      <section>
        <SectionTitle>Emissions Detail</SectionTitle>
        {isFuelSwitching ? (
          <>
            {result.co2AvoidedScope1 !== null && (
              <DetailRow label="Scope 1 avoided (combustion)" value={`${result.co2AvoidedScope1} t`} />
            )}
            {result.co2AddedScope2 !== null && (
              <DetailRow label="Scope 2 added (grid electricity)" value={`${result.co2AddedScope2} t`} />
            )}
            <DetailRow
              label="Net CO₂ reduction"
              value={`${result.co2NetReduction} t/yr`}
              note={result.co2ReductionPct !== null ? `(${result.co2ReductionPct}% reduction)` : undefined}
              bold
            />
          </>
        ) : (
          <DetailRow
            label="CO₂ reduction (Scope 2)"
            value={`${result.co2NetReduction} t/yr`}
          />
        )}
      </section>

      {/* Alternative scenario */}
      {result.alternativeResult && (
        <section>
          <SectionTitle>Alternative: {result.alternativeResult.scenarioName}</SectionTitle>
          <DetailRow
            label="Gas savings"
            value={`${formatKwh(result.alternativeResult.annualGasSavingsM3)} m³/yr`}
          />
          <DetailRow
            label="Annual savings"
            value={formatDollars(result.alternativeResult.annualDollarSavings)}
          />
          <DetailRow
            label="CO₂ reduction"
            value={`${result.alternativeResult.co2ReductionTonnes} t/yr`}
          />
          <DetailRow
            label="Project cost"
            value={formatDollars(result.alternativeResult.projectCostMidpoint)}
          />
          <DetailRow
            label="Enbridge incentive"
            value={formatDollars(result.alternativeResult.incentiveEnbridge)}
          />
          <DetailRow
            label="Payback"
            value={
              result.alternativeResult.payback !== null
                ? `${result.alternativeResult.payback.toFixed(1)} yr`
                : "N/A"
            }
          />
        </section>
      )}

      {/* All flags */}
      {result.flags.length > 0 && (
        <section>
          <SectionTitle>Notes</SectionTitle>
          {result.flags.map((flag, i) => (
            <FlagBanner key={i} flag={flag} />
          ))}
        </section>
      )}

      {/* Key assumptions */}
      <section>
        <SectionTitle>Key Assumptions</SectionTitle>
        <DetailRow label="HVAC electricity share" value={`${(result.hvacElectricityPoolKwh / (result.hvacElectricityPoolKwh / (result.confidence === "green" ? 1 : 1)) * 100 / 100).toFixed(0)} kWh`} />
        <DetailRow label="Seasonal COP" value={`${result.seasonalCopUsed}`} />
        <DetailRow label="Existing efficiency" value={`${(result.existingEfficiencyUsed * 100).toFixed(0)}%`} />
        {result.effectiveGasRateUsed !== null && (
          <DetailRow label="Gas rate used" value={`${formatRate(result.effectiveGasRateUsed)}/m³`} />
        )}
        <DetailRow label="Electricity rate used" value={`${formatRate(result.electricityRateUsed)}/kWh`} />
        <DetailRow label="Cost basis" value={result.costBasis} />
      </section>

      {/* Tier 3 prompt */}
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "var(--vm-gray-50)",
          border: "1px solid var(--vm-gray-200)",
          color: "var(--vm-gray-600)",
        }}
      >
        Get a detailed HVAC analysis with equipment-specific sizing, costs, and
        incentive confirmation.
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

function HvacNpvTable({
  result,
  isFuelSwitching,
}: {
  result: HvacCalculationResult;
  isFuelSwitching: boolean;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--vm-gray-200)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--vm-gray-50)" }}>
            <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--vm-gray-600)" }}>
              Scenario
            </th>
            <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--vm-gray-600)" }}>
              {isFuelSwitching ? "Elec / Gas Escalation" : "Rate Escalation"}
            </th>
            <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--vm-gray-600)" }}>
              10-Year NPV
            </th>
          </tr>
        </thead>
        <tbody>
          <NpvRow
            label="Conservative"
            rate={isFuelSwitching ? "2.0% / 2.0%" : "2.0%/yr"}
            value={result.npvConservative}
          />
          <NpvRow
            label="Base Case"
            rate={isFuelSwitching ? "2.5% / 2.0%" : "2.5%/yr"}
            value={result.npvBase}
            highlighted
          />
          <NpvRow
            label="High Growth"
            rate={isFuelSwitching ? "4.5% / 3.0%" : "4.5%/yr"}
            value={result.npvHigh}
          />
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
          <span className="text-xs ml-2" style={{ color: "var(--vm-gray-400)" }}>
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
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

const CONFIDENCE_BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
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

function FlagBanner({ flag }: { flag: HvacFlag }) {
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

function formatPayback(midpoint: number | null, upper: number | null): string {
  if (midpoint === null || upper === null) return "N/A";
  if (Math.abs(midpoint - upper) < 0.5) return `${midpoint.toFixed(1)} yr`;
  return `${midpoint.toFixed(0)}–${upper.toFixed(0)} yr`;
}

function formatRate(rate: number): string {
  return `$${rate.toFixed(2)}`;
}
