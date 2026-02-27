/**
 * HVAC Upgrades — Calculation Engine
 *
 * 10-step calculation pipeline:
 *   1. Estimate current HVAC energy consumption (Enhanced vs Standard path)
 *   2. Determine upgrade scenario and savings (7 scenarios, combined pathway)
 *   3. Calculate annual energy savings (kWh, m³, net)
 *   4. Calculate annual dollar savings (energy — dual-fuel for switching)
 *   5. Calculate demand charge savings (cooling only, Class B+)
 *   6. Estimate implementation cost ($/sqft by scenario × size)
 *   7. Estimate incentives (SaveOnEnergy, Enbridge, CT ITC, OHPA)
 *   8. Net cost and simple payback
 *   9. NPV with three escalation scenarios (dual-fuel)
 *  10. CO₂ reduction (Scope 1 avoided / Scope 2 added for fuel switching)
 *
 * Integrates with:
 *   - Rate Classification Framework (effectiveRateEnergy, demandChargeRate)
 *   - EUI Baseline & Emissions Engine (completion path, regression data)
 *   - Shared Financial Defaults (NPV, escalation, incentive params)
 */

import type { RateClassificationResult } from "@/lib/rates/types";
import type { BenchmarkClassification, CompletionPath, RegressionQuality } from "@/lib/eui/types";
import {
  getHvacBuildingConfig,
  getHvacCostConfig,
  getSizeCategory,
  EXISTING_FURNACE_EFFICIENCY,
  GAS_SAVINGS_PCT_HE01,
  COOLING_SAVINGS_PCT,
  COOLING_SHARE_OF_HVAC_ELECTRIC,
  HEATING_SHARE_OF_HVAC_ELECTRIC,
  COOLING_DIVERSITY_FACTOR,
  TYPICAL_COOLING_HOURS,
  SEASONAL_COP_ASHP,
  SEASONAL_COP_GSHP,
  GAS_RATE_DEFAULT,
  GAS_RATE_BACKSOLVE,
  OIL_RATE_DEFAULT,
  PROPANE_RATE_DEFAULT,
  GAS_KWH_PER_M3,
  OIL_KWH_PER_LITRE,
  PROPANE_KWH_PER_LITRE,
  OIL_FURNACE_EFFICIENCY,
  PROPANE_FURNACE_EFFICIENCY,
  FALLBACK_ELECTRICITY_RATE,
  HIGH_PAYBACK_THRESHOLD_YEARS,
  SMALL_BUILDING_THRESHOLD_SQFT,
  type FuelSource,
  type HvacAge,
  type HvacScenarioId,
  type HvacConfidence,
} from "@/lib/config/hvac";
import {
  NPV_DISCOUNT_RATE,
  NPV_ANALYSIS_PERIOD_YEARS,
  RATE_ESCALATION_CONSERVATIVE,
  RATE_ESCALATION_BASE,
  RATE_ESCALATION_HIGH,
  GAS_ESCALATION_CONSERVATIVE,
  GAS_ESCALATION_BASE,
  GAS_ESCALATION_HIGH,
  SOE_CUSTOM_RATE_KWH,
  SOE_CUSTOM_RATE_KW,
  SOE_CAP_PCT,
  ENBRIDGE_CUSTOM_RATE_STANDARD,
  ENBRIDGE_CAP_PCT,
  ENBRIDGE_MAX_PER_PROJECT,
  CT_ITC_RATE,
  OHPA_FLAT_AMOUNT,
} from "@/lib/config/financial-defaults";
import { SCOPE2_AVERAGE_FACTOR } from "@/lib/config/emissions";
import { getBuildingTypeConfig } from "@/lib/config/building-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HvacCalculationInput {
  buildingTypeId: string;
  buildingSizeSqft: number;
  annualElectricityKwh: number;

  /** R7: Primary fuel source */
  fuelSource: FuelSource;
  /** R9: HVAC age category */
  hvacAge: HvacAge;

  /** Gas consumption in m³ (from O2, null if not provided) */
  annualGasM3: number | null;
  /** Gas cost in $ (from O4, null if not provided) */
  annualGasCost: number | null;

  /** Oil consumption in litres (from O2 for oil buildings) */
  annualOilLitres: number | null;
  /** Oil cost in $ */
  annualOilCost: number | null;

  /** Propane consumption in litres */
  annualPropaneLitres: number | null;
  /** Propane cost in $ */
  annualPropaneCost: number | null;

  /** Rate classification result (null triggers fallback) */
  rateResult: RateClassificationResult | null;

  /** EUI engine: completion path */
  completionPath: CompletionPath | null;
  /** Enhanced path: weather-dependent electric annual (kWh) */
  weatherDepElectricAnnual: number | null;
  /** Enhanced path: weather-dependent gas annual (m³) */
  weatherDepGasAnnual: number | null;
  /** Enhanced path: regression quality flag */
  regressionQualityFlag: RegressionQuality | null;

  /** Building type benchmark classification (from EUI engine) */
  benchmarkClassification: BenchmarkClassification | null;

  /** Ownership type for CTA framing */
  ownershipType: "own" | "lease" | "other" | null;
}

export interface HvacCalculationResult {
  measureApplicable: boolean;

  // Pathway and scenario
  scenarioPrimary: HvacScenarioId;
  scenarioPrimaryName: string;
  scenarioAlternative: HvacScenarioId | null;
  dataPath: "enhanced" | "standard";

