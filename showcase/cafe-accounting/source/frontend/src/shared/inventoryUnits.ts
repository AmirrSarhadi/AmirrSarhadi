import { Unit } from "./inventoryApi";
import { decimalError, normalizeNumber } from "./ui/format";

export type InventoryUnit = "kg" | "l" | "piece";
export function inventoryUnit(unit: Unit): InventoryUnit {
  return unit === "g" || unit === "kg" ? "kg" : unit === "ml" || unit === "l" ? "l" : "piece";
}

// Shift decimal strings exactly: quantities and prices must never pass through Number.
export function shiftDecimal(value: string, places: number): string {
  const normalized = normalizeNumber(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) throw new Error("Invalid decimal quantity");
  const fraction = match[3] ?? "";
  const digits = match[2] + fraction;
  const scale = fraction.length - places;
  const padded = scale > 0 ? digits.padStart(scale + 1, "0") : digits + "0".repeat(-scale);
  const whole = (scale > 0 ? padded.slice(0, -scale) : padded).replace(/^0+(?=\d)/, "");
  const decimal = scale > 0 ? padded.slice(-scale).replace(/0+$/, "") : "";
  const sign = match[1] && /[1-9]/.test(padded) ? "-" : "";
  return sign + whole + (decimal ? `.${decimal}` : "");
}
export const displayQuantity = (value: string, unit: Unit) => shiftDecimal(value, unit === "g" || unit === "ml" ? -3 : 0);
export const displayUnitCost = (value: string, unit: Unit) => shiftDecimal(value, unit === "g" || unit === "ml" ? 3 : 0);
export function storedQuantity(value: string, unit: Unit) {
  return { quantity: shiftDecimal(value, unit === "kg" || unit === "l" ? 3 : 0), unit: unit === "kg" ? "g" as const : unit === "l" ? "ml" as const : unit };
}
export function inventoryQuantityError(value: string, unit: Unit, allowZero = false) {
  const error = decimalError(value, unit === "kg" || unit === "l" ? 6 : 3, allowZero, unit === "piece");
  if (error) return error;
  // Preserve the API's three-place gram/ml precision and range, including existing tiny recipes.
  return decimalError(storedQuantity(value, unit).quantity, 3, allowZero, unit === "piece");
}

export function convertQuantity(value: string, from: Unit, to: Unit) {
  if (!value.trim()) return value;
  // Keep invalid drafts editable; the form owns validation, never silently round them.
  if (!/^-?\d+(\.\d+)?$/.test(normalizeNumber(value))) return value;
  const stored = storedQuantity(value, from);
  return to === "kg" || to === "l" ? displayQuantity(stored.quantity, stored.unit) : stored.quantity;
}
