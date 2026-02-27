/**
 * Building Discovery — Results Page (Server Component)
 *
 * Fetches the Assessment record from the database by UUID (from ?assessment= param),
 * extracts user-entered input fields, and passes them to the client component
 * for engine calculations and rendering.
 *
 * Data flow:
 *   ?assessment=<uuid> → DB fetch → extract inputs → client component → engines → render
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResultsClient } from "./results-client";
import type { ParsedUserInputs } from "./results-client";

interface ResultsPageProps {
  searchParams: Promise<{ assessment?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const assessmentId = params.assessment;

  if (!assessmentId) {
    return (
      <main className="vm-container">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--vm-navy)" }}
        >
          Building Discovery Results
        </h1>
        <p style={{ color: "var(--vm-gray-500)" }}>
          No assessment ID provided. Please complete the Building Discovery form first.
        </p>
      </main>
    );
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment) {
    notFound();
  }

  const operatingHours = assessment.operatingHours;

  function categorizeOperatingHours(hours: number): "standard" | "extended" | "24_7" {
    if (hours >= 7000) return "24_7";
    if (hours >= 4000) return "extended";
    return "standard";
  }

  const userInputs: ParsedUserInputs = {
    buildingTypeId: assessment.buildingType,
    buildingSizeSqft: assessment.buildingSizeSqft,
    operatingHours,
    annualElectricityKwh: assessment.annualElectricityKwh,
    annualElectricityCost: assessment.annualElectricityCost
      ? Number(assessment.annualElectricityCost)
      : null,
    annualGasM3: assessment.annualGasM3
      ? Number(assessment.annualGasM3)
      : null,
    annualGasCost: assessment.annualGasCost
      ? Number(assessment.annualGasCost)
      : null,
    peakDemandKw: assessment.peakDemandKw
      ? Number(assessment.peakDemandKw)
      : null,
    postalCode: assessment.postalCode,
    rateStructure: assessment.rateStructure ?? null,
    lightingType: assessment.lightingType ?? "mixed",
    fuelSource: assessment.fuelSource ?? "natural_gas",
    hvacAge: assessment.hvacAge ?? "10_20",
    ownershipType: (assessment.ownershipType as "own" | "lease" | "other") ?? null,
    operatingHoursCategory: categorizeOperatingHours(operatingHours),
  };

  return <ResultsClient userInputs={userInputs} />;
}
