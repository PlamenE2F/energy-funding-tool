/**
 * Building Discovery — Results Page
 *
 * Renders the Tier 2 assessment results including:
 *   - "Your Building at a Glance" with USER-ENTERED values (not benchmarks)
 *   - Energy Profile Snapshot (EUI, cost intensity, carbon footprint)
 *   - Gas Data Nudge Banner (when no gas data)
 *   - Energy Opportunities: only engine-backed measure cards
 *     1. LED Lighting Retrofit
 *     2. HVAC System Upgrade
 *     3. Rooftop Solar PV
 *
 * Data flow:
 *   URL search params → parse user inputs → run engines → render results
 *
 * All user-entered values are preserved and displayed as-is. The EUI engine
 * detects user-provided data and uses Standard/Enhanced paths — never falling
 * back to benchmark estimation when actual data exists.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { getBuildingTypeDisplayName } from "@/lib/config/display-names";
import { classifyAndCalculateRate } from "@/lib/rates";
import { calculateEui } from "@/lib/eui/calculator";
import { compareToBenchmark } from "@/lib/eui/benchmark";
import { calculateBuildingEmissions } from "@/lib/emissions/calculator";
import { calculateLedRetrofit } from "@/lib/measures/led-lighting";
import { calculateHvacUpgrade } from "@/lib/measures/hvac";
import { calculateSolarPv } from "@/lib/measures/solar-pv";
import { EnergyProfileSnapshot } from "@/components/energy-profile/energy-profile-snapshot";
import { GasNudgeBanner } from "@/components/energy-profile/gas-nudge-banner";
import { LedMeasureCard } from "@/components/measures/led-measure-card";
import { HvacMeasureCard } from "@/components/measures/hvac-measure-card";
import { SolarPvMeasureCard } from "@/components/measures/solar-pv-measure-card";
import type { AssessmentInput, RateClassificationResult } from "@/lib/rates/types";
import type { EuiInput, EuiResult, BenchmarkResult, EmissionsResult } from "@/lib/eui/types";
import type { EmissionsInput } from "@/lib/emissions/calculator";
import type { LedCalculationInput, LedCalculationResult } from "@/lib/measures/led-lighting";
import type { LightingType } from "@/lib/config/led-lighting";
import type { HvacCalculationInput, HvacCalculationResult } from "@/lib/measures/hvac";
import type { SolarCalculationInput, SolarCalculationResult } from "@/lib/measures/solar-pv";

// ---------------------------------------------------------------------------
// Page Component (with Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
}

function ResultsLoading() {
  return (
    <main className="vm-container">
      <p style={{ color: "var(--vm-gray-500)" }}>Loading results...</p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Main Content — Reads user inputs from URL params, runs engines, renders
// ---------------------------------------------------------------------------

function ResultsContent() {
  const searchParams = useSearchParams();

  // Parse user-entered values from URL search params
  const userInputs = useMemo(() => parseUserInputs(searchParams), [searchParams]);

  // Run calculation engines (memoized for performance)
  const results = useMemo(() => {
    if (!userInputs) return null;
    return runCalculationEngines(userInputs);
  }, [userInputs]);

  if (!userInputs || !results) {
    return (
      <main className="vm-container">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--vm-navy)" }}
        >
          Building Discovery Results
        </h1>
        <p style={{ color: "var(--vm-gray-500)" }}>
          No assessment data found. Please complete the Building Discovery form first.
        </p>
      </main>
    );
  }

  const buildingDisplayName = getBuildingTypeDisplayName(userInputs.buildingTypeId);
  const hasGasData = userInputs.annualGasM3 !== null && userInputs.annualGasM3 > 0;

  // Count engine-backed cards that are actually rendering
  const cardCount = [
    results.led !== null,
    results.hvac !== null,
    results.solar !== null,
  ].filter(Boolean).length;

  return (
    <main className="vm-container">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--vm-navy)" }}
        >
          Building Discovery Results
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--vm-gray-500)" }}
        >
          Assessment for your facility — {userInputs.buildingSizeSqft.toLocaleString()} sq ft {buildingDisplayName}
        </p>
      </div>

      {/* Your Building at a Glance — USER-ENTERED values, not benchmarks */}
      <section
        className="rounded-xl p-6 mb-6"
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
          Your Building at a Glance
        </h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--vm-gray-200)" }}
        >
          <table className="w-full text-sm">
            <tbody>
              <GlanceRow label="Building Type" value={buildingDisplayName} />
              <GlanceRow
                label="Building Size"
                value={`${userInputs.buildingSizeSqft.toLocaleString()} sq ft`}
              />
              <GlanceRow
                label="Annual Electricity"
                value={`${userInputs.annualElectricityKwh.toLocaleString()} kWh`}
              />
              {userInputs.annualElectricityCost !== null && (
                <GlanceRow
                  label="Annual Electricity Cost"
                  value={`$${userInputs.annualElectricityCost.toLocaleString()}`}
                />
              )}
              {userInputs.annualGasM3 !== null && userInputs.annualGasM3 > 0 && (
                <GlanceRow
                  label="Annual Gas Consumption"
                  value={`${userInputs.annualGasM3.toLocaleString()} m³`}
                />
              )}
              {userInputs.annualGasCost !== null && (
                <GlanceRow
                  label="Annual Gas Cost"
                  value={`$${userInputs.annualGasCost.toLocaleString()}`}
                />
              )}
              {userInputs.peakDemandKw !== null && (
                <GlanceRow
                  label="Peak Demand"
                  value={`${userInputs.peakDemandKw.toLocaleString()} kW`}
                />
              )}
              <GlanceRow
                label="Operating Hours"
                value={`${userInputs.operatingHours.toLocaleString()} hrs/yr`}
              />
              <GlanceRow
                label="Rate Classification"
                value={results.rateResult.rateClass.replace(/_/g, " ").toUpperCase()}
              />
              <GlanceRow
                label="Effective Rate"
                value={`$${results.rateResult.effectiveRateEnergy.toFixed(3)}/kWh`}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Energy Profile Snapshot */}
      {results.euiResult && results.benchmarkResult && results.emissionsResult && (
        <EnergyProfileSnapshot
          euiResult={results.euiResult}
          benchmarkResult={results.benchmarkResult}
          emissionsResult={results.emissionsResult}
          effectiveRateEnergy={results.rateResult.effectiveRateEnergy}
          buildingSizeSqft={userInputs.buildingSizeSqft}
          annualElectricityKwh={userInputs.annualElectricityKwh}
          annualCost={userInputs.annualElectricityCost}
        />
      )}

      {/* Gas Data Nudge */}
      <GasNudgeBanner hasGasData={hasGasData} />

      {/* Energy Opportunities — engine-backed cards only */}
      <section className="mt-8">
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: "var(--vm-navy)" }}
        >
          Energy Opportunities ({cardCount} Analyzed)
        </h2>

        <div className="space-y-6">
          {/* 1. LED Lighting Retrofit */}
          {results.led && <LedMeasureCard result={results.led} />}

          {/* 2. HVAC System Upgrade */}
          {results.hvac && <HvacMeasureCard result={results.hvac} />}

          {/* 3. Rooftop Solar PV */}
          {results.solar && (
            <SolarPvMeasureCard
              result={results.solar}
              ownershipType={userInputs.ownershipType}
            />
          )}
        </div>
      </section>

      {/* Tier 3 global CTA */}
      <section
        className="mt-8 rounded-xl p-6"
        style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
        }}
      >
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: "#1E40AF" }}
        >
          Want more precise results?
        </h3>
        <p className="text-sm" style={{ color: "#3B82F6" }}>
          A Tier 3 assessment uses interval data, equipment audits, and
          engineering analysis to provide investment-grade recommendations.
          Contact us to get started.
        </p>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// "At a Glance" Table Row
