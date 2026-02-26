/**
 * LED Lighting Retrofit — Calculation Engine
 *
 * 10-step calculation pipeline:
 *   1. Estimate current lighting energy consumption
 *   2. Determine LED savings percentage
 *   3. Calculate annual energy savings (kWh)
 *   4. Calculate annual dollar savings (energy) — from rate framework
 *   5. Calculate demand charge savings (Class B+ only)
 *   6. Estimate implementation cost
 *   7. Estimate incentives (SaveOnEnergy)
 *   8. Net cost and simple payback
 *   9. NPV with three escalation scenarios
 *  10. CO₂ reduction
 *
 * Integrates with:
 *   - Rate Classification Framework (effectiveRateEnergy, demandChargeRate)
 *   - EUI Emissions Engine (scope2_average_factor = 59 gCO₂eq/kWh)
 */

import type { RateClassificationResult } from "@/lib/rates/types";
import {
  getLedBuildingConfig,
  getLightingTechConfig,
  isHidAdjustmentEligible,
  SOE_CUSTOM_INCENTIVE_RATE,
  SOE_INCENTIVE_CAP_PCT,
  NPV_DISCOUNT_RATE,
  NPV_ANALYSIS_PERIOD_YEARS,
  RATE_ESCALATION_CONSERVATIVE,
  RATE_ESCALATION_BASE,
  RATE_ESCALATION_HIGH,
  DEMAND_SAVINGS_DIVERSITY_FACTOR,
  LOW_SAVINGS_THRESHOLD_DOLLARS,
  HIGH_PAYBACK_THRESHOLD_YEARS,
  SMALL_BUILDING_THRESHOLD_SQFT,
  type LightingType,
  type LedConfidence,
} from "@/lib/config/led-lighting";
import {
  SCOPE2_AVERAGE_FACTOR,
} from "@/lib/config/emissions";
import {
  BENCHMARK_COST_RATE_ELECTRIC,
} from "@/lib/config/emissions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LedCalculationInput {
  buildingTypeId: string;
  buildingSizeSqft: number;
  annualElectricityKwh: number;
  operatingHoursPerWeek: number;
  lightingType: LightingType;
  /** Rate classification result (null triggers fallback) */
  rateResult: RateClassificationResult | null;
  /** Whether electricity data is estimated (not from bills) */
  electricityIsEstimated: boolean;
}

export interface LedCalculationResult {
  /** Whether the standard LED measure applies */
  measureApplicable: boolean;
  /** Special note for this building type (greenhouse, data center, etc.) */
  measureNote: string | null;

  // Step 1: Lighting energy
  lightingEnergyKwh: number;
  lightingShareUsed: number;

  // Step 2-3: Savings
  savingsPct: number;
  annualSavingsKwh: number;

  // Step 4-5: Dollar savings
  annualEnergySavingsDollars: number;
  annualDemandSavingsDollars: number;
  annualTotalSavingsDollars: number;
  peakDemandReductionKw: number | null;

  // Step 6: Cost
  costMidpoint: number;
  costUpper: number;

  // Step 7: Incentive
  incentiveEstimate: number;

  // Step 8: Net cost and payback
  netCostMidpoint: number;
  netCostUpper: number;
  paybackLower: number | null;
  paybackUpper: number | null;
  paybackImmediate: boolean;

  // Step 9: NPV
  npvConservative: number;
  npvBase: number;
  npvHigh: number;

  // Step 10: CO₂
  co2ReductionTonnes: number;

  // Traceability
  electricityRateUsed: number;
  demandChargeRateUsed: number | null;
  rateClassUsed: string;
  emissionFactorUsed: number;

  // Confidence and flags
  confidence: LedConfidence;
  confidenceNote: string;
  flags: LedFlag[];
}

export interface LedFlag {
  type: "info" | "warning" | "edge_case";
  message: string;
}

// ---------------------------------------------------------------------------
// Main Calculation Pipeline
// ---------------------------------------------------------------------------