  // Step 1: HVAC energy pools
  hvacElectricityPoolKwh: number;
  hvacGasPoolM3: number | null;
  hvacOilPoolLitres: number | null;
  hvacPropanePoolLitres: number | null;
  gasPoolEstimated: boolean;

  // Step 2-3: Energy savings
  heatingElectricityAddedKwh: number | null;
  coolingKwhSavings: number | null;
  gasDisplacedM3: number | null;
  oilDisplacedLitres: number | null;
  propaneDisplacedLitres: number | null;
  annualKwhSavings: number;
  annualGasM3Savings: number | null;
  annualNetElectricityChangeKwh: number | null;

  // Step 4: Dollar savings
  dollarSavingsGas: number | null;
  dollarCostElectricityAdded: number | null;
  dollarSavingsCooling: number | null;
  dollarSavingsNet: number;

  // Step 5: Demand savings
  coolingKwReduction: number | null;
  demandSavingsAnnual: number;

  // Total annual savings
  annualTotalSavings: number;

  // Step 6: Cost
  projectCostMidpoint: number;
  projectCostUpper: number;
  incrementalCost: number | null;

  // Step 7: Incentives
  incentiveSoe: number;
  incentiveEnbridge: number;
  incentiveCtItc: number;
  incentiveOhpa: number;
  incentiveLow: number;
  incentiveHigh: number;

  // Step 8: Net cost and payback
  netCostMidpoint: number;
  netCostUpper: number;
  paybackMidpoint: number | null;
  paybackUpper: number | null;

  // Step 9: NPV
  npvConservative: number;
  npvBase: number;
  npvHigh: number;

  // Step 10: CO₂
  co2AvoidedScope1: number | null;
  co2AddedScope2: number | null;
  co2NetReduction: number;
  co2ReductionPct: number | null;

  // Alternative scenario (HE-01 for gas buildings)
  alternativeResult: HvacAlternativeResult | null;

  // Traceability
  electricityRateUsed: number;
  demandChargeRateUsed: number | null;
  rateClassUsed: string;
  seasonalCopUsed: number;
  existingEfficiencyUsed: number;
  effectiveGasRateUsed: number | null;
  effectiveOilRateUsed: number | null;
  effectivePropaneRateUsed: number | null;
  costBasis: string;

  // Confidence and flags
  confidence: HvacConfidence;
  confidenceNote: string;
  flags: HvacFlag[];
}

export interface HvacAlternativeResult {
  scenarioId: HvacScenarioId;
  scenarioName: string;
  annualGasSavingsM3: number;
  annualDollarSavings: number;
  co2ReductionTonnes: number;
  projectCostMidpoint: number;
  incentiveEnbridge: number;
  netCost: number;
  payback: number | null;
}

export interface HvacFlag {
  type: "info" | "warning" | "edge_case";
  message: string;
}

// ---------------------------------------------------------------------------
// Main Calculation Pipeline
// ---------------------------------------------------------------------------

