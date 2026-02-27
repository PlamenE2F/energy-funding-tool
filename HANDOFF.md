# VoltMatch — Session Handoff Document

**Date:** 2026-02-27
**Branch:** `claude/electricity-rate-classification-c7gyP`
**Status:** 3 of 6 measure cards complete. 178 tests passing. TypeScript clean.

---

## 1. What Has Been Built

### Brief #1 — Electricity Rate Classification Framework
Classifies Ontario commercial buildings into rate classes (RPP, Class B, Class A), calculates effective electricity rates. Feeds every measure card.

### Brief #2 — EUI Baseline & Emissions Engine
Calculates building energy use intensity (3 paths: fast/standard/enhanced), benchmark comparisons (GREEN/YELLOW/RED), CO₂ emissions (Scope 1 + 2), weather normalization.

### Brief #3 — LED Lighting Retrofit Measure Card
First measure card. Establishes the pattern for all subsequent measure cards. 10-step calculation pipeline.

---

## 2. Project Structure

```
energy-funding-tool/
├── prisma/
│   ├── schema.prisma          # 7 models (see Section 4)
│   └── seed.ts                # Ontario config data + LED lighting data
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── assessment/
│   │   │   └── rate-structure-select.tsx
│   │   ├── energy-profile/
│   │   │   ├── benchmark-bar.tsx
│   │   │   ├── emissions-display.tsx
│   │   │   ├── energy-profile-snapshot.tsx
│   │   │   └── gas-nudge-banner.tsx
│   │   ├── measure-cards/
│   │   │   └── savings-display.tsx       # Shared savings display (RPP vs Class B)
│   │   └── measures/
│   │       └── led-measure-card.tsx      # LED UI card (pattern to follow)
│   ├── lib/
│   │   ├── config/
│   │   │   ├── ontario-rates.ts          # Rate class configs, TOU periods, load factors
│   │   │   ├── building-types.ts         # 16 building types with benchmark EUI
│   │   │   ├── emissions.ts              # ECCC V3.0 factors, scope2=59, benchmarks
│   │   │   ├── fuel-types.ts             # Gas 10.55 kWh/m³, fuel oil, propane
│   │   │   └── led-lighting.ts           # LED measure config (pattern to follow)
│   │   ├── rates/
│   │   │   ├── types.ts                  # All rate types including RateClassificationResult
│   │   │   ├── classification.ts         # Rate class assignment engine
│   │   │   ├── effective-rate.ts         # Method A (user) / Method B (defaults)
│   │   │   ├── demand-charges.ts         # Peak impact profiles, demand savings
│   │   │   └── index.ts                  # Public API
│   │   ├── eui/
│   │   │   ├── types.ts                  # EUI, benchmark, emissions types
│   │   │   ├── calculator.ts             # EUI calculation (3 paths)
│   │   │   ├── benchmark.ts              # Building type comparison
│   │   │   ├── weather-normalization.ts  # 3P-H regression model
│   │   │   └── index.ts                  # Public API (also re-exports emissions)
│   │   ├── emissions/
│   │   │   └── calculator.ts             # Scope 1/2 emissions, fuel switching
│   │   └── measures/
│   │       └── led-lighting.ts           # LED calc engine (pattern to follow)
│   └── styles/
│       └── globals.css                   # --vm-* CSS variables
├── tests/
│   ├── rates/          (3 files, 61 tests)
│   ├── eui/            (3 files, 41 tests)
│   ├── emissions/      (1 file, 15 tests)
│   └── measures/       (1 file, 61 tests)
├── package.json        # Next.js 15, React 19, Prisma 6, Vitest 3, Tailwind 4
├── tsconfig.json       # strict mode, @/* path alias
└── vitest.config.ts    # node env, path aliases
```

---

## 3. Tech Stack

- **Next.js 15** (App Router, `src/` directory)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (PostCSS plugin)
- **Prisma 6** (PostgreSQL)
- **Vitest 3** (test runner)
- **Path alias:** `@/*` → `src/*`

---

## 4. Database Schema (Prisma Models)

| Model | Purpose |
|-------|---------|
| `JurisdictionConfig` | Ontario settings, emission factors, carbon pricing |
| `RateClassConfig` | 6 rate classes (RPP TOU/ULO/Tiered, Class B ×2, Class A) |
| `TouPeriodConfig` | TOU period definitions with seasonal rates |
| `BuildingTypeConfig` | 16 building types + benchmark EUI + LED config per type |
| `FuelTypeConfig` | 3 fuels (gas, oil, propane) with ECCC V3.0 factors |
| `LightingTechnologyConfig` | 6 lighting types with savings % vs LED |
| `Assessment` | Full assessment with rate + EUI + emissions + LED inputs |
| `MeasureResult` | Per-measure results linked to assessment |

---

## 5. The Measure Card Pattern (established by LED)

Each measure card follows this structure:

### Config file: `src/lib/config/{measure-name}.ts`
- All configurable values (nothing hardcoded)
- Per-building-type configs (shares, costs, applicability, notes)
- Incentive parameters
- Financial defaults (NPV discount rate, analysis period, escalation scenarios)
- Confidence thresholds
- Helper functions: `get{Measure}BuildingConfig()`, etc.

### Calculation engine: `src/lib/measures/{measure-name}.ts`
- Input interface with `rateResult: RateClassificationResult | null`
- Result interface with full traceability fields
- 10-step pipeline:
  1. Estimate baseline energy for this measure
  2. Determine savings percentage
  3. Calculate annual energy savings (kWh)
  4. Calculate energy dollar savings (uses `effectiveRateEnergy` from rate result)
  5. Calculate demand charge savings (Class B+ only, uses `demandChargeRate`)
  6. Estimate implementation cost
  7. Estimate incentives (SaveOnEnergy)
  8. Net cost and simple payback
  9. NPV with 3 escalation scenarios (2%, 2.5%, 4.5%)
  10. CO₂ reduction (kWh × 59 / 1,000,000)
- Confidence levels: green/yellow/red
- Edge case handlers returning zero-result objects
- Flags array for warnings and info notes

### UI component: `src/components/measures/{measure-name}-card.tsx`
- Above-fold: 5-second scan (savings, payback, CO₂, incentive callout)
- Below-fold: 30-second detail (energy breakdown, dollar savings, cost/incentives, NPV table, flags)
- Edge case cards (non-applicable, already-optimized)
- Uses `--vm-*` CSS variables, `formatDollars()` and `formatKwh()` from rates

### Tests: `tests/measures/{measure-name}.test.ts`
- 3 worked examples (different building types, rate classes, measure-specific params)
- Edge cases (non-applicable building types, already-optimized, null rate, confidence levels)
- Step-by-step verification of the calculation pipeline
- NPV ordering verification
- CO₂ factor verification

---

## 6. Key Integration Points for New Measure Cards

### Rate Framework (import from `@/lib/rates/types` or `@/lib/rates`)
```typescript
interface RateClassificationResult {
  rateClass: string;                  // "rpp_tou" | "class_b" | "class_a" | etc.
  effectiveRateEnergy: number;        // $/kWh — energy-only rate
  effectiveRateTotal: number;         // $/kWh — all-in rate
  demandChargeRate: number | null;    // $/kW/month — null for RPP
  demandChargeApplicable: boolean;    // true for Class B+
  // ... plus confidence, warnings, etc.
}
```

### Emissions Config (import from `@/lib/config/emissions`)
```typescript
SCOPE2_AVERAGE_FACTOR = 59           // gCO₂eq/kWh (Ontario grid, 2026)
BENCHMARK_COST_RATE_ELECTRIC = 0.13  // $/kWh fallback when no rate result
```

### Shared Financial Constants
```typescript
NPV_DISCOUNT_RATE = 0.06
NPV_ANALYSIS_PERIOD_YEARS = 10
RATE_ESCALATION_CONSERVATIVE = 0.02
RATE_ESCALATION_BASE = 0.025
RATE_ESCALATION_HIGH = 0.045
```
These are currently in `led-lighting.ts` config. If the HVAC measure uses the same values, consider extracting to a shared `financial-defaults.ts` config.

### Formatters (import from `@/lib/rates`)
```typescript
formatDollars(amount: number): string    // "$1,234"
formatKwh(kwh: number): string           // "144,000"
```

---

## 7. Standing Instructions (Apply to All Briefs)

- **Nothing hardcoded** — all configurable values in `src/lib/config/`
- **CSS namespace:** `--vm-*` prefix on all CSS custom properties
- **Conservative error direction** — when uncertain, overestimate costs, underestimate savings
- **Gas conversion:** 10.55 kWh/m³ (HHV), NOT 10.36
- **Ontario grid emission factor:** 59 gCO₂eq/kWh (ECCC V3.0, designated 2026)
- **Demand charges:** Only for Class B+ (≥50 kW). RPP has no demand charges.
- **SaveOnEnergy incentive:** $0.20/kWh saved, capped at 50% of project cost
- **16 canonical building types** from Data Point Spec v1.2
- **v1.1 correction:** 40-60 kW band defaults to Class B (conservative)

---

## 8. How to Run

```bash
# Tests (178 passing)
npx vitest run

# TypeScript check
npx tsc --noEmit

# Dev server
npx next dev
```

---

## 9. Remaining Measure Cards (Briefs #4–#7)

The next session should receive the HVAC brief and follow the LED pattern:
1. Config file in `src/lib/config/`
2. Calculation engine in `src/lib/measures/`
3. Prisma schema additions (building type fields + measure result fields)
4. Seed data updates
5. UI component in `src/components/measures/`
6. Tests in `tests/measures/`

Each new measure card adds to `MeasureResult` with measure-specific fields and may add new per-building-type config columns to `BuildingTypeConfig`.