// ---------------------------------------------------------------------------

function GlanceRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderTop: "1px solid var(--vm-gray-100)" }}>
      <td
        className="px-4 py-2.5"
        style={{ color: "var(--vm-gray-600)" }}
      >
        {label}
      </td>
      <td
        className="px-4 py-2.5 text-right font-medium"
        style={{ color: "var(--vm-gray-800)" }}
      >
        {value}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Input Parsing — User-entered values from URL search params
// ---------------------------------------------------------------------------

interface ParsedUserInputs {
  buildingTypeId: string;
  buildingSizeSqft: number;
  operatingHours: number;
  annualElectricityKwh: number;
  annualElectricityCost: number | null;
  annualGasM3: number | null;
  annualGasCost: number | null;
  peakDemandKw: number | null;
  postalCode: string;
  rateStructure: string | null;
  lightingType: string;
  fuelSource: string;
  hvacAge: string;
  ownershipType: "own" | "lease" | "other" | null;
  operatingHoursCategory: "standard" | "extended" | "24_7";
}

function parseUserInputs(
  params: ReturnType<typeof useSearchParams>
): ParsedUserInputs | null {
  const buildingTypeId = params.get("buildingType");
  const buildingSizeSqft = parseFloat(params.get("buildingSize") ?? "");
  const annualElectricityKwh = parseFloat(params.get("annualKwh") ?? "");

  if (!buildingTypeId || isNaN(buildingSizeSqft) || isNaN(annualElectricityKwh)) {
    return null;
  }

  const operatingHours = parseFloat(params.get("operatingHours") ?? "3000");

  return {
    buildingTypeId,
    buildingSizeSqft,
    operatingHours,
    annualElectricityKwh,
    annualElectricityCost: parseNullableFloat(params.get("annualCost")),
    annualGasM3: parseNullableFloat(params.get("annualGasM3")),
    annualGasCost: parseNullableFloat(params.get("annualGasCost")),
    peakDemandKw: parseNullableFloat(params.get("peakDemandKw")),
    postalCode: params.get("postalCode") ?? "M5V 2T6",
    rateStructure: params.get("rateStructure") ?? null,
    lightingType: params.get("lightingType") ?? "mixed",
    fuelSource: params.get("fuelSource") ?? "natural_gas",
    hvacAge: params.get("hvacAge") ?? "10_20",
    ownershipType: (params.get("ownership") as "own" | "lease" | "other") ?? null,
    operatingHoursCategory: categorizeOperatingHours(operatingHours),
  };
}