export function calculateHvacUpgrade(
  input: HvacCalculationInput
): HvacCalculationResult {
  const buildingConfig = getHvacBuildingConfig(input.buildingTypeId);
  const flags: HvacFlag[] = [];

  // -----------------------------------------------------------------------
  // Pathway selection: fuel_source → scenario
  // -----------------------------------------------------------------------

  const { primary, alternative } = selectScenario(input);

  // -----------------------------------------------------------------------
  // Step 1: Estimate Current HVAC Energy Consumption
  // -----------------------------------------------------------------------

  const useEnhanced =
    input.completionPath === "enhanced" &&
    input.regressionQualityFlag !== null &&
    (input.regressionQualityFlag === "good" || input.regressionQualityFlag === "moderate");

  const dataPath: "enhanced" | "standard" = useEnhanced ? "enhanced" : "standard";

  let hvacElectricityPoolKwh: number;
  let hvacGasPoolM3: number | null = null;
  let hvacOilPoolLitres: number | null = null;
  let hvacPropanePoolLitres: number | null = null;
  let gasPoolEstimated = false;

  if (useEnhanced && input.weatherDepElectricAnnual !== null) {
    hvacElectricityPoolKwh = input.weatherDepElectricAnnual;
  } else {
    hvacElectricityPoolKwh = input.annualElectricityKwh * buildingConfig.hvacElectricPct;
  }

  // Gas pool
  if (input.fuelSource === "natural_gas" || input.fuelSource === "other") {
    if (useEnhanced && input.weatherDepGasAnnual !== null) {
      hvacGasPoolM3 = input.weatherDepGasAnnual;
    } else if (input.annualGasM3 !== null) {
      hvacGasPoolM3 = input.annualGasM3 * buildingConfig.hvacGasPct;
    } else {
      // Gas estimation fallback
      hvacGasPoolM3 = estimateGasFromEui(input, buildingConfig);
      gasPoolEstimated = true;
    }
  }

  // Oil pool
  if (input.fuelSource === "oil") {
    if (input.annualOilLitres !== null) {
      hvacOilPoolLitres = input.annualOilLitres * buildingConfig.hvacGasPct;
    }
  }

  // Propane pool
  if (input.fuelSource === "propane") {
    if (input.annualPropaneLitres !== null) {
      hvacPropanePoolLitres = input.annualPropaneLitres * buildingConfig.hvacGasPct;
    }
  }

  // -----------------------------------------------------------------------
  // Step 2-3: Calculate savings based on scenario
  // -----------------------------------------------------------------------

  let heatingElectricityAddedKwh: number | null = null;
  let coolingKwhSavings: number | null = null;
  let gasDisplacedM3: number | null = null;
  let oilDisplacedLitres: number | null = null;
  let propaneDisplacedLitres: number | null = null;
  let annualKwhSavings = 0;
  let annualGasM3Savings: number | null = null;
  let annualNetElectricityChangeKwh: number | null = null;

  const coolingElectricityKwh = hvacElectricityPoolKwh * COOLING_SHARE_OF_HVAC_ELECTRIC;
  const heatingElectricityKwh = hvacElectricityPoolKwh * HEATING_SHARE_OF_HVAC_ELECTRIC;

  switch (primary) {
    case "HE-01": {
      // Gas → Condensing Gas (efficiency only)
      if (hvacGasPoolM3 !== null) {
        annualGasM3Savings = hvacGasPoolM3 * GAS_SAVINGS_PCT_HE01;
      }
      break;
    }

    case "HE-02": {
      // Gas → ASHP (fuel switching + combined)
      if (hvacGasPoolM3 !== null) {
        gasDisplacedM3 = hvacGasPoolM3;
        const gasEnergyKwh = gasDisplacedM3 * GAS_KWH_PER_M3;
        const usefulHeatKwh = gasEnergyKwh * EXISTING_FURNACE_EFFICIENCY;
        heatingElectricityAddedKwh = usefulHeatKwh / SEASONAL_COP_ASHP;
        // Combined pathway cooling
        coolingKwhSavings = coolingElectricityKwh * COOLING_SAVINGS_PCT;
        annualNetElectricityChangeKwh = coolingKwhSavings - heatingElectricityAddedKwh;
      }
      break;
    }

    case "HE-03": {
      // Gas → GSHP (fuel switching + combined, higher COP)
      if (hvacGasPoolM3 !== null) {
        gasDisplacedM3 = hvacGasPoolM3;
        const gasEnergyKwh = gasDisplacedM3 * GAS_KWH_PER_M3;
        const usefulHeatKwh = gasEnergyKwh * EXISTING_FURNACE_EFFICIENCY;
        heatingElectricityAddedKwh = usefulHeatKwh / SEASONAL_COP_GSHP;
        coolingKwhSavings = coolingElectricityKwh * COOLING_SAVINGS_PCT;
        annualNetElectricityChangeKwh = coolingKwhSavings - heatingElectricityAddedKwh;
      }
      break;
    }

    case "HE-04": {
      // Oil → ASHP (fuel switching + combined)
      if (hvacOilPoolLitres !== null) {
        oilDisplacedLitres = hvacOilPoolLitres;
        const oilEnergyKwh = oilDisplacedLitres * OIL_KWH_PER_LITRE;
        const usefulHeatKwh = oilEnergyKwh * OIL_FURNACE_EFFICIENCY;
        heatingElectricityAddedKwh = usefulHeatKwh / SEASONAL_COP_ASHP;
        coolingKwhSavings = coolingElectricityKwh * COOLING_SAVINGS_PCT;
        annualNetElectricityChangeKwh = coolingKwhSavings - heatingElectricityAddedKwh;
      }
      break;
    }

    case "HE-05": {
      // Propane → ASHP (fuel switching + combined)
      if (hvacPropanePoolLitres !== null) {
        propaneDisplacedLitres = hvacPropanePoolLitres;
        const propaneEnergyKwh = propaneDisplacedLitres * PROPANE_KWH_PER_LITRE;
        const usefulHeatKwh = propaneEnergyKwh * PROPANE_FURNACE_EFFICIENCY;
        heatingElectricityAddedKwh = usefulHeatKwh / SEASONAL_COP_ASHP;
        coolingKwhSavings = coolingElectricityKwh * COOLING_SAVINGS_PCT;
        annualNetElectricityChangeKwh = coolingKwhSavings - heatingElectricityAddedKwh;
      }
      break;
    }

    case "HE-06": {
      // Electric Resistance → Heat Pump
      annualKwhSavings = heatingElectricityKwh * (1 - 1 / SEASONAL_COP_ASHP);
      break;
    }

    case "HE-07": {
      // Old RTU → High-Efficiency RTU (cooling only)
      coolingKwhSavings = coolingElectricityKwh * COOLING_SAVINGS_PCT;
      annualKwhSavings = coolingKwhSavings;
      break;
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Calculate Annual Dollar Savings (Energy)
  // -----------------------------------------------------------------------

  const rateResult = input.rateResult;
  const electricityRate = rateResult?.effectiveRateEnergy ?? FALLBACK_ELECTRICITY_RATE;
  const rateClassUsed = rateResult?.rateClass ?? "unknown";

  const effectiveGasRate = deriveGasRate(input);
  const effectiveOilRate = input.annualOilCost !== null && input.annualOilLitres !== null && input.annualOilLitres > 0
    ? input.annualOilCost / input.annualOilLitres
    : OIL_RATE_DEFAULT;
  const effectivePropaneRate = input.annualPropaneCost !== null && input.annualPropaneLitres !== null && input.annualPropaneLitres > 0
    ? input.annualPropaneCost / input.annualPropaneLitres
    : PROPANE_RATE_DEFAULT;

  let dollarSavingsGas: number | null = null;
  let dollarCostElectricityAdded: number | null = null;
  let dollarSavingsCooling: number | null = null;
  let dollarSavingsNet = 0;

  const scenario = getHvacScenarioInfo(primary);

  if (scenario.isGasEfficiency) {
    // HE-01
    if (annualGasM3Savings !== null) {
      dollarSavingsGas = annualGasM3Savings * effectiveGasRate;
      dollarSavingsNet = dollarSavingsGas;
    }
  } else if (scenario.isFuelSwitching) {
    // HE-02, HE-03, HE-04, HE-05 (with combined pathway)
    if (gasDisplacedM3 !== null) {
      dollarSavingsGas = gasDisplacedM3 * effectiveGasRate;
    } else if (oilDisplacedLitres !== null) {
      dollarSavingsGas = oilDisplacedLitres * effectiveOilRate;
    } else if (propaneDisplacedLitres !== null) {
      dollarSavingsGas = propaneDisplacedLitres * effectivePropaneRate;
    }
    if (heatingElectricityAddedKwh !== null) {
      dollarCostElectricityAdded = heatingElectricityAddedKwh * electricityRate;
    }
    if (coolingKwhSavings !== null) {
      dollarSavingsCooling = coolingKwhSavings * electricityRate;
    }
    dollarSavingsNet =
      (dollarSavingsGas ?? 0) -
      (dollarCostElectricityAdded ?? 0) +
      (dollarSavingsCooling ?? 0);
  } else {
    // HE-06, HE-07 (electricity-only efficiency)
    dollarSavingsNet = annualKwhSavings * electricityRate;
  }

  // -----------------------------------------------------------------------
  // Step 5: Demand Charge Savings (cooling efficiency only, Class B+)
  // -----------------------------------------------------------------------

  let coolingKwReduction: number | null = null;
  let demandSavingsAnnual = 0;
  const demandChargeRate = rateResult?.demandChargeRate ?? null;

  // Demand savings: cooling component of HE-06, HE-07, or combined pathway cooling
  const eligibleCoolingKwhForDemand =
    primary === "HE-07"
      ? coolingKwhSavings
      : primary === "HE-06"
        ? coolingElectricityKwh * COOLING_SAVINGS_PCT // HE-06 also improves cooling if combined
        : scenario.hasCombinedPathway
          ? coolingKwhSavings
          : null;

  if (
    rateResult?.demandChargeApplicable &&
    demandChargeRate &&
    eligibleCoolingKwhForDemand !== null &&
    eligibleCoolingKwhForDemand > 0
  ) {
    coolingKwReduction = eligibleCoolingKwhForDemand / (TYPICAL_COOLING_HOURS * COOLING_DIVERSITY_FACTOR);
    demandSavingsAnnual = coolingKwReduction * demandChargeRate * 12;
  }

  if (scenario.isFuelSwitching) {
    flags.push({
      type: "info",
      message:
        "Switching to electric heating may affect peak demand charges. A Tier 3 analysis can model the seasonal demand impact.",
    });
  }

  const annualTotalSavings = dollarSavingsNet + demandSavingsAnnual;

  // -----------------------------------------------------------------------
  // Step 6: Implementation Cost
  // -----------------------------------------------------------------------

  const sizeCategory = getSizeCategory(input.buildingSizeSqft);
  const costConfig = getHvacCostConfig(primary, sizeCategory);

  const projectCostMidpoint = Math.max(
    input.buildingSizeSqft * costConfig.costPerSqftMidpoint,
    costConfig.minimumCostFloor
  );
  const projectCostUpper = Math.max(
    input.buildingSizeSqft * costConfig.costPerSqftUpper,
    costConfig.minimumCostFloor
  );

  // Incremental cost framing for end-of-life equipment
  let incrementalCost: number | null = null;
  if (
    scenario.isFuelSwitching &&
    (input.hvacAge === "10_to_20" || input.hvacAge === "over_20")
  ) {
    const baselineSizeCategory = getSizeCategory(input.buildingSizeSqft);
    const baselineCost = getHvacCostConfig("HE-01", baselineSizeCategory);
    const baselineReplacement = Math.max(
      input.buildingSizeSqft * baselineCost.costPerSqftMidpoint,
      baselineCost.minimumCostFloor
    );
    incrementalCost = projectCostMidpoint - baselineReplacement;
  }

  // -----------------------------------------------------------------------
  // Step 7: Incentive Estimation
  // -----------------------------------------------------------------------

  // 7a. SaveOnEnergy (electricity-saving component)
  let incentiveSoe = 0;
  let soeEligibleKwh = 0;
  let soeEligibleKw = 0;

  if (primary === "HE-06") {
    soeEligibleKwh = annualKwhSavings;
    if (coolingKwReduction !== null) soeEligibleKw = coolingKwReduction;
  } else if (primary === "HE-07") {
    soeEligibleKwh = annualKwhSavings;
    if (coolingKwReduction !== null) soeEligibleKw = coolingKwReduction;
  } else if (scenario.hasCombinedPathway && coolingKwhSavings !== null) {
    // Fuel switching: only cooling component qualifies
    soeEligibleKwh = coolingKwhSavings;
    if (coolingKwReduction !== null) soeEligibleKw = coolingKwReduction;
  }

  if (soeEligibleKwh > 0 || soeEligibleKw > 0) {
    const soeFromKwh = soeEligibleKwh * SOE_CUSTOM_RATE_KWH;
    const soeFromKw = soeEligibleKw * SOE_CUSTOM_RATE_KW;
    incentiveSoe = Math.max(soeFromKwh, soeFromKw);
    incentiveSoe = Math.min(incentiveSoe, projectCostMidpoint * SOE_CAP_PCT);
  }

  // 7b. Enbridge Gas Programs (gas-saving measures)
  let incentiveEnbridge = 0;
  const gasM3ForEnbridge = scenario.isFuelSwitching
    ? (gasDisplacedM3 ?? 0)
    : scenario.isGasEfficiency
      ? (annualGasM3Savings ?? 0)
      : 0;

  if (gasM3ForEnbridge > 0 && (input.fuelSource === "natural_gas")) {
    incentiveEnbridge = gasM3ForEnbridge * ENBRIDGE_CUSTOM_RATE_STANDARD;
    incentiveEnbridge = Math.min(incentiveEnbridge, projectCostMidpoint * ENBRIDGE_CAP_PCT);
    incentiveEnbridge = Math.min(incentiveEnbridge, ENBRIDGE_MAX_PER_PROJECT);
  }

  // 7c. CT ITC (heat pump installations: HE-02, HE-03, HE-04, HE-05, HE-06)
  let incentiveCtItc = 0;
  const ctItcEligible = ["HE-02", "HE-03", "HE-04", "HE-05", "HE-06"].includes(primary);
  if (ctItcEligible) {
    incentiveCtItc = projectCostMidpoint * CT_ITC_RATE;
    flags.push({
      type: "info",
      message:
        "Incorporated businesses may qualify for an additional 30% federal tax credit on heat pump equipment costs — consult your tax advisor.",
    });
  }

  // 7d. OHPA (oil buildings only: HE-04)
  let incentiveOhpa = 0;
  if (primary === "HE-04") {
    incentiveOhpa = OHPA_FLAT_AMOUNT;
    flags.push({
      type: "info",
      message: "Potentially eligible for NRCan Oil-to-Heat-Pump Affordability Program — confirm with program guidelines.",
    });
  }

  // 7e. Total incentive tiers
  // Conservative (most certain)
  const incentiveLow =
    input.fuelSource === "natural_gas" && (scenario.isGasEfficiency || scenario.isFuelSwitching)
      ? incentiveEnbridge
      : incentiveSoe > 0
        ? Math.min(incentiveSoe, soeEligibleKwh * SOE_CUSTOM_RATE_KWH) // energy-based (more certain)
        : 0;

  // Optimistic (all stacked)
  const incentiveHigh = incentiveSoe + incentiveEnbridge + incentiveCtItc + incentiveOhpa;

  // -----------------------------------------------------------------------
  // Step 8: Net Cost and Simple Payback
  // -----------------------------------------------------------------------

  const netCostMidpoint = Math.max(0, projectCostMidpoint - incentiveLow);
  const netCostUpper = Math.max(0, projectCostUpper - incentiveLow);

  let paybackMidpoint: number | null = null;
  let paybackUpper: number | null = null;

  if (annualTotalSavings > 0) {
    paybackMidpoint = netCostMidpoint / annualTotalSavings;
    paybackUpper = netCostUpper / annualTotalSavings;
  }

  if (annualTotalSavings <= 0) {
    flags.push({
      type: "warning",
      message:
        "This measure may not produce immediate cost savings at current rates. The case for this upgrade is primarily environmental.",
    });
  }

  if (paybackMidpoint !== null && paybackMidpoint > HIGH_PAYBACK_THRESHOLD_YEARS) {
    flags.push({
      type: "warning",
      message:
        "Payback exceeds 25 years — this measure may not be cost-effective at current rates. Consider a Tier 3 analysis.",
    });
  }

  // -----------------------------------------------------------------------
  // Step 9: NPV with Three Escalation Scenarios
  // -----------------------------------------------------------------------

  let npvConservative: number;
  let npvBase: number;
  let npvHigh: number;

  if (scenario.isFuelSwitching) {
    // Dual-fuel NPV
    npvConservative = calculateDualFuelNpv(
      netCostMidpoint,
      dollarSavingsGas ?? 0,
      dollarCostElectricityAdded ?? 0,
      dollarSavingsCooling ?? 0,
      demandSavingsAnnual,
      GAS_ESCALATION_CONSERVATIVE,
      RATE_ESCALATION_CONSERVATIVE
    );
    npvBase = calculateDualFuelNpv(
      netCostMidpoint,
      dollarSavingsGas ?? 0,
      dollarCostElectricityAdded ?? 0,
      dollarSavingsCooling ?? 0,
      demandSavingsAnnual,
      GAS_ESCALATION_BASE,
      RATE_ESCALATION_BASE
    );
    npvHigh = calculateDualFuelNpv(
      netCostMidpoint,
      dollarSavingsGas ?? 0,
      dollarCostElectricityAdded ?? 0,
      dollarSavingsCooling ?? 0,
      demandSavingsAnnual,
      GAS_ESCALATION_HIGH,
      RATE_ESCALATION_HIGH
    );
  } else {
    // Single-fuel NPV (same as LED)
    npvConservative = calculateSingleFuelNpv(netCostMidpoint, annualTotalSavings, RATE_ESCALATION_CONSERVATIVE);
    npvBase = calculateSingleFuelNpv(netCostMidpoint, annualTotalSavings, RATE_ESCALATION_BASE);
    npvHigh = calculateSingleFuelNpv(netCostMidpoint, annualTotalSavings, RATE_ESCALATION_HIGH);
  }

  // -----------------------------------------------------------------------
  // Step 10: CO₂ Reduction
  // -----------------------------------------------------------------------

  let co2AvoidedScope1: number | null = null;
  let co2AddedScope2: number | null = null;
  let co2NetReduction = 0;
  let co2ReductionPct: number | null = null;

  if (scenario.isGasEfficiency && annualGasM3Savings !== null) {
    // HE-01: gas savings only
    co2NetReduction = (annualGasM3Savings * 1932) / 1_000_000;
  } else if (scenario.isFuelSwitching) {
    // HE-02 through HE-05: fuel displacement + grid addition
    // Emission factors in gCO₂eq per unit → divide by 1,000,000 for tonnes
    if (gasDisplacedM3 !== null) {
      co2AvoidedScope1 = (gasDisplacedM3 * 1932) / 1_000_000;
    } else if (oilDisplacedLitres !== null) {
      co2AvoidedScope1 = (oilDisplacedLitres * 2763) / 1_000_000;
    } else if (propaneDisplacedLitres !== null) {
      co2AvoidedScope1 = (propaneDisplacedLitres * 1548) / 1_000_000;
    }

    // Scope 2: net electricity change (HP added - cooling saved)
    const netElecAddedKwh = (heatingElectricityAddedKwh ?? 0) - (coolingKwhSavings ?? 0);
    co2AddedScope2 = (netElecAddedKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;

    co2NetReduction = (co2AvoidedScope1 ?? 0) - (co2AddedScope2 ?? 0);

    if (co2AvoidedScope1 !== null && co2AvoidedScope1 > 0) {
      co2ReductionPct = (co2NetReduction / co2AvoidedScope1) * 100;
    }
  } else {
    // HE-06, HE-07: electricity savings only
    co2NetReduction = (annualKwhSavings * SCOPE2_AVERAGE_FACTOR) / 1_000_000;
  }

  // -----------------------------------------------------------------------
  // Alternative scenario (HE-01 for gas buildings)
  // -----------------------------------------------------------------------

  let alternativeResult: HvacAlternativeResult | null = null;
  if (alternative !== null && hvacGasPoolM3 !== null) {
    alternativeResult = calculateAlternative(
      alternative,
      hvacGasPoolM3,
      effectiveGasRate,
      input.buildingSizeSqft
    );
  }

  // -----------------------------------------------------------------------
  // Confidence and flags
  // -----------------------------------------------------------------------

  const confidence = determineConfidence(input, gasPoolEstimated);
  const confidenceNote = getConfidenceNote(confidence);

  // Edge case flags
  if (buildingConfig.hvacMeasureNote) {
    flags.push({ type: "info", message: buildingConfig.hvacMeasureNote });
  }

  if (input.hvacAge === "under_5") {
    flags.push({
      type: "info",
      message: "Your HVAC is relatively new. This shows savings at end-of-life.",
    });
  }

  if (input.fuelSource === "electric_only" && (input.hvacAge === "over_20" || input.hvacAge === "10_to_20")) {
    flags.push({
      type: "info",
      message: "Strong candidate for heat pump conversion. Clear economics, no fuel switching complexity.",
    });
  }

  if (input.buildingSizeSqft < SMALL_BUILDING_THRESHOLD_SQFT) {
    flags.push({
      type: "info",
      message: "HVAC projects have minimum fixed costs that reduce cost-effectiveness in smaller buildings.",
    });
  }

  if (input.fuelSource === "other") {
    flags.push({
      type: "warning",
      message: "Unknown fuel source — cooling upgrade only. Recommend Tier 3 analysis for heating assessment.",
    });
  }

  if (input.buildingTypeId === "data_center") {
    flags.push({
      type: "info",
      message: "Data center HVAC is cooling-dominated. Consider specialized Tier 3 cooling analysis.",
    });
  }

  // Determine the seasonal COP used
  const seasonalCopUsed = primary === "HE-03" ? SEASONAL_COP_GSHP : SEASONAL_COP_ASHP;

  return {
    measureApplicable: true,
    scenarioPrimary: primary,
    scenarioPrimaryName: getScenarioDisplayName(primary),
    scenarioAlternative: alternative,
    dataPath,
    hvacElectricityPoolKwh: round(hvacElectricityPoolKwh, 0),
    hvacGasPoolM3: hvacGasPoolM3 !== null ? round(hvacGasPoolM3, 0) : null,
    hvacOilPoolLitres: hvacOilPoolLitres !== null ? round(hvacOilPoolLitres, 0) : null,
    hvacPropanePoolLitres: hvacPropanePoolLitres !== null ? round(hvacPropanePoolLitres, 0) : null,
    gasPoolEstimated,
    heatingElectricityAddedKwh: heatingElectricityAddedKwh !== null ? round(heatingElectricityAddedKwh, 0) : null,
    coolingKwhSavings: coolingKwhSavings !== null ? round(coolingKwhSavings, 0) : null,
    gasDisplacedM3: gasDisplacedM3 !== null ? round(gasDisplacedM3, 0) : null,
    oilDisplacedLitres: oilDisplacedLitres !== null ? round(oilDisplacedLitres, 0) : null,
    propaneDisplacedLitres: propaneDisplacedLitres !== null ? round(propaneDisplacedLitres, 0) : null,
    annualKwhSavings: round(annualKwhSavings, 0),
    annualGasM3Savings: annualGasM3Savings !== null ? round(annualGasM3Savings, 0) : null,
    annualNetElectricityChangeKwh: annualNetElectricityChangeKwh !== null ? round(annualNetElectricityChangeKwh, 0) : null,
    dollarSavingsGas: dollarSavingsGas !== null ? round(dollarSavingsGas, 0) : null,
    dollarCostElectricityAdded: dollarCostElectricityAdded !== null ? round(dollarCostElectricityAdded, 0) : null,
    dollarSavingsCooling: dollarSavingsCooling !== null ? round(dollarSavingsCooling, 0) : null,
    dollarSavingsNet: round(dollarSavingsNet, 0),
    coolingKwReduction: coolingKwReduction !== null ? round(coolingKwReduction, 1) : null,
    demandSavingsAnnual: round(demandSavingsAnnual, 0),
    annualTotalSavings: round(annualTotalSavings, 0),
    projectCostMidpoint: round(projectCostMidpoint, 0),
    projectCostUpper: round(projectCostUpper, 0),
    incrementalCost: incrementalCost !== null ? round(incrementalCost, 0) : null,
    incentiveSoe: round(incentiveSoe, 0),
    incentiveEnbridge: round(incentiveEnbridge, 0),
    incentiveCtItc: round(incentiveCtItc, 0),
    incentiveOhpa: round(incentiveOhpa, 0),
    incentiveLow: round(incentiveLow, 0),
    incentiveHigh: round(incentiveHigh, 0),
    netCostMidpoint: round(netCostMidpoint, 0),
    netCostUpper: round(netCostUpper, 0),
    paybackMidpoint: paybackMidpoint !== null ? round(paybackMidpoint, 1) : null,
    paybackUpper: paybackUpper !== null ? round(paybackUpper, 1) : null,
    npvConservative: round(npvConservative, 0),
    npvBase: round(npvBase, 0),
    npvHigh: round(npvHigh, 0),
    co2AvoidedScope1: co2AvoidedScope1 !== null ? round(co2AvoidedScope1, 1) : null,
    co2AddedScope2: co2AddedScope2 !== null ? round(co2AddedScope2, 1) : null,
    co2NetReduction: round(co2NetReduction, 1),
    co2ReductionPct: co2ReductionPct !== null ? round(co2ReductionPct, 0) : null,
    alternativeResult,
    electricityRateUsed: electricityRate,
    demandChargeRateUsed: demandChargeRate,
    rateClassUsed,
    seasonalCopUsed,
    existingEfficiencyUsed: EXISTING_FURNACE_EFFICIENCY,
    effectiveGasRateUsed: input.fuelSource === "natural_gas" ? effectiveGasRate : null,
    effectiveOilRateUsed: input.fuelSource === "oil" ? effectiveOilRate : null,
    effectivePropaneRateUsed: input.fuelSource === "propane" ? effectivePropaneRate : null,
    costBasis: "$/sqft by scenario and building size",
    confidence,
    confidenceNote,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Pathway Selection
// ---------------------------------------------------------------------------

function selectScenario(input: HvacCalculationInput): {
  primary: HvacScenarioId;
  alternative: HvacScenarioId | null;
} {
  switch (input.fuelSource) {
    case "electric_only":
      if (input.hvacAge === "over_20" || input.hvacAge === "10_to_20") {
        return { primary: "HE-06", alternative: null };
      }
      return { primary: "HE-07", alternative: null };

    case "oil":
      return { primary: "HE-04", alternative: null };

    case "propane":
      return { primary: "HE-05", alternative: null };

    case "natural_gas":
      return { primary: "HE-02", alternative: "HE-01" };

    case "other":
    default:
      return { primary: "HE-07", alternative: null };
  }
}

// ---------------------------------------------------------------------------
// Gas Rate Derivation
// ---------------------------------------------------------------------------

function deriveGasRate(input: HvacCalculationInput): number {
  if (input.annualGasCost !== null && input.annualGasM3 !== null && input.annualGasM3 > 0) {
    return input.annualGasCost / input.annualGasM3;
  }
  if (input.annualGasCost !== null && input.annualGasCost > 0) {
    // Back-solve m³ from $ not needed for rate — but we can back-solve rate
    return GAS_RATE_BACKSOLVE;
  }
  return GAS_RATE_DEFAULT;
}

// ---------------------------------------------------------------------------
// Gas Estimation Fallback
// ---------------------------------------------------------------------------

function estimateGasFromEui(
  input: HvacCalculationInput,
  buildingConfig: ReturnType<typeof getHvacBuildingConfig>
): number | null {
  const btConfig = getBuildingTypeConfig(input.buildingTypeId);

  if (btConfig.benchmarkEuiKwhSqft === null) return null;

  const euiTotal = btConfig.benchmarkEuiKwhSqft;
  const electricityFraction = btConfig.electricityFraction;

  const estimatedGasEnergyKwh = input.buildingSizeSqft * euiTotal * (1 - electricityFraction);
  const estimatedGasM3 = estimatedGasEnergyKwh / GAS_KWH_PER_M3;
  return estimatedGasM3 * buildingConfig.hvacGasPct;
}

// ---------------------------------------------------------------------------
// NPV Calculations
// ---------------------------------------------------------------------------

/**
 * Single-fuel NPV (electricity-only measures, same as LED)
 */
function calculateSingleFuelNpv(
  netCost: number,
  annualSavings: number,
  rateEscalation: number
): number {
  let pvSavings = 0;
  for (let year = 1; year <= NPV_ANALYSIS_PERIOD_YEARS; year++) {
    const escalated = annualSavings * Math.pow(1 + rateEscalation, year);
    pvSavings += escalated / Math.pow(1 + NPV_DISCOUNT_RATE, year);
  }
  return pvSavings - netCost;
}

/**
 * Dual-fuel NPV (fuel switching — separate gas and electricity escalation)
 */
function calculateDualFuelNpv(
  netCost: number,
  gasSavingsAnnual: number,
  elecCostAnnual: number,
  coolingSavingsAnnual: number,
  demandSavingsAnnual: number,
  gasEscalation: number,
  elecEscalation: number
): number {
  let pvSavings = 0;
  for (let year = 1; year <= NPV_ANALYSIS_PERIOD_YEARS; year++) {
    const gasT = gasSavingsAnnual * Math.pow(1 + gasEscalation, year);
    const elecCostT = elecCostAnnual * Math.pow(1 + elecEscalation, year);
    const coolingT = coolingSavingsAnnual * Math.pow(1 + elecEscalation, year);
    const demandT = demandSavingsAnnual * Math.pow(1 + elecEscalation, year);
    const netT = gasT - elecCostT + coolingT + demandT;
    pvSavings += netT / Math.pow(1 + NPV_DISCOUNT_RATE, year);
  }
  return pvSavings - netCost;
}

// ---------------------------------------------------------------------------
// Alternative Scenario Calculator (HE-01 for gas buildings)
// ---------------------------------------------------------------------------

function calculateAlternative(
  scenarioId: HvacScenarioId,
  hvacGasPoolM3: number,
  gasRate: number,
  buildingSizeSqft: number
): HvacAlternativeResult {
  const gasSaved = hvacGasPoolM3 * GAS_SAVINGS_PCT_HE01;
  const dollarSavings = gasSaved * gasRate;
  const co2 = (gasSaved * 1932) / 1_000_000;

  const sizeCategory = getSizeCategory(buildingSizeSqft);
  const costConfig = getHvacCostConfig("HE-01", sizeCategory);
  const projectCost = Math.max(
    buildingSizeSqft * costConfig.costPerSqftMidpoint,
    costConfig.minimumCostFloor
  );

  const enbridge = Math.min(
    gasSaved * ENBRIDGE_CUSTOM_RATE_STANDARD,
    projectCost * ENBRIDGE_CAP_PCT,
    ENBRIDGE_MAX_PER_PROJECT
  );

  const netCost = Math.max(0, projectCost - enbridge);
  const payback = dollarSavings > 0 ? netCost / dollarSavings : null;

  return {
    scenarioId,
    scenarioName: "High-Efficiency Condensing Gas",
    annualGasSavingsM3: round(gasSaved, 0),
    annualDollarSavings: round(dollarSavings, 0),
    co2ReductionTonnes: round(co2, 1),
    projectCostMidpoint: round(projectCost, 0),
    incentiveEnbridge: round(enbridge, 0),
    netCost: round(netCost, 0),
    payback: payback !== null ? round(payback, 1) : null,
  };
}

// ---------------------------------------------------------------------------
// Confidence Level
// ---------------------------------------------------------------------------

function determineConfidence(
  input: HvacCalculationInput,
  gasPoolEstimated: boolean
): HvacConfidence {
  // RED conditions
  if (input.benchmarkClassification === "red") return "red";
  if (input.fuelSource === "other") return "red";
  if (gasPoolEstimated && input.benchmarkClassification === "yellow") return "red";

  // YELLOW conditions
  if (input.completionPath !== "enhanced") return "yellow";
  if (gasPoolEstimated) return "yellow";
  if (input.benchmarkClassification === "yellow") return "yellow";
  if (input.hvacAge === "5_to_10") return "yellow";

  // GREEN: all checks pass
  return "green";
}

function getConfidenceNote(confidence: HvacConfidence): string {
  switch (confidence) {
    case "green":
      return "Based on your specific energy data and building characteristics";
    case "yellow":
      return "Uses typical values for your building type. Actual savings may differ.";
    case "red":
      return "Rough screening estimate — recommend Tier 3 analysis for detailed assessment.";
  }
}

// ---------------------------------------------------------------------------
// Scenario Helpers
// ---------------------------------------------------------------------------

function getHvacScenarioInfo(scenarioId: HvacScenarioId) {
  const scenarios: Record<HvacScenarioId, { isFuelSwitching: boolean; hasCombinedPathway: boolean; isGasEfficiency: boolean }> = {
    "HE-01": { isFuelSwitching: false, hasCombinedPathway: false, isGasEfficiency: true },
    "HE-02": { isFuelSwitching: true, hasCombinedPathway: true, isGasEfficiency: false },
    "HE-03": { isFuelSwitching: true, hasCombinedPathway: true, isGasEfficiency: false },
    "HE-04": { isFuelSwitching: true, hasCombinedPathway: true, isGasEfficiency: false },
    "HE-05": { isFuelSwitching: true, hasCombinedPathway: true, isGasEfficiency: false },
    "HE-06": { isFuelSwitching: false, hasCombinedPathway: false, isGasEfficiency: false },
    "HE-07": { isFuelSwitching: false, hasCombinedPathway: false, isGasEfficiency: false },
  };
  return scenarios[scenarioId];
}

function getScenarioDisplayName(scenarioId: HvacScenarioId): string {
  const names: Record<HvacScenarioId, string> = {
    "HE-01": "High-Efficiency Condensing Gas",
    "HE-02": "Heat Pump Conversion",
    "HE-03": "Ground-Source Heat Pump",
    "HE-04": "Oil to Heat Pump",
    "HE-05": "Propane to Heat Pump",
    "HE-06": "Electric Heat Pump Upgrade",
    "HE-07": "Cooling Efficiency Upgrade",
  };
  return names[scenarioId];
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
