import { CreateDialog } from "../shared/ui/CreateDialog";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { api, Branch, Customer, OrderingCustomer } from "../shared/api";

import { OrderingCustomerFields } from "./OrderingCustomerFields";
import { emptyOrderingCustomer, normalizeContact, orderingCustomerErrors } from "../shared/orderingCustomer";
import { Pagination } from "../shared/ui/controls";

type Props = { branch?: Branch; cafeId: string; canManage: boolean };

export function CustomerDirectory({ branch: activeBranch, cafeId, canManage }: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1); const [count, setCount] = useState(0);
  const requestId = useRef(0);
  const [draft, setDraft] = useState<OrderingCustomer>(emptyOrderingCustomer);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [customerReady, setCustomerReady] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (selectedBranch: string, search = "", nextPage = 1) => {
    const current = ++requestId.current;
    setState("loading"); setNotice("");
    try { const data = await api.customerDirectory(selectedBranch, search, nextPage); if (current !== requestId.current) return; setCustomers(data.results); setCount(data.count); setPage(nextPage); setAppliedQuery(search); setState("ready"); }
    catch { if (current === requestId.current) setState("error"); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = activeBranch ? [activeBranch] : await api.branches(cafeId); if (!active) return;
        setBranches(next); const first = next[0]?.id ?? ""; setBranchId(first);
        if (first) await load(first); else setState("ready");
      } catch { if (active) setState("error"); }
    })();
    return () => { active = false; requestId.current += 1; };
  }, [activeBranch, cafeId, load]);

  function search(event: FormEvent) { event.preventDefault(); if (branchId) void load(branchId, query.trim()); }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const errors = orderingCustomerErrors(draft, true); setDraftErrors(errors);
    if (Object.keys(errors).length) { (form.elements.namedItem(Object.keys(errors)[0]) as HTMLElement | null)?.focus(); return; }
    try {
      const { customer: existing } = await api.lookupCustomer(branchId, normalizeContact(draft.phone));
      if (!existing) await api.createCustomer(branchId, { first_name: "", last_name: draft.last_name.trim(), phone: normalizeContact(draft.phone) });
      setQuery(""); await load(branchId, "", 1);
      setDraft(emptyOrderingCustomer); form.reset(); setNotice(existing ? "این مشتری قبلاً ثبت شده است." : "مشتری ثبت شد.");
    } catch { setNotice("ثبت مشتری انجام نشد؛ اطلاعات را بررسی کنید."); }
  }

  async function save(customerId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setState("saving"); setNotice("");
    try {
      const updated = await api.updateCustomer(branchId, customerId, { first_name: String(data.get("firstName")).trim(), last_name: String(data.get("lastName")).trim(), phone: String(data.get("phone")).trim(), notes: String(data.get("notes")).trim() });
      setCustomers((current) => current.map((customer) => customer.id === customerId ? updated : customer));
      setEditingId(""); setNotice("اطلاعات مشتری با موفقیت به‌روزرسانی شد."); setState("ready");
    } catch { setNotice("ویرایش مشتری انجام نشد. نام خانوادگی و شماره موبایل را بررسی کنید."); setState("ready"); }
  }

  async function deactivate(customerId: string) {
    setState("saving"); setNotice("");
    try { await api.deleteCustomer(branchId, customerId); await load(branchId, appliedQuery, Math.min(page, Math.max(1, Math.ceil((count - 1) / 25)))); setDeletingId(""); setNotice("مشتری با موفقیت غیرفعال شد."); }
    catch { setDeletingId(""); setNotice("غیرفعال‌سازی انجام نشد؛ ممکن است مشتری سفارش باز داشته باشد."); setState("ready"); }
  }

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای مشتری‌ها وجود ندارد</h2><p>پس از ثبت شعبه، مشتریان کافه در این بخش مدیریت می‌شوند.</p></section>;
  return <section className="customer-directory">
    <header className="panel customer-directory__toolbar section-heading"><div><h2>مشتری‌ها</h2></div><CreateDialog title="مشتری جدید" trigger="افزودن" notice={notice}><form noValidate onSubmit={create}><OrderingCustomerFields branchId={branchId} value={draft} onChange={(next) => { setDraft(next); setDraftErrors({}); }} disabled={false} required errors={draftErrors} onReadyChange={setCustomerReady}/><button className="button button--primary" disabled={!customerReady}>ثبت مشتری</button></form></CreateDialog></header>
    <form className="panel customer-directory__search" onSubmit={search}><label htmlFor="directorySearch">جست‌وجوی مشتری</label><div><input id="directorySearch" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام، نام خانوادگی یا شماره موبایل"/><button className="button button--primary" disabled={state === "loading"}>جست‌وجو</button><button className="button button--text" type="button" onClick={() => { setQuery(""); if (branchId) void load(branchId); }}>نمایش همه</button></div></form>
    {notice && <p className={notice.includes("نشد") ? "alert alert--error" : "alert alert--success"} role={notice.includes("نشد") ? "alert" : "status"}>{notice}</p>}
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال دریافت مشتریان…</div>}
    {state === "error" && <div className="alert alert--error" role="alert">دریافت مشتری‌ها ممکن نشد.<button className="button button--text" onClick={() => void load(branchId, query)}>تلاش دوباره</button></div>}
    {(state === "ready" || state === "saving") && <section className="panel customer-directory__list" aria-labelledby="customer-list-title"><div className="panel__heading"><div><h3 id="customer-list-title">مشتریان فعال</h3><span>{new Intl.NumberFormat("fa-IR").format(count)} مشتری</span></div></div>
      {customers.length ? <div className="customer-directory__grid">{customers.map((customer) => editingId === customer.id ? <form className="customer-profile customer-profile--editing" key={customer.id} onSubmit={(event) => void save(customer.id, event)}><label>نام<input name="firstName" defaultValue={customer.first_name}/></label><label>نام خانوادگی<input name="lastName" defaultValue={customer.last_name} required/></label><label>شماره موبایل<input name="phone" inputMode="tel" defaultValue={customer.phone}/></label><label className="customer-profile__notes">یادداشت<textarea name="notes" maxLength={500} defaultValue={customer.notes}/></label><div className="customer-profile__actions"><button className="button button--primary" disabled={state === "saving"}>ذخیره</button><button className="button button--text" type="button" onClick={() => setEditingId("")}>انصراف</button></div></form> : <article className="customer-profile" key={customer.id}><div><h4>{customer.full_name}</h4><a href={customer.phone ? `tel:${customer.phone}` : undefined}>{customer.phone || "بدون شماره موبایل"}</a></div><p>{customer.notes || "یادداشتی برای این مشتری ثبت نشده است."}</p><div className="customer-profile__actions"><button className="button button--secondary" type="button" onClick={() => setEditingId(customer.id)}><ActionIcon kind="edit" label="ویرایش" /></button>{canManage && (deletingId === customer.id ? <><button className="button button--danger" type="button" disabled={state === "saving"} onClick={() => void deactivate(customer.id)}>تأیید غیرفعال‌سازی</button><button className="button button--text" type="button" onClick={() => setDeletingId("")}>انصراف</button></> : <button className="button button--text" type="button" onClick={() => setDeletingId(customer.id)}><ActionIcon kind="delete" label="غیرفعال‌سازی" /></button>)}</div></article>)}</div> : <div className="empty-state"><h3>مشتری‌ای پیدا نشد</h3><p>عبارت جست‌وجو را تغییر دهید یا مشتری جدید را هنگام ثبت سفارش ایجاد کنید.</p></div>}
    <Pagination count={count} page={page} busy={state === "saving"} onPage={(nextPage) => void load(branchId, appliedQuery, nextPage)}/>
    </section>}
  </section>;
}