function parseNullableFloat(value: string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function categorizeOperatingHours(hours: number): "standard" | "extended" | "24_7" {
  if (hours >= 7000) return "24_7";
  if (hours >= 4000) return "extended";
  return "standard";
}

// ---------------------------------------------------------------------------
// Calculation Engine Orchestration
// ---------------------------------------------------------------------------

interface CalculationResults {
  rateResult: RateClassificationResult;
  euiResult: EuiResult | null;
  benchmarkResult: BenchmarkResult | null;
  emissionsResult: EmissionsResult | null;
  led: LedCalculationResult | null;
  hvac: HvacCalculationResult | null;
  solar: SolarCalculationResult | null;
}

function runCalculationEngines(inputs: ParsedUserInputs): CalculationResults {
  // Step 1: Rate classification
  const rateInput: AssessmentInput = {
    buildingSizeSqft: inputs.buildingSizeSqft,
    buildingType: inputs.buildingTypeId as AssessmentInput["buildingType"],
    operatingHours: inputs.operatingHours,
    annualElectricityKwh: inputs.annualElectricityKwh,
    annualElectricityCost: inputs.annualElectricityCost,
    peakDemandKw: inputs.peakDemandKw,
    rateStructure: (inputs.rateStructure as AssessmentInput["rateStructure"]) ?? null,
    postalCode: inputs.postalCode,
  };

  const rateResult = classifyAndCalculateRate(rateInput);

  // Step 2: EUI calculation — uses user-provided data (not benchmarks)
  let euiResult: EuiResult | null = null;
  let benchmarkResult: BenchmarkResult | null = null;
  let emissionsResult: EmissionsResult | null = null;

  try {
    const euiInput: EuiInput = {
      buildingSizeSqft: inputs.buildingSizeSqft,
      buildingType: inputs.buildingTypeId as EuiInput["buildingType"],
      annualElectricityKwh: inputs.annualElectricityKwh,
      annualGasM3: inputs.annualGasM3,
      primaryFuelType: null,
      fuelVolume: null,
      monthlyElectricityKwh: null,
      monthlyGasM3: null,
      monthlyHdd: null,
      tmyAnnualHdd: null,
    };

    euiResult = calculateEui(euiInput);

    // compareToBenchmark(buildingTypeId, userEui, completionPath, effectiveRate)
    const displayEui = euiResult.euiTotal ?? euiResult.euiElectric;
    benchmarkResult = compareToBenchmark(
      inputs.buildingTypeId,
      displayEui,
      euiResult.completionPath,
      rateResult.effectiveRateEnergy
    );

    // calculateBuildingEmissions({ annualElectricityKwh, buildingSizeSqft, annualFuelVolume, fuelType, fuelIsEstimated })
    const emissionsInput: EmissionsInput = {
      annualElectricityKwh: inputs.annualElectricityKwh,
      buildingSizeSqft: inputs.buildingSizeSqft,
      annualFuelVolume: inputs.annualGasM3,
      fuelType: inputs.annualGasM3 ? "natural_gas" : null,
      fuelIsEstimated: false,
    };
    emissionsResult = calculateBuildingEmissions(emissionsInput);
  } catch {
    // EUI engine failure — continue without it
  }

  // Step 3: LED calculation
  let led: LedCalculationResult | null = null;
  try {
    // Convert annual hours to weekly: annualHrs / 52
    const operatingHoursPerWeek = Math.round(inputs.operatingHours / 52);
    const ledInput: LedCalculationInput = {
      buildingTypeId: inputs.buildingTypeId,
      buildingSizeSqft: inputs.buildingSizeSqft,
      annualElectricityKwh: inputs.annualElectricityKwh,
      operatingHoursPerWeek,
      lightingType: inputs.lightingType as LightingType,
      rateResult,
      electricityIsEstimated: false,
    };
    led = calculateLedRetrofit(ledInput);
  } catch {
    // LED engine failure — card won't show
  }

  // Step 4: HVAC calculation
  let hvac: HvacCalculationResult | null = null;
  try {
    const hvacInput: HvacCalculationInput = {
      buildingTypeId: inputs.buildingTypeId,
      buildingSizeSqft: inputs.buildingSizeSqft,
      annualElectricityKwh: inputs.annualElectricityKwh,
      fuelSource: inputs.fuelSource as HvacCalculationInput["fuelSource"],
      hvacAge: inputs.hvacAge as HvacCalculationInput["hvacAge"],
      annualGasM3: inputs.annualGasM3,
      annualGasCost: inputs.annualGasCost,
      annualOilLitres: null,
      annualOilCost: null,
      annualPropaneLitres: null,
      annualPropaneCost: null,
      rateResult,
      completionPath: euiResult?.completionPath ?? "fast",
      weatherDepElectricAnnual: null,
      weatherDepGasAnnual: null,
      regressionQualityFlag: null,
      benchmarkClassification: benchmarkResult?.classification ?? "yellow",
      ownershipType: inputs.ownershipType,
    };
    hvac = calculateHvacUpgrade(hvacInput);
  } catch {
    // HVAC engine failure — card won't show
  }

  // Step 5: Solar PV calculation
  let solar: SolarCalculationResult | null = null;
  try {
    const solarInput: SolarCalculationInput = {
      postalCode: inputs.postalCode,
      buildingTypeId: inputs.buildingTypeId,
      buildingSizeSqft: inputs.buildingSizeSqft,
      operatingHours: inputs.operatingHoursCategory,
      annualElectricityKwh: inputs.annualElectricityKwh,
      peakDemandKw: inputs.peakDemandKw,
      rateResult,
      completionPath: euiResult?.completionPath ?? null,
      baseloadElectricAnnual: null,
      regressionQualityFlag: null,
      euiValidationWarning: false,
      ownershipType: inputs.ownershipType,
    };
    solar = calculateSolarPv(solarInput);
  } catch {
    // Solar engine failure — card won't show
  }

  return {
    rateResult,
    euiResult,
    benchmarkResult,
    emissionsResult,
    led,
    hvac,
    solar,
  };
}