export function calculateLedRetrofit(
  input: LedCalculationInput
): LedCalculationResult {
  const buildingConfig = getLedBuildingConfig(input.buildingTypeId);
  const techConfig = getLightingTechConfig(input.lightingType);
  const flags: LedFlag[] = [];

  // -----------------------------------------------------------------------
  // Check if measure applies
  // -----------------------------------------------------------------------

  if (!buildingConfig.measureApplicable) {
    return buildNonApplicableResult(buildingConfig, input);
  }

  // Check if already LED
  if (input.lightingType === "led") {
    return buildAlreadyLedResult(buildingConfig, input);
  }

  // -----------------------------------------------------------------------
  // Step 1: Estimate current lighting energy consumption
  // -----------------------------------------------------------------------

  let lightingSharePct = buildingConfig.lightingSharePct;

  // HID adjustment for warehouse/industrial types
  if (
    input.lightingType === "hid" &&
    isHidAdjustmentEligible(input.buildingTypeId)
  ) {
    lightingSharePct += techConfig.hidLightingShareAdjustment;
  }

  const lightingEnergyKwh = input.annualElectricityKwh * lightingSharePct;

  // -----------------------------------------------------------------------
  // Step 2: Determine LED savings percentage
  // -----------------------------------------------------------------------

  let savingsPct = techConfig.savingsVsLedPct;

  // Mixed/partial LED: assume 50% already LED
  if (input.lightingType === "mixed") {
    // 50% of lighting energy × savings_pct
    // Effectively: lightingEnergy * 0.50 * savingsPct
    // We model this by halving the effective savings percentage
    savingsPct = savingsPct * 0.5;
  }

  // -----------------------------------------------------------------------
  // Step 3: Calculate annual energy savings
  // -----------------------------------------------------------------------

  const annualSavingsKwh = lightingEnergyKwh * savingsPct;

  // -----------------------------------------------------------------------
  // Step 4: Calculate annual dollar savings (energy)
  // -----------------------------------------------------------------------

  const rateResult = input.rateResult;
  const electricityRate =
    rateResult?.effectiveRateEnergy ?? BENCHMARK_COST_RATE_ELECTRIC;
  const rateClassUsed = rateResult?.rateClass ?? "unknown";

  const annualEnergySavingsDollars = annualSavingsKwh * electricityRate;

  // -----------------------------------------------------------------------
  // Step 5: Demand charge savings (Class B+ only)
  // -----------------------------------------------------------------------

  let annualDemandSavingsDollars = 0;
  let peakDemandReductionKw: number | null = null;
  const demandChargeRate = rateResult?.demandChargeRate ?? null;

  if (rateResult?.demandChargeApplicable && demandChargeRate) {
    const annualOperatingHours = input.operatingHoursPerWeek * 52;
    if (annualOperatingHours > 0) {
      peakDemandReductionKw =
        (annualSavingsKwh / annualOperatingHours) * DEMAND_SAVINGS_DIVERSITY_FACTOR;
      annualDemandSavingsDollars =
        peakDemandReductionKw * demandChargeRate * 12;
    }
  }

  const annualTotalSavingsDollars =
    annualEnergySavingsDollars + annualDemandSavingsDollars;

  // -----------------------------------------------------------------------
  // Step 6: Estimate implementation cost
  // -----------------------------------------------------------------------

  const costMidpoint =
    input.buildingSizeSqft * buildingConfig.costMidpointPerSqft;
  const costUpper =
    input.buildingSizeSqft * buildingConfig.costUpperPerSqft;

  // -----------------------------------------------------------------------
  // Step 7: Incentive estimation (SaveOnEnergy Custom)
  // -----------------------------------------------------------------------

  const incentiveFromKwh = annualSavingsKwh * SOE_CUSTOM_INCENTIVE_RATE;
  const incentiveCap = costMidpoint * SOE_INCENTIVE_CAP_PCT;
  const incentiveEstimate = Math.min(incentiveFromKwh, incentiveCap);

  // -----------------------------------------------------------------------
  // Step 8: Net cost and simple payback
  // -----------------------------------------------------------------------

  const netCostMidpoint = Math.max(0, costMidpoint - incentiveEstimate);
  const netCostUpper = Math.max(0, costUpper - incentiveEstimate);
  const paybackImmediate = netCostMidpoint <= 0;

  let paybackLower: number | null = null;
  let paybackUpper: number | null = null;

  if (annualTotalSavingsDollars > 0 && !paybackImmediate) {
    paybackLower = netCostMidpoint / annualTotalSavingsDollars;
    paybackUpper = netCostUpper / annualTotalSavingsDollars;
  }

  // -----------------------------------------------------------------------
  // Step 9: NPV with three escalation scenarios
  // -----------------------------------------------------------------------

  const npvConservative = calculateNpv(
    netCostMidpoint,
    annualTotalSavingsDollars,
    RATE_ESCALATION_CONSERVATIVE
  );
  const npvBase = calculateNpv(
    netCostMidpoint,
    annualTotalSavingsDollars,
    RATE_ESCALATION_BASE
  );
  const npvHigh = calculateNpv(
    netCostMidpoint,
    annualTotalSavingsDollars,
    RATE_ESCALATION_HIGH
  );

  // -----------------------------------------------------------------------
  // Step 10: CO₂ reduction
  // -----------------------------------------------------------------------

  const co2ReductionTonnes =
    (annualSavingsKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;

  // -----------------------------------------------------------------------
  // Confidence level and flags
  // -----------------------------------------------------------------------

  const confidence = determineConfidence(
    input,
    paybackUpper
  );

  const confidenceNote = getConfidenceNote(confidence);

  // Edge case flags
  if (buildingConfig.measureNote) {
    flags.push({ type: "info", message: buildingConfig.measureNote });
  }

  if (input.buildingSizeSqft < SMALL_BUILDING_THRESHOLD_SQFT) {
    flags.push({
      type: "info",
      message:
        "For smaller buildings, consider a phased DIY approach with Type A LED tubes from a participating SaveOnEnergy distributor (Instant Discounts program).",
    });
  }

  if (paybackUpper !== null && paybackUpper > HIGH_PAYBACK_THRESHOLD_YEARS) {
    flags.push({
      type: "warning",
      message:
        "Long payback — consider a phased approach starting with highest-use areas, or a lamp-only retrofit at lower cost.",
    });
  }

  if (annualTotalSavingsDollars < LOW_SAVINGS_THRESHOLD_DOLLARS && annualTotalSavingsDollars > 0) {
    flags.push({
      type: "info",
      message:
        "Small savings potential. Lighting efficiency is already reasonable or lighting is a small share of energy use.",
    });
  }

  return {
    measureApplicable: true,
    measureNote: buildingConfig.measureNote,
    lightingEnergyKwh: round(lightingEnergyKwh, 0),
    lightingShareUsed: lightingSharePct,
    savingsPct,
    annualSavingsKwh: round(annualSavingsKwh, 0),
    annualEnergySavingsDollars: round(annualEnergySavingsDollars, 0),
    annualDemandSavingsDollars: round(annualDemandSavingsDollars, 0),
    annualTotalSavingsDollars: round(annualTotalSavingsDollars, 0),
    peakDemandReductionKw:
      peakDemandReductionKw !== null ? round(peakDemandReductionKw, 1) : null,
    costMidpoint: round(costMidpoint, 0),
    costUpper: round(costUpper, 0),
    incentiveEstimate: round(incentiveEstimate, 0),
    netCostMidpoint: round(netCostMidpoint, 0),
    netCostUpper: round(netCostUpper, 0),
    paybackLower: paybackLower !== null ? round(paybackLower, 1) : null,
    paybackUpper: paybackUpper !== null ? round(paybackUpper, 1) : null,
    paybackImmediate,
    npvConservative: round(npvConservative, 0),
    npvBase: round(npvBase, 0),
    npvHigh: round(npvHigh, 0),
    co2ReductionTonnes: round(co2ReductionTonnes, 1),
    electricityRateUsed: electricityRate,
    demandChargeRateUsed: demandChargeRate,
    rateClassUsed,
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
    confidence,
    confidenceNote,
    flags,
  };
}

// ---------------------------------------------------------------------------
// NPV Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate NPV: -initial_cost + PV of escalating annual savings.
 *
 * npv = -net_cost + SUM(year=1..N) of:
 *   savings × (1 + escalation)^year / (1 + discount)^year
 */
function calculateNpv(
  netCost: number,
  annualSavings: number,
  rateEscalation: number
): number {
  let pvSavings = 0;
  for (let year = 1; year <= NPV_ANALYSIS_PERIOD_YEARS; year++) {
    const escalatedSavings =
      annualSavings * Math.pow(1 + rateEscalation, year);
    const discounted = escalatedSavings / Math.pow(1 + NPV_DISCOUNT_RATE, year);
    pvSavings += discounted;
  }
  return pvSavings - netCost;
}

// ---------------------------------------------------------------------------
// Confidence Level
// ---------------------------------------------------------------------------

function determineConfidence(
  input: LedCalculationInput,
  paybackUpper: number | null
): LedConfidence {
  // RED: estimated electricity or payback > 10 years
  if (input.electricityIsEstimated) return "red";
  if (paybackUpper !== null && paybackUpper > HIGH_PAYBACK_THRESHOLD_YEARS) {
    return "red";
  }

  // YELLOW: lighting type is mixed or unknown
  if (
    input.lightingType === "mixed" ||
    input.lightingType === "unknown"
  ) {
    return "yellow";
  }

  // GREEN: actual electricity + specific lighting type
  return "green";
}

function getConfidenceNote(confidence: LedConfidence): string {
  switch (confidence) {
    case "green":
      return "Based on your reported energy use and lighting type";
    case "yellow":
      return "Based on your energy use. Lighting type assumed — actual savings may differ.";
    case "red":
      return "Rough estimate only. Provide actual utility data for a more accurate assessment.";
  }
}

// ---------------------------------------------------------------------------
// Non-Applicable / Already-LED Result Builders
// ---------------------------------------------------------------------------

function buildNonApplicableResult(
  config: ReturnType<typeof getLedBuildingConfig>,
  input: LedCalculationInput
): LedCalculationResult {
  return {
    measureApplicable: false,
    measureNote: config.measureNote,
    lightingEnergyKwh: 0,
    lightingShareUsed: config.lightingSharePct,
    savingsPct: 0,
    annualSavingsKwh: 0,
    annualEnergySavingsDollars: 0,
    annualDemandSavingsDollars: 0,
    annualTotalSavingsDollars: 0,
    peakDemandReductionKw: null,
    costMidpoint: 0,
    costUpper: 0,
    incentiveEstimate: 0,
    netCostMidpoint: 0,
    netCostUpper: 0,
    paybackLower: null,
    paybackUpper: null,
    paybackImmediate: false,
    npvConservative: 0,
    npvBase: 0,
    npvHigh: 0,
    co2ReductionTonnes: 0,
    electricityRateUsed: input.rateResult?.effectiveRateEnergy ?? BENCHMARK_COST_RATE_ELECTRIC,
    demandChargeRateUsed: input.rateResult?.demandChargeRate ?? null,
    rateClassUsed: input.rateResult?.rateClass ?? "unknown",
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
    confidence: "green",
    confidenceNote: "",
    flags: config.measureNote
      ? [{ type: "edge_case", message: config.measureNote }]
      : [],
  };
}

function buildAlreadyLedResult(
  config: ReturnType<typeof getLedBuildingConfig>,
  input: LedCalculationInput
): LedCalculationResult {
  return {
    measureApplicable: true,
    measureNote:
      "Your lighting appears to already be LED. If your building still has some older fixtures, a full audit may identify remaining upgrade opportunities.",
    lightingEnergyKwh: round(
      input.annualElectricityKwh * config.lightingSharePct,
      0
    ),
    lightingShareUsed: config.lightingSharePct,
    savingsPct: 0,
    annualSavingsKwh: 0,
    annualEnergySavingsDollars: 0,
    annualDemandSavingsDollars: 0,
    annualTotalSavingsDollars: 0,
    peakDemandReductionKw: null,
    costMidpoint: 0,
    costUpper: 0,
    incentiveEstimate: 0,
    netCostMidpoint: 0,
    netCostUpper: 0,
    paybackLower: null,
    paybackUpper: null,
    paybackImmediate: false,
    npvConservative: 0,
    npvBase: 0,
    npvHigh: 0,
    co2ReductionTonnes: 0,
    electricityRateUsed: input.rateResult?.effectiveRateEnergy ?? BENCHMARK_COST_RATE_ELECTRIC,
    demandChargeRateUsed: input.rateResult?.demandChargeRate ?? null,
    rateClassUsed: input.rateResult?.rateClass ?? "unknown",
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
    confidence: "green",
    confidenceNote: "",
    flags: [
      {
        type: "edge_case",
        message:
          "Your lighting appears to already be LED. If your building still has some older fixtures, a full audit may identify remaining upgrade opportunities.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
