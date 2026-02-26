/**
 * VoltMatch Rate Classification Engine — Public API
 *
 * Main entry point for the rate classification framework.
 * Orchestrates classification, effective rate calculation,
 * and demand charge assessment.
 */

import type {
  AssessmentInput,
  RateClassificationResult,
  MeasureSavings,
  RateClass,
} from "./types";
import {
  classifyBuilding,
  estimatePeakDemand,
  isClassAEligible,
} from "./classification";
import { calculateEffectiveRate } from "./effective-rate";
import {
  calculateDemandSavings,
  estimatePeakReduction,
  type MeasureType,
} from "./demand-charges";
import { RATE_ESCALATION } from "@/lib/config/ontario-rates";

// Re-export types and key functions
export type {
  AssessmentInput,
  RateClassificationResult,
  MeasureSavings,
  RateClass,
  MeasureType,
};
export { estimatePeakDemand, isClassAEligible } from "./classification";
export { validateEffectiveRate } from "./effective-rate";
export {
  calculateDemandSavings,
  estimatePeakReduction,
  PEAK_IMPACT_PROFILES,
} from "./demand-charges";

// ---------------------------------------------------------------------------
// Main Classification Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the complete rate classification and effective rate calculation
 * for a building assessment.
 *
 * This is the primary function called by the assessment flow.
 * Returns everything needed to populate assessment results and
 * feed into measure card savings calculations.
 */
export function classifyAndCalculateRate(
  input: AssessmentInput
): RateClassificationResult {
  // Step 1: Estimate peak demand
  const estimatedPeakKw =
    input.peakDemandKw ??
    estimatePeakDemand(
      input.annualElectricityKwh,
      input.operatingHours,
      input.buildingType
    );

  // Step 2: Classify building
  const classification = classifyBuilding(input);

  // Step 3: Calculate effective rate
  const rateResult = calculateEffectiveRate(
    input,
    classification.rateClass,
    estimatedPeakKw
  );

  // Step 4: Check Class A eligibility
  const classAEligible = isClassAEligible(estimatedPeakKw, input.buildingType);

  // Merge all warnings
  const allWarnings = [
    ...classification.warnings,
    ...rateResult.warnings,
  ];

  return {
    rateClass: classification.rateClass,
    rateClassSource: classification.source,
    rateClassConfidence: classification.confidence,
    rateStructure: input.rateStructure,
    estimatedPeakKw,
    classAEligible,
    effectiveRateTotal: rateResult.effectiveRateTotal,
    effectiveRateEnergy: rateResult.effectiveRateEnergy,
    effectiveRateSource: rateResult.source,
    demandChargeRate: rateResult.demandChargeRate,
    demandChargeApplicable: rateResult.demandChargeApplicable,
    warnings: allWarnings,
  };
}

// ---------------------------------------------------------------------------
// Measure Card Savings Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate savings for a single measure card, using the rate classification
 * result from the assessment.
 *
 * This replaces any hardcoded rate in existing measure cards.
 *
 * @param energySavingsKwh - Annual energy savings from the measure
 * @param measureType - Type of efficiency measure
 * @param rateResult - Output from classifyAndCalculateRate()
 * @param operatingHours - Building's annual operating hours
 * @param peakReductionKwOverride - Optional direct peak reduction (kW)
 */
export function calculateMeasureSavings(
  energySavingsKwh: number,
  measureType: MeasureType,
  rateResult: RateClassificationResult,
  operatingHours: number,
  peakReductionKwOverride?: number
): MeasureSavings {
  // Energy savings in dollars
  const energySavingsDollars =
    Math.round(energySavingsKwh * rateResult.effectiveRateEnergy * 100) / 100;

  // Peak demand reduction
  const peakReductionKw =
    peakReductionKwOverride ??
    (rateResult.demandChargeApplicable
      ? estimatePeakReduction(
          measureType,
          rateResult.estimatedPeakKw,
          energySavingsKwh,
          operatingHours
        )
      : 0);

  // Demand charge savings
  const demandResult = calculateDemandSavings(
    rateResult.rateClass,
    rateResult.demandChargeRate,
    peakReductionKw
  );

  // Total annual savings
  const totalSavingsAnnual =
    Math.round((energySavingsDollars + demandResult.demandSavingsAnnual) * 100) /
    100;

  // 10-year projections with escalation scenarios
  const tenYearProjections = calculateTenYearProjections(totalSavingsAnnual);

  // Rate basis label for display
  const rateBasisLabel = getRateBasisLabel(rateResult.rateClass);

  return {
    energySavingsKwh,
    energySavingsDollars,
    peakReductionApplicable: demandResult.applicable,
    peakReductionKw: demandResult.applicable ? peakReductionKw : null,
    demandSavingsAnnual: demandResult.applicable
      ? demandResult.demandSavingsAnnual
      : null,
    totalSavingsAnnual,
    rateClass: rateResult.rateClass,
    rateBasisLabel,
    tenYearProjections,
  };
}

// ---------------------------------------------------------------------------
// 10-Year Projections (Approved Decision #3)
// ---------------------------------------------------------------------------

/**
 * Calculate 10-year cumulative savings at three escalation scenarios.
 *
 * Scenarios (approved):
 *   Conservative (2.0%): Historical average, stable grid
 *   Base Case (2.5%): Current trend, moderate electrification growth
 *   High Growth (4.0–5.0%): IESO capacity expansion, data center demand
 *
 * Card summary shows base case only.
 * Detail view shows all three as chart lines.
 */
export function calculateTenYearProjections(annualSavings: number): {
  conservative: number;
  baseCase: number;
  highGrowth: number;
} {
  return {
    conservative: calculateCumulativeSavings(
      annualSavings,
      RATE_ESCALATION.conservative,
      10
    ),
    baseCase: calculateCumulativeSavings(
      annualSavings,
      RATE_ESCALATION.baseCase,
      10
    ),
    highGrowth: calculateCumulativeSavings(
      annualSavings,
      RATE_ESCALATION.highGrowth,
      10
    ),
  };
}

/**
 * Calculate cumulative savings over N years with annual rate escalation.
 * Sum of: savings × (1 + rate)^year for year 0..N-1
 */
function calculateCumulativeSavings(
  annualSavings: number,
  escalationRate: number,
  years: number
): number {
  let cumulative = 0;
  for (let year = 0; year < years; year++) {
    cumulative += annualSavings * Math.pow(1 + escalationRate, year);
  }
  return Math.round(cumulative);
}

// ---------------------------------------------------------------------------
// Display Helpers
// ---------------------------------------------------------------------------

/**
 * Get the rate basis label for display on measure cards.
 *
 * RPP: "Based on your TOU rate" / "Based on your tiered rate" / etc.
 * Class B: "Based on your spot market rate and demand charges"
 * Class A: "Based on your Class A rate and demand charges"
 */
export function getRateBasisLabel(rateClass: RateClass): string {
  switch (rateClass) {
    case "rpp_tou":
      return "Based on your Time-of-Use rate";
    case "rpp_ulo":
      return "Based on your Ultra-Low Overnight rate";
    case "rpp_tiered":
      return "Based on your tiered rate";
    case "class_b":
      return "Based on your spot market rate and demand charges";
    case "class_a":
      return "Based on your Class A rate and demand charges";
    default:
      return "Based on estimated Ontario average rate";
  }
}

/**
 * Format a dollar amount for display.
 */
export function formatDollars(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a kWh amount for display.
 */
export function formatKwh(kwh: number): string {
  return new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(kwh);
}
