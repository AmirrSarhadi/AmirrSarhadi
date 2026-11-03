import { inventoryQuantityError } from "../shared/inventoryUnits";
import { decimalError } from "../shared/ui/format";
import { Ingredient, MovementInput } from "../shared/inventoryApi";
import { UserFacingError } from "../shared/ui/forms";

export type PendingMovement = { payload: MovementInput; ingredient: Ingredient };
export const pendingKey = (user: string, cafe: string, branch: string) => `cafe:pending-movement:${user}:${cafe}:${branch}`;
export function readPending(key: string): PendingMovement | null {
  try {
    const text = sessionStorage.getItem(key);
    if (!text) return null;
    const value = JSON.parse(text) as PendingMovement;
    const payload = value.payload;
    if (!payload || !value.ingredient || typeof payload.request_id !== "string" || typeof payload.quantity !== "string" || typeof payload.reason !== "string" || typeof value.ingredient.name !== "string" || payload.ingredient !== value.ingredient.id || !["g", "ml", "piece"].includes(value.ingredient.base_unit) || !["receipt", "waste", "adjustment_in", "adjustment_out"].includes(payload.kind) || !["g", "kg", "ml", "l", "piece"].includes(payload.unit)) return null;
    if (inventoryQuantityError(payload.quantity, payload.unit)) return null;
    if ((payload.kind === "receipt" || payload.kind === "adjustment_in") && (typeof payload.total_cost !== "string" || decimalError(payload.total_cost, 6))) return null;
    return value;
  } catch { return null; }
}
export function writePending(key: string, value: PendingMovement) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new UserFacingError("مرورگر امکان حفظ شناسه ثبت را ندارد؛ دسترسی ذخیره‌سازی را فعال و دوباره تلاش کنید. عملیاتی ارسال نشد."); }
}
export function clearPending(key: string) { sessionStorage.removeItem(key); }
