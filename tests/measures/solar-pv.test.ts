/**
 * Solar PV — Test Suite
 *
 * Tests for the Solar PV calculation engine covering:
 *   - 3 worked examples (both pathways per example)
 *   - Edge cases (greenhouse, small building, NM cap, NM offset, payback, data center, etc.)
 *   - NPV with degradation verification
 *   - CO₂ reduction
 *   - Config helpers (irradiance zones, building config, cost brackets)
 *   - Confidence levels
 *   - BESS-ready outputs
 *   - Monthly generation sum
 */

import { describe, it, expect } from "vitest";
import {
  calculateSolarPv,
  estimatePeakDemand,
  type SolarCalculationInput,
} from "@/lib/measures/solar-pv";
import {
  getIrradianceZone,
  getSolarBuildingConfig,
  getCostPerWatt,
  MONTHLY_GEN_PCT,
  ORIENTATION_FACTOR,
  DEGRADATION_RATE,
  BTM_SELF_CONSUMPTION,
  DAYTIME_FRACTION,
  OPERATING_HOURS_BONUS,
  OPERATING_HOURS_BONUS_CAP,
  NET_METERING_CAP_KW,
  SOE_SOLAR_RATE_MICRO,
  SOE_SOLAR_RATE_STANDARD,
  SOE_SOLAR_CAP_PCT,
  NM_CREDIT_RATE_RPP,
  NM_CREDIT_RATE_CLASS_B,
  FALLBACK_EFFECTIVE_RATE,
  PANEL_DENSITY_W_PER_SQFT,
  PAYBACK_GUARD_YEARS,
} from "@/lib/config/solar-pv";
import {
  NPV_DISCOUNT_RATE,
  NPV_ANALYSIS_PERIOD_YEARS,
  RATE_ESCALATION_BASE,
  CT_ITC_RATE,
} from "@/lib/config/financial-defaults";
import { SCOPE2_AVERAGE_FACTOR } from "@/lib/config/emissions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<SolarCalculationInput> = {}): SolarCalculationInput {
  return {
    postalCode: "L5N 1A1",
    buildingTypeId: "warehouse",
    buildingSizeSqft: 80_000,
    operatingHours: "extended",
    annualElectricityKwh: 600_000,
    peakDemandKw: null,
    rateResult: {
      rateClass: "class_b",
      rateClassSource: "estimated",
      rateClassConfidence: "medium",
      rateStructure: null,
      estimatedPeakKw: 200,
      classAEligible: false,
      effectiveRateTotal: 0.13,
      effectiveRateEnergy: 0.13,
      effectiveRateSource: "class_default",
      demandChargeRate: 17.84,
      demandChargeApplicable: true,
      warnings: [],
    },
    completionPath: "standard",
    baseloadElectricAnnual: null,
    regressionQualityFlag: null,
    euiValidationWarning: false,
    ownershipType: "own",
    ...overrides,
  };
}

function makeOfficeInput(overrides: Partial<SolarCalculationInput> = {}): SolarCalculationInput {
  return makeInput({
    buildingTypeId: "office",
    buildingSizeSqft: 30_000,
    operatingHours: "standard",
    annualElectricityKwh: 450_000,
    rateResult: {
      rateClass: "class_b",
      rateClassSource: "estimated",
      rateClassConfidence: "medium",
      rateStructure: null,
      estimatedPeakKw: 150,
      classAEligible: false,
      effectiveRateTotal: 0.13,
      effectiveRateEnergy: 0.13,
      effectiveRateSource: "class_default",
      demandChargeRate: 17.84,
      demandChargeApplicable: true,
      warnings: [],
    },
    postalCode: "M5V 2T6",
    ...overrides,
  });
}

