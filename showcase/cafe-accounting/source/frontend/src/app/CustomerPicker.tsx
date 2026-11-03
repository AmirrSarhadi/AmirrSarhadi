import { useEffect, useState } from "react";

import { api, Customer } from "../shared/api";

export function CustomerPicker({ branchId, customers, selectedId, onSelect }: {
  branchId: string;
  customers: Customer[];
  selectedId: string;
  onSelect: (customerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const [retry, setRetry] = useState(0);
  const shouldSearch = query.trim().length >= 2;
  const displayedCustomers = shouldSearch ? results : customers;

  useEffect(() => {
    if (!shouldSearch) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void api.customers(branchId, query.trim()).then((next) => {
        if (active) { setResults(next); setStatus("ready"); }
      }).catch(() => { if (active) setStatus("error"); });
    }, 300);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [branchId, query, retry, shouldSearch]);

  return <section className="customer-picker" aria-labelledby="customer-picker-title">
    <div className="customer-picker__heading"><div><h3 id="customer-picker-title">انتخاب مشتری</h3><p>با نام خانوادگی یا موبایل جست‌وجو کنید.</p></div><button type="button" className={!selectedId ? "customer-choice customer-choice--selected" : "customer-choice"} aria-pressed={!selectedId} onClick={() => onSelect("")}>مهمان</button></div>
    <label htmlFor="customerSearch">جست‌وجوی مشتری</label>
    <input id="customerSearch" type="search" inputMode="search" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setStatus(event.target.value.trim().length >= 2 ? "loading" : "ready"); }} placeholder="مثلاً احمدی یا ۰۹۱۲"/>
    <div className="customer-picker__results" aria-live="polite" aria-busy={status === "loading"}>
      {status === "loading" ? <p>در حال جست‌وجو…</p> : status === "error" ? <p className="customer-picker__message">جست‌وجو انجام نشد.<button type="button" className="button button--text" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>تلاش دوباره</button></p> : displayedCustomers.length ? displayedCustomers.map((customer) => <button key={customer.id} type="button" className={selectedId === customer.id ? "customer-choice customer-choice--selected" : "customer-choice"} aria-pressed={selectedId === customer.id} onClick={() => onSelect(customer.id)}><strong>{customer.full_name}</strong><span>{customer.phone || "بدون شماره موبایل"}</span></button>) : <p className="customer-picker__message">مشتری پیدا نشد؛ از فرم زیر مشتری جدید ثبت کنید.</p>}
    </div>
  </section>;
}
