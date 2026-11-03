import { FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { api, Branch, DiningTable, OpenOrder, OrderItem, PaymentInput, OrderingCustomer } from "../shared/api";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { Modal } from "../shared/ui/Modal";
import { ActionButton, Notice, TextField } from "../shared/ui/controls";
import { useFormState } from "../shared/ui/forms";
import { useNavigationGuard, useUnsavedChanges } from "../shared/ui/navigation";
import { SettlementForm } from "./SettlementForm";
import { OrderAdditions } from "./OrderAdditions";
import { additionKey, readAddition } from "./orderAdditionRecovery";

const formatPrice = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
const formatNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase("fa-IR")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replaceAll("ي", "ی").replaceAll("ك", "ک").replaceAll("‌", "").replaceAll(" ", "");

function QuantityForm({ item, busy, onSave }: { item: OrderItem; busy: boolean; onSave: (quantity: number) => Promise<void> }) {
  const [value, setValue] = useState(String(item.quantity));
  const form = useFormState();
  useUnsavedChanges(value !== String(item.quantity), busy);
  return <form noValidate onSubmit={(event) => void form.submit(event, (): Record<string, string> => {
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity >= 1 && quantity <= 100 ? {} : { quantity: "تعداد باید بین ۱ تا ۱۰۰ باشد." };
  }, () => onSave(Number(value)))}>
    <TextField label="تعداد" aria-label={`تعداد ${item.item_name}`} name="quantity" type="number" min="1" max="100" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} error={form.errors.quantity}/>
    <ActionButton type="submit" intent="secondary" busy={busy}>ثبت تعداد</ActionButton>
    {form.error && <Notice tone="error">{form.error}</Notice>}
  </form>;
}