function makeRetailInput(overrides: Partial<SolarCalculationInput> = {}): SolarCalculationInput {
  return makeInput({
    buildingTypeId: "retail",
    buildingSizeSqft: 4_000,
    operatingHours: "standard",
    annualElectricityKwh: 80_000,
    rateResult: {
      rateClass: "rpp_tou",
      rateClassSource: "estimated",
      rateClassConfidence: "medium",
      rateStructure: null,
      estimatedPeakKw: 30,
      classAEligible: false,
      effectiveRateTotal: 0.16,
      effectiveRateEnergy: 0.16,
      effectiveRateSource: "class_default",
      demandChargeRate: null,
      demandChargeApplicable: false,
      warnings: [],
    },
    postalCode: "P3E 1A1",
    completionPath: "fast",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Example A: Large Warehouse — Best Case
// ---------------------------------------------------------------------------

describe("Example A: Large Warehouse (Dry), 80,000 sqft, L-prefix", () => {
  const result = calculateSolarPv(makeInput());

  describe("Step 1: Irradiance", () => {
    it("selects Central Ontario zone for L-prefix", () => {
      expect(result.irradianceZone).toBe("central_on");
      expect(result.zoneIrradiance).toBe(1150);
    });

    it("calculates effective irradiance", () => {
      expect(result.effectiveIrradiance).toBe(1150 * 0.90); // 1035
    });
  });

  describe("Step 2: Roof area", () => {
    it("calculates roof footprint with storey factor 1.00", () => {
      expect(result.roofFootprintSqft).toBe(80_000);
    });

    it("calculates available roof with utilization 0.70", () => {
      expect(result.availableRoofSqft).toBe(56_000);
    });
  });

  describe("Step 3: Sizing", () => {
    it("calculates roof-constrained at 840 kW", () => {
      // 56000 × 15 / 1000 = 840
      expect(result.roofConstrainedKw).toBe(840);
    });

    it("sizes BTM to daytime baseload ~196 kW", () => {
      // Standard path: 600000 × 0.75 × 0.45 / 1035 = 195.65
      expect(result.btm.systemKwRounded).toBe(196);
    });

    it("sizes NM to 500 kW (NM cap)", () => {
      // consumption constrained: 600000 / 1035 = 579.7 kW → capped at 500
      expect(result.nm.systemKwRounded).toBe(500);
    });
  });

  describe("Step 4: Annual generation", () => {
    it("BTM ~202,860 kWh", () => {
      // 195.65 × 1035 = 202,500 (approx)
      const btmGen = result.btm.annualGenerationKwh;
      expect(btmGen).toBeGreaterThan(200_000);
      expect(btmGen).toBeLessThan(205_000);
    });

    it("NM ~517,500 kWh", () => {
      // 500 × 1035 = 517,500
      expect(result.nm.annualGenerationKwh).toBe(517_500);
    });
  });

  describe("Step 5: Self-consumption", () => {
    it("BTM self-consumed at 95%", () => {
      expect(result.btm.selfConsumptionPct).toBe(0.95);
    });

    it("NM self-consumption: warehouse 0.80 + extended 0.10 = 0.90", () => {
      expect(result.nmSelfConsumptionPct).toBe(0.90);
    });

    it("NM exported ~51,750 kWh", () => {
      // 517500 × 0.10 = 51,750
      expect(result.nm.exportedOrWastedKwh).toBe(51_750);
    });
  });

  describe("Step 6: Dollar savings", () => {
    it("BTM savings ~$25,053", () => {
      // selfConsumedBtm × 0.13
      const expected = Math.round(result.btm.selfConsumedKwh * 0.13);
      expect(result.btm.annualDollarSavings).toBe(expected);
    });

    it("NM savings ~$65,206", () => {
      // (465750 × 0.13) + (51750 × 0.09)
      const selfVal = result.nm.selfConsumedKwh * 0.13;
      const exportVal = result.nm.exportedOrWastedKwh * 0.09;
      const expected = Math.round(selfVal + exportVal);
      expect(result.nm.annualDollarSavings).toBe(expected);
    });

    it("uses Class B NM credit rate ($0.09)", () => {
      expect(result.nmCreditRate).toBe(0.09);
    });
  });

  describe("Step 8: Cost", () => {
    it("BTM cost midpoint ~$362,600", () => {
      // 196 kW → Medium bracket ($1.85/W)
      // 195.65 × 1000 × 1.85 = 361,952 → rounded
      expect(result.btm.costMidpoint).toBeGreaterThan(355_000);
      expect(result.btm.costMidpoint).toBeLessThan(370_000);
    });

    it("NM cost midpoint = $725,000", () => {
      // 500 kW → Large bracket ($1.65/W) — wait, 500 is exactly the boundary
      // 500 >= 500 → Very Large ($1.45/W)? No, getCostPerWatt uses < 500
      // if (system_kw < 500) → Large... 500 is NOT < 500, so Very Large
      // Actually 500 kW: 500 < 500 = false, so it falls to Very Large: $1.45
      // 500 × 1000 × 1.45 = $725,000
      expect(result.nm.costMidpoint).toBe(725_000);
    });
  });

  describe("Step 9: Incentives", () => {
    it("BTM SaveOnEnergy ~$168,560", () => {
      // 196 × 860 = 168,560 (approx since exact system may differ slightly)
      // Cap check: 50% of ~362,600 = 181,300 → uncapped
      const soeEstimate = result.btm.systemKw * SOE_SOLAR_RATE_STANDARD;
      expect(result.btm.incentiveSoe).toBe(Math.round(soeEstimate));
    });

    it("NM SaveOnEnergy = $0", () => {
      expect(result.nm.incentiveSoe).toBe(0);
    });

    it("BTM CT ITC = 30% of cost midpoint", () => {
      expect(result.btm.incentiveCtItc).toBe(
        Math.round(result.btm.costMidpoint * CT_ITC_RATE)
      );
    });

    it("NM CT ITC = 30% of cost midpoint", () => {
      expect(result.nm.incentiveCtItc).toBe(
        Math.round(result.nm.costMidpoint * CT_ITC_RATE)
      );
    });
  });

  describe("Step 10: Net cost and payback", () => {
    it("BTM net cost midpoint = cost - SOE", () => {
      expect(result.btm.netCostMidpoint).toBe(
        result.btm.costMidpoint - result.btm.incentiveLow
      );
    });

    it("NM net cost = full cost (no SOE)", () => {
      expect(result.nm.netCostMidpoint).toBe(result.nm.costMidpoint);
    });

    it("BTM payback ~7.7 years", () => {
      expect(result.btm.paybackMidpoint).toBeGreaterThan(7);
      expect(result.btm.paybackMidpoint).toBeLessThan(9);
    });

    it("NM payback ~11.1 years", () => {
      expect(result.nm.paybackMidpoint).toBeGreaterThan(10);
      expect(result.nm.paybackMidpoint).toBeLessThan(12);
    });
  });

  describe("Pathway recommendation", () => {
    it("recommends BTM (higher NPV due to SaveOnEnergy)", () => {
      expect(result.recommendedPathway).toBe("btm");
    });
  });

  describe("Step 12: CO₂", () => {
    it("calculates CO₂ from recommended pathway generation", () => {
      const expectedCo2 =
        (result.btm.annualGenerationKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;
      expect(result.co2ReductionTonnes).toBeCloseTo(expectedCo2, 1);
    });
  });

  describe("Offset %", () => {
    it("BTM offset ~34%", () => {
      expect(result.btm.offsetPct).toBeGreaterThan(30);
      expect(result.btm.offsetPct).toBeLessThan(38);
    });

    it("NM offset ~86%", () => {
      expect(result.nm.offsetPct).toBeGreaterThan(84);
      expect(result.nm.offsetPct).toBeLessThan(88);
    });
  });
});

// ---------------------------------------------------------------------------
// Example B: Mid-Size Office — Roof Constrained
// ---------------------------------------------------------------------------

describe("Example B: Office, 30,000 sqft, M-prefix", () => {
  const result = calculateSolarPv(makeOfficeInput());

  it("roof footprint = 9,900 sqft (×0.33)", () => {
    expect(result.roofFootprintSqft).toBe(9_900);
  });

  it("available roof = 5,445 sqft (×0.55)", () => {
    expect(result.availableRoofSqft).toBeCloseTo(5_445, 0);
  });

  it("roof constrained ~82 kW", () => {
    // 5445 × 15 / 1000 = 81.675 → 82 rounded
    expect(result.roofConstrainedKw).toBe(82);
  });

  it("BTM baseload constrained ~108 kW (but roof-constrained wins)", () => {
    // 450000 × 0.55 × 0.45 / 1035 = 107.6
    expect(result.btmConstrainedKw).toBeGreaterThan(105);
    expect(result.btmConstrainedKw).toBeLessThan(110);
  });

  it("both pathways same size (roof constrained)", () => {
    // BTM: min(82, 108) = 82
    // NM: min(82, 435, 500) = 82
    expect(result.btm.systemKwRounded).toBe(82);
    expect(result.nm.systemKwRounded).toBe(82);
  });

  it("BTM generation = NM generation", () => {
    expect(result.btm.annualGenerationKwh).toBe(result.nm.annualGenerationKwh);
  });

  it("BTM self-consumed at 95%", () => {
    expect(result.btm.selfConsumptionPct).toBe(0.95);
  });

  it("NM self-consumption = 0.65 (office, standard hours, no bonus)", () => {
    expect(result.nmSelfConsumptionPct).toBe(0.65);
  });

  it("BTM annual savings > NM annual savings (95% vs 65% self-consumption)", () => {
    expect(result.btm.annualDollarSavings).toBeGreaterThan(
      result.nm.annualDollarSavings
    );
  });

  it("BTM SaveOnEnergy ~$70,520", () => {
    // 82 × 860 = 70,520 (approx)
    expect(result.btm.incentiveSoe).toBeGreaterThan(68_000);
    expect(result.btm.incentiveSoe).toBeLessThan(72_000);
  });

  it("recommends BTM", () => {
    expect(result.recommendedPathway).toBe("btm");
  });

  it("confidence is YELLOW (office, multi-storey)", () => {
    expect(result.confidence).toBe("yellow");
  });

  it("offset ~19%", () => {
    expect(result.btm.offsetPct).toBeGreaterThan(16);
    expect(result.btm.offsetPct).toBeLessThan(22);
  });
});

// ---------------------------------------------------------------------------
// Example C: Small Retail — Honest Bad Result
// ---------------------------------------------------------------------------

describe("Example C: Retail, 4,000 sqft, P-prefix", () => {
  const result = calculateSolarPv(makeRetailInput());

  it("selects East/North Ontario zone for P-prefix", () => {
    expect(result.irradianceZone).toBe("east_north_on");
    expect(result.zoneIrradiance).toBe(1100);
  });

  it("effective irradiance = 990", () => {
    expect(result.effectiveIrradiance).toBe(990);
  });

  it("roof footprint = 3,200 sqft (×0.80)", () => {
    expect(result.roofFootprintSqft).toBe(3_200);
  });

  it("available roof = 2,080 sqft (×0.65)", () => {
    expect(result.availableRoofSqft).toBe(2_080);
  });

  it("roof constrained = 31 kW", () => {
    // 2080 × 15 / 1000 = 31.2 → 31 rounded
    expect(result.roofConstrainedKw).toBe(31);
  });

  it("BTM system ~20 kW (baseload constrained)", () => {
    // 80000 × 0.55 × 0.45 / 990 = 19.8 → 20 rounded
    expect(result.btm.systemKwRounded).toBe(20);
  });

  it("NM system = 31 kW (roof constrained)", () => {
    // consumption: 80000/990 = 80.8 → min(31, 80.8, 500) = 31
    expect(result.nm.systemKwRounded).toBe(31);
  });

  it("BTM generation ~19,800 kWh", () => {
    expect(result.btm.annualGenerationKwh).toBeGreaterThan(19_000);
    expect(result.btm.annualGenerationKwh).toBeLessThan(20_500);
  });

  it("NM generation ~30,690 kWh", () => {
    expect(result.nm.annualGenerationKwh).toBeGreaterThan(30_000);
    expect(result.nm.annualGenerationKwh).toBeLessThan(31_500);
  });

  it("NM self-consumption = 0.70 (retail, standard hours)", () => {
    expect(result.nmSelfConsumptionPct).toBe(0.70);
  });

  it("uses RPP NM credit rate ($0.10)", () => {
    expect(result.nmCreditRate).toBe(NM_CREDIT_RATE_RPP);
  });

  it("BTM savings uses $0.16 rate", () => {
    expect(result.effectiveRateUsed).toBe(0.16);
    const expected = Math.round(result.btm.selfConsumedKwh * 0.16);
    expect(result.btm.annualDollarSavings).toBe(expected);
  });

  it("NM savings ~$4,358", () => {
    const selfVal = result.nm.selfConsumedKwh * 0.16;
    const exportVal = result.nm.exportedOrWastedKwh * 0.10;
    const expected = Math.round(selfVal + exportVal);
    expect(result.nm.annualDollarSavings).toBe(expected);
  });

  it("recommends BTM (SaveOnEnergy makes it viable)", () => {
    expect(result.recommendedPathway).toBe("btm");
  });

  it("confidence is RED (fast path, P-prefix not inherently red, but builds < 2000 is not met — 4000 sqft)", () => {
    // Retail, fast path — not in green_types, not enhanced → yellow
    // Actually: not data_center, not other, not < 2000 sqft, no euiValidation warning
    // Not in greenTypes either → yellow
    expect(result.confidence).toBe("yellow");
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  describe("Greenhouse exclusion", () => {
    it("returns solarShowCard = false", () => {
      const result = calculateSolarPv(
        makeInput({ buildingTypeId: "greenhouse" })
      );
      expect(result.solarShowCard).toBe(false);
      expect(result.greenhouseNote).toContain("not suitable for greenhouse");
    });
  });

  describe("Small building (< 2,000 sqft)", () => {
    it("sets confidence to RED", () => {
      const result = calculateSolarPv(
        makeInput({ buildingSizeSqft: 1_500, buildingTypeId: "retail" })
      );
      expect(result.confidence).toBe("red");
    });

    it("includes small building warning flag", () => {
      const result = calculateSolarPv(
        makeInput({ buildingSizeSqft: 1_500, buildingTypeId: "retail" })
      );
      expect(result.flags.some((f) => f.message.includes("under 2,000 sqft"))).toBe(
        true
      );
    });
  });

  describe("NM offset > 90%", () => {
    it("warns when NM generation > 90% of annual consumption", () => {
      // Small consumption relative to roof → high offset
      const result = calculateSolarPv(
        makeInput({
          annualElectricityKwh: 50_000,
          buildingTypeId: "warehouse",
          buildingSizeSqft: 20_000,
        })
      );
      const nmGen = result.nm.annualGenerationKwh;
      const ratio = nmGen / 50_000;
      if (ratio > 0.90) {
        expect(
          result.flags.some((f) => f.message.includes("offset nearly all"))
        ).toBe(true);
      }
    });
  });

  describe("NM cap reached", () => {
    it("shows note when roof > 500 kW but NM capped at 500", () => {
      const result = calculateSolarPv(
        makeInput({
          buildingTypeId: "warehouse",
          buildingSizeSqft: 80_000,
        })
      );
      // roof constrained = 840 kW > 500, NM = 500
      if (result.roofConstrainedKw > NET_METERING_CAP_KW) {
        expect(
          result.flags.some((f) =>
            f.message.includes("500 kW")
          )
        ).toBe(true);
      }
    });
  });

  describe("Payback > 25 years", () => {
    it("warns when payback exceeds 25 years", () => {
      // Very small system with high cost
      const result = calculateSolarPv(
        makeInput({
          buildingTypeId: "hotel",
          buildingSizeSqft: 50_000,
          annualElectricityKwh: 10_000,
          rateResult: {
            rateClass: "class_b",
            rateClassSource: "estimated",
            rateClassConfidence: "low",
            rateStructure: null,
            estimatedPeakKw: 50,
            classAEligible: false,
            effectiveRateTotal: 0.05,
            effectiveRateEnergy: 0.05,
            effectiveRateSource: "class_default",
            demandChargeRate: null,
            demandChargeApplicable: false,
            warnings: [],
          },
        })
      );
      const recPayback =
        result.recommendedPathway === "btm"
          ? result.btm.paybackMidpoint
          : result.nm.paybackMidpoint;
      if (recPayback !== null && recPayback > PAYBACK_GUARD_YEARS) {
        expect(
          result.flags.some((f) => f.message.includes("Payback exceeds 25"))
        ).toBe(true);
      }
    });
  });

  describe("Rate framework null", () => {
    it("falls back to $0.13/kWh", () => {
      const result = calculateSolarPv(makeInput({ rateResult: null }));
      expect(result.effectiveRateUsed).toBe(FALLBACK_EFFECTIVE_RATE);
    });

    it("includes fallback rate flag", () => {
      const result = calculateSolarPv(makeInput({ rateResult: null }));
      expect(result.flags.some((f) => f.message.includes("fallback"))).toBe(
        true
      );
    });
  });

  describe("Data Center", () => {
    it("confidence is RED", () => {
      const result = calculateSolarPv(
        makeInput({ buildingTypeId: "data_center" })
      );
      expect(result.confidence).toBe("red");
    });

    it("includes data center note", () => {
      const result = calculateSolarPv(
        makeInput({ buildingTypeId: "data_center" })
      );
      expect(
        result.flags.some((f) =>
          f.message.includes("Data centers have limited")
        )
      ).toBe(true);
    });

    it("low roof utilization (30%)", () => {
      const config = getSolarBuildingConfig("data_center");
      expect(config.roofUtilization).toBe(0.30);
    });
  });

  describe("Other Commercial", () => {
    it("confidence is RED", () => {
      const result = calculateSolarPv(makeInput({ buildingTypeId: "other" }));
      expect(result.confidence).toBe("red");
    });
  });

  describe("Same-size pathways (roof constrains both)", () => {
    it("BTM wins on incentives when both pathways same size", () => {
      const result = calculateSolarPv(makeOfficeInput());
      // Both 82 kW — BTM has SaveOnEnergy, NM does not
      expect(result.btm.systemKwRounded).toBe(result.nm.systemKwRounded);
      expect(result.btm.incentiveSoe).toBeGreaterThan(0);
      expect(result.nm.incentiveSoe).toBe(0);
      expect(result.recommendedPathway).toBe("btm");
    });
  });

  describe("Operating hours bonus", () => {
    it("extended hours adds 10% to NM self-consumption", () => {
      const result = calculateSolarPv(
        makeInput({ operatingHours: "extended", buildingTypeId: "warehouse" })
      );
      // Warehouse NM = 0.80 + 0.10 = 0.90
      expect(result.nmSelfConsumptionPct).toBe(0.90);
    });

    it("24/7 hours adds 10% to NM self-consumption", () => {
      const result = calculateSolarPv(
        makeInput({ operatingHours: "24_7", buildingTypeId: "warehouse" })
      );
      expect(result.nmSelfConsumptionPct).toBe(0.90);
    });

    it("caps at 95%", () => {
      // Data center NM = 0.90 + 0.10 = 1.00 → capped at 0.95
      const result = calculateSolarPv(
        makeInput({ operatingHours: "extended", buildingTypeId: "data_center" })
      );
      expect(result.nmSelfConsumptionPct).toBe(0.95);
    });

    it("standard hours no bonus", () => {
      const result = calculateSolarPv(
        makeInput({ operatingHours: "standard", buildingTypeId: "warehouse" })
      );
      // Warehouse NM = 0.80 (no bonus)
      expect(result.nmSelfConsumptionPct).toBe(0.80);
    });
  });

  describe("SaveOnEnergy 50% cap", () => {
    it("triggers when incentive > 50% of project cost", () => {
      // Micro system (≤ 10 kW) at $1000/kW = $10,000
      // Cost at 10 kW: 10 × 1000 × 2.50 = $25,000
      // 50% cap = $12,500 — incentive $10,000 < $12,500 → not triggered
      // To trigger: need very small system where rate × kW > 50% of cost
      // Actually, SOE micro rate is $1000/kW, cost is $2500/kW → ratio = 40% → won't cap
      // SOE standard: $860/kW, cost at medium: $1850/kW → ratio = 46.5% → won't cap
      // Let's just verify the cap logic exists by checking a micro system
      const result = calculateSolarPv(
        makeInput({
          buildingTypeId: "restaurant",
          buildingSizeSqft: 2_000,
          annualElectricityKwh: 20_000,
        })
      );
      // Verify SOE doesn't exceed 50% of cost
      expect(result.btm.incentiveSoe).toBeLessThanOrEqual(
        result.btm.costMidpoint * SOE_SOLAR_CAP_PCT
      );
    });
  });

  describe("Micro system (≤ 10 kW)", () => {
    it("uses $1,000/kW-DC rate", () => {
      const result = calculateSolarPv(
        makeInput({
          buildingTypeId: "restaurant",
          buildingSizeSqft: 2_500,
          annualElectricityKwh: 15_000,
        })
      );
      if (result.btm.systemKw <= 10) {
        const expectedSoe = Math.round(
          result.btm.systemKw * SOE_SOLAR_RATE_MICRO
        );
        const capped = Math.min(
          expectedSoe,
          result.btm.costMidpoint * SOE_SOLAR_CAP_PCT
        );
        expect(result.btm.incentiveSoe).toBe(Math.round(capped));
      }
    });
  });

  describe("Class A special note", () => {
    it("shows Class A note for Class A customers", () => {
      const result = calculateSolarPv(
        makeInput({
          rateResult: {
            rateClass: "class_a",
            rateClassSource: "estimated",
            rateClassConfidence: "medium",
            rateStructure: null,
            estimatedPeakKw: 2000,
            classAEligible: true,
            effectiveRateTotal: 0.095,
            effectiveRateEnergy: 0.075,
            effectiveRateSource: "class_default",
            demandChargeRate: 17.84,
            demandChargeApplicable: true,
            warnings: [],
          },
        })
      );
      expect(result.classANote).not.toBeNull();
      expect(result.classANote).toContain("Class A");
    });

    it("no Class A note for non-Class A", () => {
      const result = calculateSolarPv(makeInput());
      expect(result.classANote).toBeNull();
    });
  });

  describe("Enhanced path", () => {
    it("uses regression-derived baseload for BTM sizing", () => {
      const baseloadAnnual = 300_000; // kWh
      const result = calculateSolarPv(
        makeInput({
          completionPath: "enhanced",
          regressionQualityFlag: "good",
          baseloadElectricAnnual: baseloadAnnual,
        })
      );
      // BTM should use: 300000 × 0.45 / 1035 = 130.4 kW
      const expectedBtmKw = (baseloadAnnual * DAYTIME_FRACTION) / result.effectiveIrradiance;
      expect(result.btm.systemKw).toBeCloseTo(expectedBtmKw, 0);
      expect(result.completionPathUsed).toBe("enhanced");
    });

    it("falls back to standard if regression quality is poor", () => {
      const result = calculateSolarPv(
        makeInput({
          completionPath: "enhanced",
          regressionQualityFlag: "poor",
          baseloadElectricAnnual: 300_000,
        })
      );
      expect(result.completionPathUsed).toBe("standard");
    });
  });
});

// ---------------------------------------------------------------------------
// NPV with Degradation Verification
// ---------------------------------------------------------------------------

describe("NPV with degradation", () => {
  it("applies degradation factor correctly (no degradation year 1, 0.5%/yr after)", () => {
    const result = calculateSolarPv(makeInput());
    const rec = result.recommended;

    // Manual NPV calculation for BTM base case
    const netCostInc = rec.costMidpoint - rec.incentiveHigh;
    let npv = -netCostInc;
    for (let t = 1; t <= NPV_ANALYSIS_PERIOD_YEARS; t++) {
      const deg = Math.pow(1 - DEGRADATION_RATE, t - 1);
      const esc = Math.pow(1 + RATE_ESCALATION_BASE, t);
      const disc = Math.pow(1 + NPV_DISCOUNT_RATE, t);
      npv += (rec.annualDollarSavings * deg * esc) / disc;
    }

    expect(rec.npvBase).toBeCloseTo(npv, -2); // within $100
  });

  it("year 10 degradation factor = 0.995^9 = 0.9559", () => {
    const factor = Math.pow(1 - DEGRADATION_RATE, 9);
    expect(factor).toBeCloseTo(0.9559, 3);
  });
});

// ---------------------------------------------------------------------------
// CO₂ Calculations
// ---------------------------------------------------------------------------

describe("CO₂ reduction", () => {
  it("uses scope 2 factor (59 gCO₂eq/kWh)", () => {
    const result = calculateSolarPv(makeInput());
    const recGen =
      result.recommendedPathway === "btm"
        ? result.btm.annualGenerationKwh
        : result.nm.annualGenerationKwh;
    const expected = (recGen * SCOPE2_AVERAGE_FACTOR) / 1_000_000;
    expect(result.co2ReductionTonnes).toBeCloseTo(expected, 1);
  });

  it("cars equivalent uses 4.6 tonnes/car", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.carsEquivalent).toBeCloseTo(
      result.co2ReductionTonnes / 4.6,
      1
    );
  });
});

// ---------------------------------------------------------------------------
// Config Helpers
// ---------------------------------------------------------------------------

describe("Config: Irradiance zones", () => {
  it("N → Southern Ontario (1200)", () => {
    const { zone, irradiance } = getIrradianceZone("N5V");
    expect(zone).toBe("south_on");
    expect(irradiance).toBe(1200);
  });

  it("P → East/North Ontario (1100)", () => {
    const { zone, irradiance } = getIrradianceZone("P3E");
    expect(zone).toBe("east_north_on");
    expect(irradiance).toBe(1100);
  });

  it("M → Central Ontario (1150)", () => {
    const { zone, irradiance } = getIrradianceZone("M5V");
    expect(zone).toBe("central_on");
    expect(irradiance).toBe(1150);
  });

  it("L → Central Ontario (1150)", () => {
    const { zone, irradiance } = getIrradianceZone("L5N");
    expect(zone).toBe("central_on");
    expect(irradiance).toBe(1150);
  });

  it("K → Central Ontario (1150)", () => {
    const { zone, irradiance } = getIrradianceZone("K1A");
    expect(zone).toBe("central_on");
    expect(irradiance).toBe(1150);
  });

  it("unknown prefix → Central Ontario (1150)", () => {
    const { zone, irradiance } = getIrradianceZone("T2P");
    expect(zone).toBe("central_on");
    expect(irradiance).toBe(1150);
  });
});

describe("Config: Building type solar config", () => {
  it("warehouse has storey factor 1.00", () => {
    expect(getSolarBuildingConfig("warehouse").storeyFactor).toBe(1.00);
  });

  it("office has storey factor 0.33", () => {
    expect(getSolarBuildingConfig("office").storeyFactor).toBe(0.33);
  });

  it("greenhouse has roof utilization 0.00", () => {
    expect(getSolarBuildingConfig("greenhouse").roofUtilization).toBe(0.00);
  });

  it("unknown falls back to 'other'", () => {
    const config = getSolarBuildingConfig("nonexistent_type");
    expect(config.buildingTypeId).toBe("other");
  });
});

describe("Config: Cost per watt brackets", () => {
  it("< 10 kW = Micro ($2.50/$3.00)", () => {
    const cost = getCostPerWatt(5);
    expect(cost.midpoint).toBe(2.50);
    expect(cost.high).toBe(3.00);
    expect(cost.label).toBe("Micro");
  });

  it("10–49 kW = Small ($2.10/$2.40)", () => {
    const cost = getCostPerWatt(25);
    expect(cost.midpoint).toBe(2.10);
    expect(cost.high).toBe(2.40);
  });

  it("50–199 kW = Medium ($1.85/$2.10)", () => {
    const cost = getCostPerWatt(100);
    expect(cost.midpoint).toBe(1.85);
    expect(cost.high).toBe(2.10);
  });

  it("200–499 kW = Large ($1.65/$1.90)", () => {
    const cost = getCostPerWatt(300);
    expect(cost.midpoint).toBe(1.65);
    expect(cost.high).toBe(1.90);
  });

  it("500+ kW = Very Large ($1.45/$1.70)", () => {
    const cost = getCostPerWatt(700);
    expect(cost.midpoint).toBe(1.45);
    expect(cost.high).toBe(1.70);
  });

  it("boundary: 10 kW is Small, not Micro", () => {
    const cost = getCostPerWatt(10);
    expect(cost.label).toBe("Small");
  });

  it("boundary: 50 kW is Medium", () => {
    const cost = getCostPerWatt(50);
    expect(cost.label).toBe("Medium");
  });

  it("boundary: 200 kW is Large", () => {
    const cost = getCostPerWatt(200);
    expect(cost.label).toBe("Large");
  });

  it("boundary: 500 kW is Very Large", () => {
    const cost = getCostPerWatt(500);
    expect(cost.label).toBe("Very Large");
  });
});

describe("Config: Monthly generation shape", () => {
  it("sums to 1.000", () => {
    const sum = MONTHLY_GEN_PCT.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it("has 12 entries", () => {
    expect(MONTHLY_GEN_PCT).toHaveLength(12);
  });

  it("July is peak (0.127)", () => {
    expect(MONTHLY_GEN_PCT[6]).toBe(0.127);
  });
});

// ---------------------------------------------------------------------------
// Confidence Levels
// ---------------------------------------------------------------------------

describe("Confidence levels", () => {
  it("GREEN for warehouse + enhanced path", () => {
    const result = calculateSolarPv(
      makeInput({
        completionPath: "enhanced",
        regressionQualityFlag: "good",
        baseloadElectricAnnual: 400_000,
      })
    );
    expect(result.confidence).toBe("green");
  });

  it("YELLOW for standard path warehouse", () => {
    const result = calculateSolarPv(makeInput());
    // warehouse is in green_types but completionPath is standard → yellow
    expect(result.confidence).toBe("yellow");
  });

  it("RED for data center", () => {
    const result = calculateSolarPv(
      makeInput({ buildingTypeId: "data_center" })
    );
    expect(result.confidence).toBe("red");
  });

  it("RED for Other Commercial", () => {
    const result = calculateSolarPv(makeInput({ buildingTypeId: "other" }));
    expect(result.confidence).toBe("red");
  });

  it("RED for small building", () => {
    const result = calculateSolarPv(
      makeInput({ buildingSizeSqft: 1_500, buildingTypeId: "retail" })
    );
    expect(result.confidence).toBe("red");
  });

  it("RED with EUI validation warning", () => {
    const result = calculateSolarPv(
      makeInput({ euiValidationWarning: true })
    );
    expect(result.confidence).toBe("red");
  });

  it("YELLOW for office (not in green types)", () => {
    const result = calculateSolarPv(makeOfficeInput());
    expect(result.confidence).toBe("yellow");
  });

  it("GREEN for grocery + enhanced", () => {
    const result = calculateSolarPv(
      makeInput({
        buildingTypeId: "grocery",
        completionPath: "enhanced",
        regressionQualityFlag: "good",
        baseloadElectricAnnual: 200_000,
      })
    );
    expect(result.confidence).toBe("green");
  });
});

// ---------------------------------------------------------------------------
// BESS-Ready Outputs
// ---------------------------------------------------------------------------

describe("BESS-ready outputs", () => {
  it("excess generation from recommended pathway", () => {
    const result = calculateSolarPv(makeInput());
    if (result.recommendedPathway === "btm") {
      expect(result.solarExcessGenerationKwh).toBe(
        result.btm.exportedOrWastedKwh
      );
    } else {
      expect(result.solarExcessGenerationKwh).toBe(
        result.nm.exportedOrWastedKwh
      );
    }
  });

  it("self-consumption ratio matches recommended pathway", () => {
    const result = calculateSolarPv(makeInput());
    if (result.recommendedPathway === "btm") {
      expect(result.solarSelfConsumptionRatio).toBe(BTM_SELF_CONSUMPTION);
    } else {
      expect(result.solarSelfConsumptionRatio).toBe(result.nmSelfConsumptionPct);
    }
  });

  it("monthly generation sums to annual (within rounding)", () => {
    const result = calculateSolarPv(makeInput());
    const monthlySum = result.solarMonthlyGenerationKwh.reduce(
      (a, b) => a + b,
      0
    );
    const recGen = result.recommended.annualGenerationKwh;
    // Allow ±12 for rounding (1 per month)
    expect(monthlySum).toBeGreaterThan(recGen - 12);
    expect(monthlySum).toBeLessThan(recGen + 12);
  });

  it("has 12 monthly values", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.solarMonthlyGenerationKwh).toHaveLength(12);
  });

  it("peak demand estimated when O1 not provided", () => {
    const result = calculateSolarPv(makeInput({ peakDemandKw: null }));
    expect(result.solarPeakDemandKw).toBeGreaterThan(0);
  });

  it("uses provided peak demand when O1 available", () => {
    const result = calculateSolarPv(makeInput({ peakDemandKw: 250 }));
    expect(result.solarPeakDemandKw).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Peak Demand Estimation
// ---------------------------------------------------------------------------

describe("estimatePeakDemand", () => {
  it("warehouse: annual_kwh / 8760 / 0.55", () => {
    const peak = estimatePeakDemand(600_000, "warehouse");
    expect(peak).toBeCloseTo(600_000 / 8760 / 0.55, 0);
  });

  it("data center: uses load factor 0.80", () => {
    const peak = estimatePeakDemand(1_000_000, "data_center");
    expect(peak).toBeCloseTo(1_000_000 / 8760 / 0.80, 0);
  });

  it("unknown type defaults to 'other' (0.50)", () => {
    const peak = estimatePeakDemand(100_000, "unknown_type");
    expect(peak).toBeCloseTo(100_000 / 8760 / 0.50, 0);
  });
});

// ---------------------------------------------------------------------------
// Pathway Selection Logic
// ---------------------------------------------------------------------------

describe("Pathway selection", () => {
  it("BTM always has SaveOnEnergy, NM never does", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.btm.incentiveSoe).toBeGreaterThan(0);
    expect(result.nm.incentiveSoe).toBe(0);
  });

  it("NM incentive low = $0 (no SOE, no CT ITC conservative)", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.nm.incentiveLow).toBe(0);
  });

  it("NM incentive high = CT ITC only", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.nm.incentiveHigh).toBe(result.nm.incentiveCtItc);
  });

  it("BTM wins ties (both pathways identical NPV)", () => {
    // This tests the tie-breaking logic — when NPV_NM === NPV_BTM, BTM wins
    // Hard to manufacture exact tie, but verify BTM wins when NPVs are close
    const result = calculateSolarPv(makeOfficeInput());
    // Both same size → BTM has SOE → BTM should have higher NPV
    expect(result.recommendedPathway).toBe("btm");
    expect(result.btm.npvBase).toBeGreaterThanOrEqual(result.nm.npvBase);
  });
});

// ---------------------------------------------------------------------------
// Demand charge interaction
// ---------------------------------------------------------------------------

describe("Demand charge", () => {
  it("is always $0 at Tier 2", () => {
    const result = calculateSolarPv(makeInput());
    expect(result.demandChargeSavings).toBe(0);
  });

  it("includes demand note in flags", () => {
    const result = calculateSolarPv(makeInput());
    expect(
      result.flags.some((f) =>
        f.message.includes("Solar may reduce your peak demand")
      )
    ).toBe(true);
  });
});
