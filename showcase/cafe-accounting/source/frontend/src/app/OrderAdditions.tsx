import { FormEvent, useCallback, useRef, useState } from "react";
import { api, ApiError, MenuItem, OpenOrder } from "../shared/api";
import { Modal } from "../shared/ui/Modal";
import { Notice, ResourceState } from "../shared/ui/controls";
import { fieldErrors, serverError } from "../shared/ui/forms";
import { useUnsavedChanges } from "../shared/ui/navigation";
import { useResource } from "../shared/ui/useResource";
import { CartLine, OrderMenu } from "./OrderMenu";
import { additionKey, Addition, readAddition } from "./orderAdditionRecovery";
const orderMoney = (n: number) => `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;

export function OrderAdditions({ cafeId, branchId, order, userId, onClose, onSaved }: { cafeId: string; branchId: string; order: OpenOrder; userId: string; onClose: () => void; onSaved: (order: OpenOrder) => void }) {
  const key = additionKey(userId, cafeId, branchId, order.id);
  const [recovery] = useState(() => readAddition(key));
  const [lines, setLines] = useState<CartLine[]>(recovery?.lines ?? []);
  const [pending, setPending] = useState<Addition | null>(recovery?.payload ?? null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const locked = useRef(false);
  const loader = useCallback(async () => {
    const [categories, items] = await Promise.all([api.categories(cafeId), api.items(cafeId)]);
    return { categories, items };
  }, [cafeId]);
  const menu = useResource(`${cafeId}:addition-menu`, loader);
  const frozen = busy || !!pending;
  useUnsavedChanges(lines.length > 0, frozen);
  function quantity(item: MenuItem, next: number) {
    if (frozen || next > 100) return;
    setLines((current) => next <= 0 ? current.filter((line) => line.id !== item.id) : current.some((line) => line.id === item.id) ? current.map((line) => line.id === item.id ? { ...line, quantity: next } : line) : [...current, { id: item.id, name: item.name, price: item.price, quantity: next }]);
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current || !lines.length) return;
    locked.current = true; setBusy(true); setError("");
    const payload = pending ?? { request_id: crypto.randomUUID(), items: lines.map((line) => ({ menu_item: line.id, quantity: line.quantity, unit_price: line.price })) };
    try {
      try { sessionStorage.setItem(key, JSON.stringify({ payload, lines })); } catch { throw new Error("STORAGE_UNAVAILABLE"); }
      setPending(payload);
      const updated = await api.addOrderItems(branchId, order.id, payload);
      sessionStorage.removeItem(key); setPending(null); setLines([]); onSaved(updated); onClose();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status < 500) { sessionStorage.removeItem(key); setPending(null); setError(fieldErrors(failure).detail ?? serverError(failure)); }
      else if (failure instanceof Error && failure.message === "STORAGE_UNAVAILABLE") setError("مرورگر امکان حفظ شناسه ثبت را ندارد؛ سفارشی ارسال نشد.");
      else setError("نتیجه افزودن مشخص نیست؛ برای جلوگیری از تکرار، «بررسی افزودن» را بزنید.");
    } finally { locked.current = false; setBusy(false); }
  }
  return <Modal title={`افزودن به سفارش ${order.table_label}`} open onClose={onClose} busy={frozen}>
    <p className="order-context">آیتم‌ها به همین سفارش افزوده می‌شوند. قیمت اقلام قبلی ثابت می‌ماند.</p>
    <ResourceState {...menu} retry={menu.reload} empty={false} emptyTitle="منو خالی است">
      {menu.data && <OrderMenu categories={menu.data.categories} items={menu.data.items.map((item) => {
        const existing = order.items.find((line) => line.menu_item_id === item.id);
        return existing ? { ...item, name: existing.item_name, price: existing.unit_price } : item;
      })} lines={lines} disabled={frozen} onQuantity={quantity} />}
    </ResourceState>
    <form className="addition-review" noValidate onSubmit={submit}>
      {!!lines.length && <ul className="order-items">{lines.map((line) => <li key={line.id}><span>{line.name} × {new Intl.NumberFormat("fa-IR").format(line.quantity)}</span><b>{orderMoney(line.price * line.quantity)}</b></li>)}</ul>}
      {pending && <Notice tone="info">اطلاعات این درخواست حفظ شده است؛ فقط نتیجه همان افزودن بررسی می‌شود.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="modal-footer"><button className="button button--primary" disabled={busy || !lines.length}>{busy ? "در حال ثبت…" : pending ? "بررسی افزودن" : "افزودن"}</button></div>
    </form>
  </Modal>;
}
