/**
 * Building Type Display Names
 *
 * Maps database keys to human-readable display names.
 * Used throughout the results page and measure cards.
 */

export const BUILDING_TYPE_DISPLAY: Record<string, string> = {
  office: "Office",
  warehouse: "Warehouse (Dry Storage)",
  warehouse_cold: "Warehouse (Cold Storage)",
  manufacturing: "Manufacturing (Light)",
  manufacturing_food: "Manufacturing (Food)",
  retail: "Retail",
  restaurant: "Food Service / Restaurant",
  medical_office: "Healthcare / Medical",
  school: "Education",
  data_center: "Data Center",
  agriculture: "Agriculture (Traditional)",
  greenhouse: "Agriculture (Greenhouse)",
  multifamily: "Multi-Residential",
  hotel: "Hotel / Hospitality",
  grocery: "Grocery / Supermarket",
  other: "Other Commercial",
};

/**
 * Get human-readable building type name from database key.
 * Falls back to title-casing the key if not found.
 */
export function getBuildingTypeDisplayName(buildingTypeId: string): string {
  return (
    BUILDING_TYPE_DISPLAY[buildingTypeId] ??
    buildingTypeId
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
