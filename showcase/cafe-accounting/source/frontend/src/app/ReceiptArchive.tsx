import { FormEvent, useCallback, useEffect, useState } from "react";

import { Modal } from "../shared/ui/Modal";
import { api, Branch, OpenOrder, ReceiptArchive as Archive } from "../shared/api";

const money = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value)) : "—";

export function ReceiptArchive({ branch: activeBranch, cafeId }: { branch?: Branch; cafeId: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [archive, setArchive] = useState<Archive | null>(null);
  const [selected, setSelected] = useState<OpenOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (branch: string, query = "", selectedDate = "") => {
    setState("loading"); setSelected(null);
    try { setArchive(await api.receipts(branch, query, selectedDate)); setState("ready"); }
    catch { setState("error"); }
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
    return () => { active = false; };
  }, [activeBranch, cafeId, load]);

  function submit(event: FormEvent) { event.preventDefault(); if (branchId) void load(branchId, search.trim(), date); }

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای آرشیو وجود ندارد</h2></section>;
  return <section className="receipt-archive">
    <header className="panel receipt-archive__header section-heading"><div><h2>آرشیو صورتحساب‌ها</h2></div></header>
    <form className="panel receipt-archive__controls no-print" onSubmit={submit}><label htmlFor="receiptSearch">جست‌وجو<input id="receiptSearch" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="شماره رسید، مشتری، موبایل یا میز"/></label><label htmlFor="receiptDate">تاریخ تسویه<input id="receiptDate" type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><button className="button button--primary" disabled={state === "loading"}>نمایش صورتحساب‌ها</button><button className="button button--text" type="button" onClick={() => { setSearch(""); setDate(""); if (branchId) void load(branchId); }}>پاک‌کردن فیلتر</button></form>
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال دریافت صورتحساب‌ها…</div>}
    {state === "error" && <div className="alert alert--error" role="alert">دریافت آرشیو ممکن نشد.<button className="button button--text" onClick={() => void load(branchId, search, date)}>تلاش دوباره</button></div>}
    {state === "ready" && archive && <div className="receipt-archive__layout"><section className="panel receipt-archive__results no-print" aria-labelledby="receipt-results-title"><div className="panel__heading"><div><h3 id="receipt-results-title">نتایج</h3><span>{new Intl.NumberFormat("fa-IR").format(archive.count)} صورتحساب · حداکثر ۵۰ نتیجه</span></div></div>{archive.results.length ? <div className="receipt-archive__cards">{archive.results.map((receipt) => <article key={receipt.id} className={selected?.id === receipt.id ? "receipt-summary receipt-summary--selected" : "receipt-summary"}><div><strong>{receipt.table_label} · {receipt.customer_name || "مهمان"}</strong><small dir="ltr">{receipt.receipt_number}</small></div><span>{dateTime(receipt.closed_at)}</span><b>{money(receipt.total)}</b><button className="button button--secondary" type="button" onClick={() => setSelected(receipt)}>مشاهده رسید</button></article>)}</div> : <div className="empty-state"><h3>صورتحسابی پیدا نشد</h3><p>فیلترها را تغییر دهید یا شماره رسید را کامل وارد کنید.</p></div>}</section>
      </div>}
    {selected && <Modal title="صورتحساب آرشیوی" open guardClose={false} onClose={() => setSelected(null)}><article className="panel receipt receipt-archive__detail" aria-labelledby="archived-receipt-title"><div><span>نسخه آرشیوی صورتحساب</span><h2 id="archived-receipt-title">{selected.table_label} · {selected.customer_name || "مهمان"}</h2><small className="receipt-number">شماره صورتحساب: <bdi>{selected.receipt_number}</bdi></small><p>{dateTime(selected.closed_at)}</p></div><ul>{selected.items.map((item) => <li key={item.id}><span>{item.item_name} × {new Intl.NumberFormat("fa-IR").format(item.quantity)}</span><b>{money(item.line_total)}</b></li>)}</ul><div className="receipt-archive__payments"><h3>پرداخت‌ها</h3>{selected.payments.map((payment) => <div key={payment.id}><span>{payment.method_label}{payment.reference ? ` · ${payment.reference}` : ""}</span><b>{money(payment.amount)}</b></div>)}</div><div className="receipt__total"><span>جمع پرداخت‌شده</span><strong>{money(selected.total)}</strong></div><button className="button button--primary no-print" type="button" onClick={() => window.print()}>چاپ مجدد صورتحساب</button></article></Modal>}
  </section>;
}
