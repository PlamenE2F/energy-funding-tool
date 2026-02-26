/**
 * Benchmark Comparison Tests
 *
 * Section 9.2: Benchmark Comparisons
 * GREEN / YELLOW / RED display logic
 */

import { describe, it, expect } from "vitest";
import {
  compareToBenchmark,
  getBenchmarkComparisonText,
} from "@/lib/eui/benchmark";

// ---------------------------------------------------------------------------
// Section 9.2: Benchmark Comparisons
// ---------------------------------------------------------------------------

describe("Benchmark comparisons — Section 9.2", () => {
  it("Office (GREEN), EUI 25.0 vs benchmark 22.5 → 11% above median", () => {
    const result = compareToBenchmark("office", 25.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(true);
    expect(result.classification).toBe("green");
    expect(result.userVsMedianPct).toBeCloseTo(11.1, 0);
    expect(result.benchmarkTier).toBe("near_median"); // within ±15%
  });

  it("Office (GREEN), EUI 20.0 vs benchmark 22.5 → 11% below median", () => {
    const result = compareToBenchmark("office", 20.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(true);
    expect(result.userVsMedianPct).toBeCloseTo(-11.1, 0);
    expect(result.benchmarkTier).toBe("near_median"); // within ±15%
  });

  it("Office (GREEN), EUI 22.0 vs benchmark 22.5 → ~2% below, near median", () => {
    const result = compareToBenchmark("office", 22.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(true);
    expect(result.benchmarkTier).toBe("near_median");
    expect(Math.abs(result.userVsMedianPct!)).toBeLessThan(5);
  });

  it("Office (GREEN), EUI 30.0 → above median (>15%)", () => {
    const result = compareToBenchmark("office", 30.0, "standard", 0.13);
    // (30 - 22.5) / 22.5 = 33.3%
    expect(result.benchmarkTier).toBe("above_median");
  });

  it("Office (GREEN), EUI 15.0 → below median (>15%)", () => {
    const result = compareToBenchmark("office", 15.0, "standard", 0.13);
    // (15 - 22.5) / 22.5 = -33.3%
    expect(result.benchmarkTier).toBe("below_median");
  });

  it("Cold Storage (YELLOW) → show comparison with caveat", () => {
    const result = compareToBenchmark("warehouse_cold", 45.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(true);
    expect(result.classification).toBe("yellow");
    expect(result.caveatText).toContain("dry warehousing");
    // No cost intensity for YELLOW
    expect(result.costIntensityLow).toBeNull();
    expect(result.costIntensityHigh).toBeNull();
  });

  it("Manufacturing (YELLOW) → show with proxy caveat", () => {
    const result = compareToBenchmark("manufacturing", 30.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(true);
    expect(result.classification).toBe("yellow");
    expect(result.caveatText).toContain("warehouse benchmark as proxy");
  });

  it("Data Center (RED) → no comparison shown", () => {
    const result = compareToBenchmark("data_center", 150.0, "fast", 0.13);
    expect(result.comparisonShown).toBe(false);
    expect(result.classification).toBe("red");
    expect(result.benchmarkEui).toBeNull();
    expect(result.comparisonNote).toContain("not available");
  });

  it("Agriculture (RED) → no comparison shown", () => {
    const result = compareToBenchmark("agriculture", 50.0, "fast", 0.13);
    expect(result.comparisonShown).toBe(false);
    expect(result.classification).toBe("red");
  });

  it("Other Commercial (RED) → no comparison shown", () => {
    const result = compareToBenchmark("other", 25.0, "standard", 0.13);
    expect(result.comparisonShown).toBe(false);
    expect(result.classification).toBe("red");
  });
});

// ---------------------------------------------------------------------------
// Electricity-Only vs Total-Site Comparison
// ---------------------------------------------------------------------------

describe("Fast path — electricity-only benchmark", () => {
  it("uses benchmark_eui × electricity_fraction for fast path", () => {
    // Office: benchmark = 22.5, elec fraction = 0.60
    // Elec-only benchmark = 22.5 × 0.60 = 13.5
    const result = compareToBenchmark("office", 15.0, "fast", 0.13);
    expect(result.benchmarkEui).toBe(13.5);
    expect(result.comparisonNote).toContain("electricity portion");
  });

  it("uses full benchmark for standard path", () => {
    const result = compareToBenchmark("office", 25.0, "standard", 0.13);
    expect(result.benchmarkEui).toBe(22.5);
    expect(result.comparisonNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cost Intensity (GREEN types only)
// ---------------------------------------------------------------------------

describe("Cost intensity benchmarks", () => {
  it("shows cost intensity range for GREEN types", () => {
    const result = compareToBenchmark("office", 22.5, "standard", 0.13);
    expect(result.costIntensityLow).not.toBeNull();
    expect(result.costIntensityHigh).not.toBeNull();
    // ±20% range around derived value
    expect(result.costIntensityHigh!).toBeGreaterThan(result.costIntensityLow!);
  });

  it("does NOT show cost intensity for YELLOW types", () => {
    const result = compareToBenchmark("warehouse_cold", 20.0, "standard", 0.13);
    expect(result.costIntensityLow).toBeNull();
    expect(result.costIntensityHigh).toBeNull();
  });

  it("does NOT show cost intensity for RED types", () => {
    const result = compareToBenchmark("data_center", 150.0, "fast", 0.13);
    expect(result.costIntensityLow).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Display Text
// ---------------------------------------------------------------------------

describe("getBenchmarkComparisonText", () => {
  it("generates correct text for above median", () => {
    const text = getBenchmarkComparisonText(33.3, "above_median");
    expect(text).toContain("33%");
    expect(text).toContain("more");
  });

  it("generates correct text for below median", () => {
    const text = getBenchmarkComparisonText(-11.1, "near_median");
    expect(text).toContain("approximately the same");
  });
});
