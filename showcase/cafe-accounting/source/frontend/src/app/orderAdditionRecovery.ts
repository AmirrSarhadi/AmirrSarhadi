import { CheckoutInput } from "../shared/api";
import { CartLine } from "./OrderMenu";

export type Addition = Omit<CheckoutInput, "table">;
type Recovery = { payload: Addition; lines: CartLine[] };
export const additionKey = (userId: string, cafeId: string, branchId: string, orderId: string) => `cafe:pending-addition:${userId}:${cafeId}:${branchId}:${orderId}`;
export function readAddition(key: string): Recovery | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Recovery | null;
    if (!value || typeof value.payload?.request_id !== "string" || !Array.isArray(value.payload.items) || !Array.isArray(value.lines) || !value.lines.length || value.lines.length !== value.payload.items.length) return null;
    if (value.lines.some((line, index) => typeof line.id !== "string" || typeof line.name !== "string" || !Number.isSafeInteger(line.price) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || value.payload.items[index].menu_item !== line.id || value.payload.items[index].quantity !== line.quantity || value.payload.items[index].unit_price !== line.price)) return null;
    return value;
  } catch { return null; }
}

