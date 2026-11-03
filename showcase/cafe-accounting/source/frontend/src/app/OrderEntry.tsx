import { FormEvent, useCallback, useRef, useState } from "react";
import { api, ApiError, Branch, CheckoutInput, DiningTable, MenuCategory, MenuItem, OrderingCustomer } from "../shared/api";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { Modal } from "../shared/ui/Modal";
import { Notice, ResourceState, SelectField } from "../shared/ui/controls";
import { fieldErrors, serverError } from "../shared/ui/forms";
import { useUnsavedChanges } from "../shared/ui/navigation";
import { useResource } from "../shared/ui/useResource";

import { OrderingCustomerFields } from "./OrderingCustomerFields";
import { clearEditedCustomerErrors, emptyOrderingCustomer, normalizeContact, orderingCustomerErrors, orderingTableLabel } from "../shared/orderingCustomer";
import { CartLine as Line, OrderMenu, OrderQuantity } from "./OrderMenu";
type Pending = { payload: CheckoutInput; lines: Line[] };
const money = (n: number) => `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;
function readPending(key: string): Pending | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Pending | null;
    if (!value || !Array.isArray(value.lines) || !Array.isArray(value.payload?.items) || typeof value.payload.request_id !== "string" || value.payload.items.length !== value.lines.length || !value.lines.length) return null;
    if (value.payload.customer_details && (typeof value.payload.customer_details.last_name !== "string" || typeof value.payload.customer_details.phone !== "string")) return null;
    if (value.lines.some((line, index) => typeof line.id !== "string" || typeof line.name !== "string" || !Number.isSafeInteger(line.price) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || value.payload.items[index].menu_item !== line.id || value.payload.items[index].quantity !== line.quantity || value.payload.items[index].unit_price !== line.price)) return null;
    return value;
  } catch { return null; }
}

export function OrderEntry({ branch: activeBranch, cafeId }: { branch?: Branch; cafeId: string }) {
  const loader = useCallback(async () => {
    const [branches, categories, items, identity] = await Promise.all([activeBranch ? Promise.resolve([activeBranch]) : api.branches(cafeId), api.categories(cafeId), api.items(cafeId), api.currentUser()]);
    return { branches, categories, items, identity };
  }, [activeBranch, cafeId]);
  const resource = useResource(`${cafeId}:order-entry`, loader);
  const branch = resource.data?.branches[0];
  return <section className="order-entry"><header className="panel order-entry-heading section-heading"><div><h2>ثبت سفارش</h2></div></header>
    <ResourceState {...resource} retry={resource.reload} empty={!branch} emptyTitle="شعبه‌ای برای ثبت سفارش وجود ندارد">
      {branch && resource.data && <OrderCatalog key={`${cafeId}:${branch.id}:${resource.data.identity.id}`} cafeId={cafeId} branch={branch} categories={resource.data.categories} initialItems={resource.data.items} userId={resource.data.identity.id} />}
    </ResourceState>
  </section>;
}
function OrderCatalog({ cafeId, branch, categories, initialItems, userId }: { cafeId: string; branch: Branch; categories: MenuCategory[]; initialItems: MenuItem[]; userId: string }) {
  const key = `cafe:pending-checkout:${userId}:${cafeId}:${branch.id}`;
  const [initial] = useState(() => readPending(key));
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);
  const [pending, setPending] = useState<CheckoutInput | null>(initial?.payload ?? null);
  const [items, setItems] = useState(initialItems);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [destinations, setDestinations] = useState<{ status: "loading" | "ready" | "error"; data?: { tables: DiningTable[]; occupied: (string | null)[] } }>({ status: "loading" });
  const [cartOpen, setCartOpen] = useState(!!initial); const [destination, setDestination] = useState(initial?.payload.table ?? "takeaway");
  const [customerReady, setCustomerReady] = useState(true);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customer, setCustomer] = useState<OrderingCustomer>(initial?.payload.customer_details ?? emptyOrderingCustomer);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const customerForm = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const frozen = busy || preparing || !!pending;
  useUnsavedChanges(lines.length > 0, frozen);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  function quantity(item: MenuItem | Line, next: number) {
    if (frozen || next > 100) return;
    setLines((current) => next <= 0 ? current.filter((line) => line.id !== item.id) : current.some((line) => line.id === item.id) ? current.map((line) => line.id === item.id ? { ...line, quantity: next } : line) : [...current, { id: item.id, name: item.name, price: item.price, quantity: next }]);
    setNotice(""); setError("");
  }
  function stepper(item: MenuItem | Line, n: number) {
    return <OrderQuantity name={item.name} value={n} disabled={frozen} onChange={(next) => quantity(item, next)} />;
  }
  async function prepareCart() {
    if (pending) return true;
    setPreparing(true); setError("");
    try {
      const [nextItems, nextCategories, tables, orders] = await Promise.all([api.items(cafeId), api.categories(cafeId), api.tables(branch.id), api.openOrders(branch.id)]);
      setItems(nextItems); setAvailableCategories(nextCategories);
      setLines((current) => current.map((line) => { const fresh = nextItems.find((item) => item.id === line.id); return fresh ? { ...line, price: fresh.price, name: fresh.name } : line; }));
      setDestinations({ status: "ready", data: { tables, occupied: orders.map((order) => order.table) } });
      return true;
    } catch { setDestinations({ status: "error" }); setError("دریافت اطلاعات تازه انجام نشد؛ دوباره سبد را باز کنید."); return false; }
    finally { setPreparing(false); }
  }
  async function openCart() { if (busy || preparing) return; if (await prepareCart()) setCartOpen(true); }
  async function beginCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) void submit(event);
    else if (await prepareCart()) { setCustomerErrors({}); setError(""); setCustomerOpen(true); }
  }
  async function submit(event?: FormEvent<HTMLFormElement>, skipCustomer = false) {
    event?.preventDefault();
    const details = skipCustomer ? emptyOrderingCustomer : customer;
    const errors = pending ? {} : orderingCustomerErrors(details, false);
    setCustomerErrors(errors);
    if (Object.keys(errors).length) { (customerForm.current?.elements.namedItem(Object.keys(errors)[0]) as HTMLElement | null)?.focus(); return; }
    if (locked.current || !lines.length) return;
    locked.current = true; setBusy(true); setError("");
    const payload = pending ?? { request_id: crypto.randomUUID(), table: destination === "takeaway" ? null : destination, ...(!skipCustomer && (details.last_name.trim() || details.phone.trim()) ? { customer_details: { last_name: details.last_name.trim(), phone: normalizeContact(details.phone) } } : {}), items: lines.map((line) => ({ menu_item: line.id, quantity: line.quantity, unit_price: line.price })) };
    try {
      try { sessionStorage.setItem(key, JSON.stringify({ payload, lines })); } catch { throw new Error("STORAGE_UNAVAILABLE"); }
      setPending(payload);
      const order = await api.checkout(branch.id, payload);
      sessionStorage.removeItem(key); setPending(null); setLines([]); setCartOpen(false); setCustomerOpen(false); setCustomer(emptyOrderingCustomer); setDestination("takeaway");
      setNotice(`سفارش ${orderingTableLabel(order.table_label)} ثبت شد؛ برای مدیریت و تسویه به سفارش‌های باز بروید.`);

    } catch (failure) {
      if (failure instanceof ApiError && failure.status < 500) { sessionStorage.removeItem(key); setPending(null); setError(fieldErrors(failure).detail ?? serverError(failure)); }
      else if (failure instanceof Error && failure.message === "STORAGE_UNAVAILABLE") setError("مرورگر امکان حفظ شناسه ثبت را ندارد؛ سفارشی ارسال نشد.");
      else setError("نتیجه ثبت مشخص نیست؛ اطلاعات سبد حفظ شده است. برای جلوگیری از سفارش تکراری، «بررسی ثبت سفارش» را بزنید.");
    } finally { locked.current = false; setBusy(false); }
  }
  const tables: DiningTable[] = destinations.data?.tables ?? [];
  return <>
    <div className="order-entry-toolbar"><strong>انتخاب آیتم‌ها</strong><button type="button" className="button button--primary cart-trigger" disabled={!lines.length || busy || preparing} onClick={() => void openCart()} aria-label={`سبد خرید، ${count} قلم`}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3h2l3 12h11l2-8H6M9 20h.01M18 20h.01"/></svg>سبد خرید <span>{new Intl.NumberFormat("fa-IR").format(count)}</span></button></div>
    {error && !cartOpen && <Notice tone="error">{error}</Notice>}
    {notice && <Notice>{notice}</Notice>}
    {pending && <Notice tone="info">یک ثبت با نتیجه نامشخص دارید؛ سبد را باز و نتیجه همان درخواست را بررسی کنید.</Notice>}
    <OrderMenu categories={availableCategories} items={items} lines={lines} disabled={frozen} onQuantity={quantity} />
    <Modal title="سبد خرید" open={cartOpen} busy={frozen} guardClose={false} onClose={() => setCartOpen(false)}>
      <form className="checkout-form" noValidate onSubmit={(event) => void beginCheckout(event)}>
        <ul className="cart-lines">{lines.map((line) => <li key={line.id}><div><strong>{line.name}</strong><small>{money(line.price * line.quantity)}</small></div>{stepper(line, line.quantity)}<button type="button" disabled={frozen} className="button button--text" onClick={() => quantity(line, 0)}><ActionIcon kind="delete" label={`حذف ${line.name} از سبد`} /></button></li>)}</ul>
        {!lines.length && <p>سبد خرید خالی است؛ برای انتخاب آیتم ادامه دهید.</p>}
        <strong className="cart-total">جمع سبد: {money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0))}</strong>
        <SelectField label="نوع سفارش / شماره میز" name="table" value={destination} disabled={frozen || destinations.status !== "ready"} onChange={(event) => setDestination(event.target.value)}><option value="takeaway">بیرون‌بر</option>{tables.map((table) => { const occupied = destinations.data?.occupied.includes(table.id); return <option key={table.id} value={table.id} disabled={occupied}>{orderingTableLabel(table.label)}{occupied ? " — سفارش باز دارد" : ""}</option>; })}</SelectField>
        {destinations.status === "loading" && <Notice tone="info">در حال دریافت میزهای شعبه…</Notice>}
        {destinations.status === "ready" && !tables.length && <Notice tone="info">میزی در شعبهٔ {branch.name} ثبت نشده است؛ شعبه را بررسی کنید یا از مدیریت میزها میز اضافه کنید.</Notice>}
        {destinations.status === "error" && <Notice tone="error">دریافت میزها انجام نشد؛ دوباره تلاش کنید.</Notice>}
        {error && !customerOpen && <Notice tone="error">{error}</Notice>}
        <div className="modal-footer"><button type="submit" className="button button--primary" disabled={busy || preparing || !lines.length || (!pending && destinations.status !== "ready")}>{preparing ? "در حال دریافت…" : busy ? "در حال ثبت…" : pending ? "بررسی ثبت سفارش" : "ثبت سفارش"}</button><button type="button" className="button button--secondary" disabled={frozen} onClick={() => setCartOpen(false)}>ادامه انتخاب</button></div>
      </form>
    </Modal>
    <Modal title="مشخصات سفارش‌دهنده" open={customerOpen} busy={frozen} guardClose={false} onClose={() => setCustomerOpen(false)}>
      <strong className="cart-total">جمع سفارش: {money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0))}</strong>
      <form ref={customerForm} noValidate onSubmit={(event) => void submit(event)}>
        <OrderingCustomerFields branchId={branch.id} onReadyChange={setCustomerReady} value={customer} onChange={(next) => { setCustomerErrors((current) => clearEditedCustomerErrors(current, customer, next)); setCustomer(next); }} disabled={frozen} errors={customerErrors}/>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="modal-footer customer-modal-actions"><button className="button button--primary icon-action" title={pending ? "بررسی ثبت سفارش" : "ثبت سفارش"} aria-busy={busy} disabled={busy || !customerReady}><ActionIcon kind="confirm" label={pending ? "بررسی ثبت سفارش" : "ثبت سفارش"}/></button><button type="button" className="button button--secondary icon-action" title="ثبت بدون مشخصات" disabled={frozen} onClick={() => void submit(undefined, true)}><ActionIcon kind="skip" label="ثبت بدون مشخصات"/></button><button type="button" className="button button--text icon-action" title="بازگشت به سبد" disabled={frozen} onClick={() => setCustomerOpen(false)}><ActionIcon kind="back" label="بازگشت به سبد"/></button></div>
      </form>
    </Modal>
  </>;
}
