/**
 * Building Type Configuration — Benchmark Data
 *
 * All 16 canonical VoltMatch building types with:
 *   - Benchmark EUI (from SCIEU 2019 / SECMURBs 2018)
 *   - Electricity fraction
 *   - Classification (GREEN / YELLOW / RED)
 *   - Caveat text for YELLOW types
 *   - Load factors (matching rate framework)
 *
 * Sources:
 *   - NRCan SCIEU — Buildings 2019 Data Tables
 *   - SECMURBs 2018 (multi-residential)
 *   - NRCan / ENERGY STAR Portfolio Manager Canadian EUI Reference
 */

import type { BuildingTypeConfig } from "@/lib/eui/types";

// ---------------------------------------------------------------------------
// Conversion: 1 GJ/m² = 25.85 kWh/sqft/year
// ---------------------------------------------------------------------------

export const GJ_M2_TO_KWH_SQFT = 25.85;
export const KWH_SQFT_TO_GJ_M2 = 0.0387;

// ---------------------------------------------------------------------------
// 16 Canonical Building Types
// ---------------------------------------------------------------------------

export const BUILDING_TYPE_CONFIGS: BuildingTypeConfig[] = [
  {
    buildingTypeId: "office",
    buildingTypeName: "Office",
    benchmarkSource: "SCIEU 2019 — Office (excl. medical)",
    benchmarkEuiGjM2: 0.87,
    benchmarkEuiKwhSqft: 22.5,
    electricityFraction: 0.60,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.45,
  },
  {
    buildingTypeId: "warehouse",
    buildingTypeName: "Warehouse (Dry Storage)",
    benchmarkSource: "SCIEU 2019 — Warehouse",
    benchmarkEuiGjM2: 0.72,
    benchmarkEuiKwhSqft: 18.6,
    electricityFraction: 0.50,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.35,
  },
  {
    buildingTypeId: "warehouse_cold",
    buildingTypeName: "Warehouse (Cold Storage)",
    benchmarkSource: "SCIEU 2019 — Warehouse (proxy)",
    benchmarkEuiGjM2: 0.72,
    benchmarkEuiKwhSqft: 18.6,
    electricityFraction: 0.85,
    benchmarkClassification: "yellow",
    energyStarEligible: false,
    benchmarkCaveatText:
      "This benchmark reflects typical dry warehousing. Cold storage facilities typically use significantly more energy due to refrigeration loads.",
    loadFactor: 0.35,
  },
  {
    buildingTypeId: "manufacturing",
    buildingTypeName: "Manufacturing (Light)",
    benchmarkSource: "SCIEU 2019 — Warehouse (proxy)",
    benchmarkEuiGjM2: 0.72,
    benchmarkEuiKwhSqft: 18.6,
    electricityFraction: 0.55,
    benchmarkClassification: "yellow",
    energyStarEligible: false,
    benchmarkCaveatText:
      "Using warehouse benchmark as proxy — manufacturing process loads may increase energy use significantly beyond this reference.",
    loadFactor: 0.55,
  },
  {
    buildingTypeId: "manufacturing_food",
    buildingTypeName: "Manufacturing (Food)",
    benchmarkSource: "SCIEU 2019 — Restaurant (proxy)",
    benchmarkEuiGjM2: 1.28,
    benchmarkEuiKwhSqft: 33.1,
    electricityFraction: 0.50,
    benchmarkClassification: "yellow",
    energyStarEligible: false,
    benchmarkCaveatText:
      "Using approximate benchmark — food processing energy profiles vary widely based on scale and process type.",
    loadFactor: 0.55,
  },
  {
    buildingTypeId: "retail",
    buildingTypeName: "Retail",
    benchmarkSource: "SCIEU 2019 — Retail (non-food)",
    benchmarkEuiGjM2: 0.85,
    benchmarkEuiKwhSqft: 22.0,
    electricityFraction: 0.65,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.40,
  },
  {
    buildingTypeId: "restaurant",
    buildingTypeName: "Food Service / Restaurant",
    benchmarkSource: "SCIEU 2019 — Restaurant",
    benchmarkEuiGjM2: 1.28,
    benchmarkEuiKwhSqft: 33.1,
    electricityFraction: 0.45,
    benchmarkClassification: "green",
    energyStarEligible: false,
    benchmarkCaveatText: null,
    loadFactor: 0.45,
  },
  {
    buildingTypeId: "medical_office",
    buildingTypeName: "Healthcare / Medical",
    benchmarkSource: "SCIEU 2019 — Medical office",
    benchmarkEuiGjM2: 0.74,
    benchmarkEuiKwhSqft: 19.1,
    electricityFraction: 0.60,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.40,
  },
  {
    buildingTypeId: "school",
    buildingTypeName: "Education",
    benchmarkSource: "SCIEU 2019 — Primary/secondary",
    benchmarkEuiGjM2: 0.70,
    benchmarkEuiKwhSqft: 18.1,
    electricityFraction: 0.45,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.30,
  },
  {
    buildingTypeId: "data_center",
    buildingTypeName: "Data Center",
    benchmarkSource: null,
    benchmarkEuiGjM2: null,
    benchmarkEuiKwhSqft: null,
    electricityFraction: 0.95,
    benchmarkClassification: "red",
    energyStarEligible: false,
    benchmarkCaveatText: null,
    loadFactor: 0.80,
  },
  {
    buildingTypeId: "agriculture",
    buildingTypeName: "Agriculture (Traditional)",
    benchmarkSource: null,
    benchmarkEuiGjM2: null,
    benchmarkEuiKwhSqft: null,
    electricityFraction: 0.50,
    benchmarkClassification: "red",
    energyStarEligible: false,
    benchmarkCaveatText: null,
    loadFactor: 0.40,
  },
  {
    buildingTypeId: "greenhouse",
    buildingTypeName: "Agriculture (Greenhouse)",
    benchmarkSource: null,
    benchmarkEuiGjM2: null,
    benchmarkEuiKwhSqft: null,
    electricityFraction: 0.60,
    benchmarkClassification: "red",
    energyStarEligible: false,
    benchmarkCaveatText: null,
    loadFactor: 0.50,
  },
  {
    buildingTypeId: "multifamily",
    buildingTypeName: "Multi-Residential",
    benchmarkSource: "SECMURBs 2018",
    benchmarkEuiGjM2: 0.82,
    benchmarkEuiKwhSqft: 21.2,
    electricityFraction: 0.45,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.45,
  },
  {
    buildingTypeId: "hotel",
    buildingTypeName: "Hotel / Hospitality",
    benchmarkSource: "SCIEU 2019 — Hotel/motel",
    benchmarkEuiGjM2: 0.87,
    benchmarkEuiKwhSqft: 22.5,
    electricityFraction: 0.50,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.50,
  },
  {
    buildingTypeId: "grocery",
    buildingTypeName: "Grocery / Supermarket",
    benchmarkSource: "SCIEU 2019 — Food/beverage store",
    benchmarkEuiGjM2: 1.07,
    benchmarkEuiKwhSqft: 27.7,
    electricityFraction: 0.75,
    benchmarkClassification: "green",
    energyStarEligible: true,
    benchmarkCaveatText: null,
    loadFactor: 0.55,
  },
  {
    buildingTypeId: "other",
    buildingTypeName: "Other Commercial",
    benchmarkSource: "SCIEU 2019 — Others Inscope",
    benchmarkEuiGjM2: 0.86,
    benchmarkEuiKwhSqft: 22.2,
    electricityFraction: 0.55,
    benchmarkClassification: "red",
    energyStarEligible: false,
    benchmarkCaveatText: null,
    loadFactor: 0.40,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up building type config by ID.
 * Falls back to "other" if not found.
 */
export function getBuildingTypeConfig(
  buildingTypeId: string
): BuildingTypeConfig {
  return (
    BUILDING_TYPE_CONFIGS.find((bt) => bt.buildingTypeId === buildingTypeId) ??
    BUILDING_TYPE_CONFIGS.find((bt) => bt.buildingTypeId === "other")!
  );
}
