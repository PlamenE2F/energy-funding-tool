/**
 * Energy Profile Snapshot
 *
 * Displays the building's energy metrics:
 *   - Cost Intensity ($X.XX/sqft/year)
 *   - Energy Use Intensity (XX.X kWh/sqft/year)
 *   - Carbon Footprint (X.X tonnes CO₂/year)
 *   - Carbon Intensity (X.XX kg CO₂/sqft/year — tooltip/detail)
 *
 * Uses rate framework effective rate for cost intensity.
 * Shows benchmark comparison for GREEN/YELLOW types.
 */

"use client";

import type { EuiResult, BenchmarkResult, EmissionsResult } from "@/lib/eui/types";
import { KWH_SQFT_TO_GJ_M2 } from "@/lib/config/building-types";
import { BenchmarkBar } from "./benchmark-bar";
import { EmissionsDisplay } from "./emissions-display";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnergyProfileSnapshotProps {
  euiResult: EuiResult;
  benchmarkResult: BenchmarkResult;
  emissionsResult: EmissionsResult;
  effectiveRateEnergy: number;
  buildingSizeSqft: number;
  annualElectricityKwh: number;
  annualCost: number | null;
  showMetricUnits?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnergyProfileSnapshot({
  euiResult,
  benchmarkResult,
  emissionsResult,
  effectiveRateEnergy,
  buildingSizeSqft,
  annualElectricityKwh,
  annualCost,
  showMetricUnits = false,
}: EnergyProfileSnapshotProps) {
  // Cost intensity: annual cost / sqft
  const costIntensity =
    annualCost !== null ? annualCost / buildingSizeSqft : null;

  // Which EUI to display (prefer weather-normalized > total > electric)
  const displayEui =
    euiResult.euiWeatherNormalized ?? euiResult.euiTotal ?? euiResult.euiElectric;
  const euiLabel =
    euiResult.euiWeatherNormalized
      ? "Weather-Normalized EUI"
      : euiResult.euiTotal
        ? "Total Site EUI"
        : "Electricity EUI";
  const euiUnit = euiResult.euiTotal ? "ekWh/sqft/yr" : "kWh/sqft/yr";

  return (
    <section
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--vm-white)",
        boxShadow: "var(--vm-card-shadow)",
        border: "1px solid var(--vm-gray-200)",
      }}
    >
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--vm-navy)" }}
      >
        Energy Profile Snapshot
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cost Intensity */}
        <MetricCard
          label="Cost Intensity"
          value={
            costIntensity !== null ? `$${costIntensity.toFixed(2)}` : "—"
          }
          unit="/sqft/year"
          sublabel={
            costIntensity !== null
              ? `Based on $${annualCost!.toLocaleString()} annual cost`
              : "Add annual cost for this metric"
          }
        />

        {/* Energy Use Intensity */}
        <MetricCard
          label={euiLabel}
          value={
            showMetricUnits
              ? (displayEui * KWH_SQFT_TO_GJ_M2).toFixed(2)
              : displayEui.toFixed(1)
          }
          unit={showMetricUnits ? "GJ/m²/yr" : euiUnit}
          sublabel={`Path: ${euiResult.completionPath}`}
        />

        {/* Carbon Footprint */}
        <MetricCard
          label="Carbon Footprint"
          value={emissionsResult.totalEmissionsTonnes.toFixed(1)}
          unit="tonnes CO₂/yr"
          sublabel={`${emissionsResult.carbonIntensity.toFixed(2)} kg CO₂/sqft/yr`}
        />
      </div>

      {/* Benchmark Comparison */}
      {benchmarkResult.comparisonShown && benchmarkResult.benchmarkEui && (
        <div className="mt-6">
          <BenchmarkBar
            userEui={displayEui}
            benchmarkEui={benchmarkResult.benchmarkEui}
            benchmarkTier={benchmarkResult.benchmarkTier!}
            userVsMedianPct={benchmarkResult.userVsMedianPct!}
            caveatText={benchmarkResult.caveatText}
            costIntensityLow={benchmarkResult.costIntensityLow}
            costIntensityHigh={benchmarkResult.costIntensityHigh}
            comparisonNote={benchmarkResult.comparisonNote}
          />
        </div>
      )}

      {/* RED type message */}
      {!benchmarkResult.comparisonShown && benchmarkResult.comparisonNote && (
        <p
          className="mt-4 text-sm"
          style={{ color: "var(--vm-gray-500)" }}
        >
          {benchmarkResult.comparisonNote}
        </p>
      )}

      {/* Emissions Detail */}
      <EmissionsDisplay emissions={emissionsResult} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Metric Card (internal)
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value: string;
  unit: string;
  sublabel: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "var(--vm-gray-50)",
        border: "1px solid var(--vm-gray-100)",
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider mb-1"
        style={{ color: "var(--vm-gray-500)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--vm-navy)" }}>
        {value}
        <span
          className="text-sm font-normal ml-1"
          style={{ color: "var(--vm-gray-400)" }}
        >
          {unit}
        </span>
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--vm-gray-400)" }}>
        {sublabel}
      </p>
    </div>
  );
}