export function OpenOrders({ branch: activeBranch, cafeId, canManage, onNewOrder }: { branch?: Branch; cafeId: string; canManage: boolean; onNewOrder?: () => void }) {
  const { run } = useNavigationGuard();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [userId, setUserId] = useState("");
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [lastReceipt, setLastReceipt] = useState<OpenOrder | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false); const [adding, setAdding] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState("");
  const [orderSearch, setOrderSearch] = useState(""); const search = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(orderSearch);
  const selected = orders.find((order) => order.id === selectedId);
  const filteredOrders = useMemo(() => {
    const query = normalizeSearch(deferredSearch);
    return query ? orders.filter((order) => normalizeSearch(`${order.table_label} ${order.order_type_label} ${order.customer_name ?? ""}`).includes(query)) : orders;
  }, [deferredSearch, orders]);
  const loadBranch = useCallback(async (id: string) => {
    const [nextTables, nextOrders] = await Promise.all([api.tables(id), api.openOrders(id)]);
    return { tables: nextTables, orders: nextOrders };
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextBranches, identity] = await Promise.all([activeBranch ? Promise.resolve([activeBranch]) : api.branches(cafeId), api.currentUser()]);
        const id = nextBranches[0]?.id ?? "";
        const data = id ? await loadBranch(id) : { tables: [], orders: [] };
        if (!active) return;
        setBranches(nextBranches); setBranchId(id); setUserId(identity.id); setTables(data.tables); setOrders(data.orders); setState("ready");
        const recovery = data.orders.find((order) => readAddition(additionKey(identity.id, cafeId, id, order.id)));
        if (recovery) { setSelectedId(recovery.id); setEditing(true); setAdding(true); }
      } catch { if (active) setState("error"); }
    })();
    return () => { active = false; };
  }, [activeBranch, cafeId, loadBranch, revision]);
  async function changeBranch(id: string) {
    setBranchId(id); setState("loading"); setLastReceipt(null); setOrderSearch(""); setSelectedId("");
    try { const data = await loadBranch(id); setTables(data.tables); setOrders(data.orders); setState("ready"); }
    catch { setState("error"); }
  }
  async function showOrder(order: OpenOrder) {
    try {
      const data = await loadBranch(branchId);
      setTables(data.tables); setOrders(data.orders);
      if (!data.orders.some((row) => row.id === order.id)) { setNotice("این سفارش دیگر باز نیست."); return; }
      setSelectedId(order.id); setEditing(false); setAdding(false); setNotice(""); setConfirmDeleteItemId("");
    } catch { setNotice("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); }
  }
  async function editOrder(order: OpenOrder) {
    try {
      const data = await loadBranch(branchId); setTables(data.tables); setOrders(data.orders);
      if (!data.orders.some((row) => row.id === order.id)) { setSelectedId(""); setNotice("این سفارش دیگر باز نیست."); return; }
      setEditing(true); setNotice("");
    } catch { setNotice("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); }
  }
  function replaceOrder(updated: OpenOrder) { setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); }
  function replaceItems(orderId: string, update: (items: OrderItem[]) => OrderItem[]) {
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order;
      const items = update(order.items);
      return { ...order, items, total: items.reduce((sum, item) => sum + item.line_total, 0) };
    }));
  }
  async function mutate(operation: () => Promise<void>, failure: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice("");
    try { await operation(); } catch { setNotice(failure); }
    finally { lock.current = false; setBusy(false); }
  }
  async function updateItem(quantity: number, orderId: string, itemId: string) {
    await mutate(async () => {
      const updated = await api.updateOrderItem(branchId, orderId, itemId, quantity);
      replaceItems(orderId, (items) => items.map((item) => item.id === itemId ? updated : item));
      setNotice("تعداد آیتم به‌روزرسانی شد.");
    }, "ویرایش آیتم انجام نشد؛ تعداد را بررسی کنید.");
  }
  async function deleteItem(orderId: string, itemId: string) {
    await mutate(async () => {
      await api.deleteOrderItem(branchId, orderId, itemId);
      replaceItems(orderId, (items) => items.filter((item) => item.id !== itemId));
      setConfirmDeleteItemId(""); setNotice("آیتم از سفارش حذف شد.");
    }, "حذف آیتم انجام نشد؛ وضعیت سفارش را دوباره بررسی کنید.");
  }
  async function transfer(event: FormEvent<HTMLFormElement>, order: OpenOrder) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if (!data.get("table") || !data.get("confirmed")) { setNotice("انتقال انجام نشد؛ میز مقصد را انتخاب و انتقال را تأیید کنید."); return; }
    await mutate(async () => {
      const updated = await api.transferOrder(branchId, order.id, String(data.get("table")));
      replaceOrder(updated); form.reset(); setNotice(`سفارش با موفقیت به ${updated.table_label} منتقل شد.`);
    }, "انتقال سفارش انجام نشد؛ ممکن است میز مقصد دیگر آزاد نباشد.");
  }
  async function settle(order: OpenOrder, payments: PaymentInput[], customer: OrderingCustomer) {
    await mutate(async () => {
      const receipt = await api.settleOrder(branchId, order.id, payments, customer);
      setOrders((current) => current.filter((item) => item.id !== order.id)); setSelectedId(""); setLastReceipt(receipt); setNotice("تسویه با موفقیت ثبت شد.");
    }, "تسویه انجام نشد؛ مبلغ و وضعیت سفارش را دوباره بررسی کنید.");
  }
  async function cancel(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const reason = String(data.get("reason")).trim();
    if (reason.length < 3 || !data.get("confirmed")) { setNotice("لغو انجام نشد؛ دلیل را وارد و لغو سفارش را تأیید کنید."); return; }
    await mutate(async () => {
      await api.cancelOrder(branchId, orderId, reason);
      setOrders((current) => current.filter((item) => item.id !== orderId)); setSelectedId(""); setEditing(false); setNotice("سفارش لغو شد.");
    }, "لغو سفارش انجام نشد؛ دسترسی و دلیل لغو را بررسی کنید.");
  }
  function clearSearch() { setOrderSearch(""); search.current?.focus(); }
  const feedback = notice && <Notice tone={notice.includes("نشد") ? "error" : "success"}>{notice}</Notice>;
  if (state === "loading") return <section className="panel table-state" aria-busy="true">در حال دریافت سفارش‌ها…</section>;
  if (state === "error") return <section className="alert alert--error" role="alert">دریافت سفارش‌ها ممکن نشد.<button type="button" className="button button--secondary" onClick={() => branches.length ? void changeBranch(branchId) : (setState("loading"), setRevision((value) => value + 1))}>تلاش دوباره</button></section>;
  if (!branches.length) return <section className="empty-state"><h2>شعبه‌ای ثبت نشده است</h2></section>;
  const freeTables = tables.filter((table) => table.id !== selected?.table && !orders.some((order) => order.table === table.id));
  return <section className="open-order-workspace">
    <header className="panel order-tools section-heading"><div className="tables-toolbar"><div><h2>مدیریت سفارش‌های باز</h2></div>{onNewOrder && <button type="button" className="button button--primary" onClick={onNewOrder}>ثبت سفارش جدید</button>}</div></header>
    {!selected && feedback}
    {lastReceipt && <aside className="panel receipt" aria-labelledby="receipt-title"><div><span>صورتحساب نهایی</span><h2 id="receipt-title">{lastReceipt.table_label} · {lastReceipt.customer_name || "مهمان"}</h2><small className="receipt-number">شماره صورتحساب: <bdi>{lastReceipt.receipt_number}</bdi></small></div><ul>{lastReceipt.items.map((item) => <li key={item.id}><span>{item.item_name} × {formatNumber(item.quantity)}</span><b>{formatPrice(item.line_total)}</b></li>)}</ul><div className="receipt__total"><span>مبلغ پرداخت‌شده</span><strong>{formatPrice(lastReceipt.total)}</strong></div><button className="button button--text no-print" type="button" onClick={() => window.print()}>چاپ صورتحساب</button></aside>}
    <section className="panel open-orders"><div className="panel__heading"><div><h2>سفارش‌های باز</h2><span aria-live="polite">{orderSearch ? `${formatNumber(filteredOrders.length)} نتیجه از ${formatNumber(orders.length)} سفارش` : `${formatNumber(orders.length)} سفارش`}</span></div></div>
      {!!orders.length && <div className="order-search"><label htmlFor="openOrderSearch">جست‌وجوی سفارش</label><div><input ref={search} id="openOrderSearch" type="search" autoComplete="off" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="نام مشتری، شماره میز یا بیرون‌بر"/>{orderSearch && <button type="button" className="button button--text" onClick={clearSearch}>پاک‌کردن</button>}</div></div>}
      {filteredOrders.length ? <div className="ui-table-scroll open-order-results" tabIndex={0} role="region" aria-label="جدول سفارش‌های باز"><table className="managed-tables open-order-table"><thead><tr><th scope="col">میز</th><th scope="col">سفارش‌دهنده</th><th scope="col">تسویه</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><th scope="row">{order.table_label}</th><td className="open-order-customer" data-label="سفارش‌دهنده"><span>{order.customer_last_name || order.customer_name?.split(" ").at(-1) || "ثبت نشده"}</span><div className="open-order-card-total"><span>جمع سفارش</span><strong>{formatPrice(order.total)}</strong></div></td><td><button type="button" className="button button--secondary order-settlement-trigger" aria-label={`تسویه سفارش ${order.table_label}`} onClick={() => void showOrder(order)}>تسویه</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>{orders.length ? "سفارشی با این مشخصات پیدا نشد" : "سفارش بازی وجود ندارد"}</h3>{orders.length ? <button type="button" className="button button--secondary" onClick={clearSearch}>نمایش همه سفارش‌ها</button> : <p>از بخش ثبت سفارش، سفارش جدیدی ثبت کنید.</p>}</div>}
    </section>
    {selected && <Modal title={`سفارش ${selected.table_label}`} open onClose={() => setSelectedId("")} busy={busy} guardClose={false}>
      <div className="order-detail"><div className="order-detail-heading"><span>مشتری: {selected.customer_name || "مهمان"}</span><button type="button" className="button button--secondary" onClick={() => void editOrder(selected)} disabled={busy}>ویرایش</button></div>
        {!editing && feedback}
        <ul className="order-items order-detail-lines">{selected.items.map((item) => <li key={item.id}><span>{item.item_name} <small>× {formatNumber(item.quantity)}</small></span><b>{formatPrice(item.line_total)}</b></li>)}</ul>
        {!selected.items.length && <p>سفارش هنوز آیتمی ندارد؛ از ویرایش، آیتم اضافه کنید.</p>}
        <div className="order-card__total"><span>جمع</span><strong>{formatPrice(selected.total)}</strong></div>
        <SettlementForm branchId={branchId} key={selected.id} orderId={selected.id} total={selected.total} disabled={!selected.items.length} pending={busy} customer={{ last_name: selected.customer_last_name ?? selected.customer_name?.split(" ").at(-1) ?? "", phone: selected.customer_phone ?? "" }} onSettle={(payments, customer) => void settle(selected, payments, customer)} />
      </div>
      {editing && <Modal title={`ویرایش سفارش ${selected.table_label}`} open onClose={() => { setEditing(false); setConfirmDeleteItemId(""); }} busy={busy}>
        {!adding && feedback}
        <div className="order-edit-toolbar"><h3>اقلام سفارش</h3><button type="button" className="button button--primary" disabled={busy} onClick={() => { setAdding(true); setNotice(""); }}>افزودن</button></div>
        <ul className="order-items order-edit-lines">{selected.items.map((item) => <li key={item.id}>
          <div className="order-item__summary"><span>{item.item_name}</span><b>{formatPrice(item.line_total)}</b></div>
          <div className="order-item__actions"><QuantityForm key={`${item.id}:${item.quantity}`} item={item} busy={busy} onSave={(quantity) => updateItem(quantity, selected.id, item.id)}/><button type="button" className="button button--remove" disabled={busy} onClick={() => setConfirmDeleteItemId(item.id)}><ActionIcon kind="delete" label={`حذف ${item.item_name}`} /></button></div>
        </li>)}</ul>
        {selected.order_type === "dine_in" && !!freeTables.length && <details className="transfer-order"><summary>انتقال سفارش به میز دیگر</summary><form noValidate onSubmit={(event) => void transfer(event, selected)}><label htmlFor={`transfer-table-${selected.id}`}>میز مقصد</label><select id={`transfer-table-${selected.id}`} name="table" required defaultValue="" disabled={busy}><option value="" disabled>یک میز آزاد انتخاب کنید</option>{freeTables.map((table) => <option key={table.id} value={table.id}>{table.label} · ظرفیت {formatNumber(table.capacity)} نفر</option>)}</select><label className="confirm-check"><input name="confirmed" type="checkbox" required disabled={busy}/> انتقال سفارش و تمام اقلام آن را تأیید می‌کنم.</label><button className="button button--secondary" disabled={busy}>انتقال سفارش</button></form></details>}
        {canManage && <details className="cancel-order"><summary>حذف سفارش</summary><form noValidate onSubmit={(event) => void cancel(event, selected.id)}><p>سفارش لغو می‌شود و سابقهٔ آن حفظ خواهد شد.</p><label htmlFor={`reason-${selected.id}`}>دلیل لغو</label><input id={`reason-${selected.id}`} name="reason" minLength={3} maxLength={500} required disabled={busy}/><label className="confirm-check"><input name="confirmed" type="checkbox" required disabled={busy}/> لغو این سفارش را تأیید می‌کنم</label><button className="button button--danger" disabled={busy}>لغو سفارش</button></form></details>}
        <div className="modal-footer"><button type="button" className="button button--secondary" disabled={busy} onClick={() => run(() => setEditing(false))}>پایان ویرایش</button></div>
        {adding && <OrderAdditions cafeId={cafeId} branchId={branchId} order={selected} userId={userId} onClose={() => setAdding(false)} onSaved={(updated) => { replaceOrder(updated); setNotice("آیتم‌ها به سفارش افزوده شدند."); }} />}
        {confirmDeleteItemId && <Modal title="حذف آیتم" open busy={busy} onClose={() => setConfirmDeleteItemId("")} guardClose={false}><p>{selected.items.find((item) => item.id === confirmDeleteItemId)?.item_name} از سفارش حذف شود؟</p>{feedback}<div className="modal-footer"><button autoFocus type="button" className="button button--secondary" disabled={busy} onClick={() => setConfirmDeleteItemId("")}>انصراف</button><button type="button" className="button button--danger" disabled={busy} onClick={() => void deleteItem(selected.id, confirmDeleteItemId)}>بله، حذف</button></div></Modal>}
      </Modal>}
    </Modal>}
  </section>;
}
