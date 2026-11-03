import { CreateDialog } from "../shared/ui/CreateDialog";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, Branch, CashShift } from "../shared/api";
import { CashShiftHistory } from "./CashShiftHistory";

const money = (value: number | null) => `${new Intl.NumberFormat("fa-IR").format(value ?? 0)} تومان`;
const dateTime = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

export function CashShiftManager({ branch: activeBranch, cafeId, canManage }: { branch?: Branch; cafeId: string; canManage: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [shift, setShift] = useState<CashShift | null>(null);
  const [closedShift, setClosedShift] = useState<CashShift | null>(null);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"current" | "history">("current");

  const loadCurrent = useCallback(async (nextBranchId: string) => {
    setState("loading"); setNotice(""); setClosedShift(null);
    try { setShift((await api.currentCashShift(nextBranchId)).shift); setState("ready"); }
    catch { setState("error"); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = activeBranch ? [activeBranch] : await api.branches(cafeId); if (!active) return;
        setBranches(next); const first = next[0]?.id ?? ""; setBranchId(first);
        if (first) await loadCurrent(first); else setState("ready");
      } catch { if (active) setState("error"); }
    })();
    return () => { active = false; };
  }, [activeBranch, cafeId, loadCurrent]);

  async function open(event: FormEvent) {
    event.preventDefault(); setState("saving"); setNotice("");
    try { setShift(await api.openCashShift(branchId, Number(openingCash))); setNotice("شیفت صندوق با موفقیت باز شد."); setState("ready"); }
    catch { setState("error"); }
  }
  async function close(event: FormEvent) {
    event.preventDefault(); if (!confirmed) { setNotice("برای بستن شیفت، تأیید نهایی را فعال کنید."); return; }
    setState("saving"); setNotice("");
    try { const result = await api.closeCashShift(branchId, Number(closingCash)); setClosedShift(result); setShift(null); setClosingCash(""); setConfirmed(false); setNotice("شیفت بسته شد و مغایرت صندوق محاسبه شد."); setState("ready"); }
    catch { setState("error"); }
  }

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای صندوق وجود ندارد</h2></section>;
  return <section className="cash-shift-dashboard">
    <header className="panel cash-shift-header section-heading"><div><h2>شیفت صندوق</h2></div>    {mode === "current" && state !== "loading" && !shift && !closedShift && <CreateDialog prepare={async () => { const latest = (await api.currentCashShift(branchId)).shift; if (latest) { setShift(latest); throw new Error("SHIFT_ALREADY_OPEN"); } }} title="شیفت جدید" trigger="بازکردن شیفت جدید" notice={state === "error" ? "عملیات صندوق انجام نشد." : notice}><form className="panel shift-form" onSubmit={open}><div><h3>بازکردن شیفت جدید</h3><p>مبلغ نقدی موجود در کشوی صندوق پیش از شروع فروش را وارد کنید.</p></div><label htmlFor="openingCash">موجودی اولیه (تومان)<input id="openingCash" type="number" min="0" step="1" inputMode="numeric" required value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} /></label><button className="button button--primary" disabled={state === "saving"}>{state === "saving" ? "در حال ثبت…" : "بازکردن شیفت"}</button></form></CreateDialog>}</header>
    {canManage && <div className="shift-tabs" aria-label="نمای صندوق"><button type="button" className={mode === "current" ? "shift-tabs__item shift-tabs__item--active" : "shift-tabs__item"} aria-pressed={mode === "current"} onClick={() => setMode("current")}>شیفت جاری</button><button type="button" className={mode === "history" ? "shift-tabs__item shift-tabs__item--active" : "shift-tabs__item"} aria-pressed={mode === "history"} onClick={() => setMode("history")}>تاریخچه و مغایرت‌ها</button></div>}
    {mode === "history" && canManage ? <CashShiftHistory branchId={branchId} /> : <>
    {notice && <p className={notice.includes("تأیید") ? "alert alert--error" : "alert alert--success"} role="status">{notice}</p>}
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال دریافت وضعیت صندوق…</div>}
    {state === "error" && <div className="alert alert--error" role="alert">عملیات صندوق انجام نشد. دسترسی و اطلاعات واردشده را بررسی کنید.<button className="button button--text" onClick={() => void loadCurrent(branchId)}>تلاش دوباره</button></div>}

    {(state === "ready" || state === "saving") && shift && <div className="shift-layout"><section className="panel active-shift"><div className="shift-status"><span>شیفت باز</span><strong>{dateTime(shift.opened_at)}</strong></div><dl><div><dt>موجودی اولیه</dt><dd>{money(shift.opening_cash)}</dd></div><div><dt>بازشده توسط</dt><dd>{shift.opened_by_name}</dd></div></dl></section><form className="panel shift-form shift-form--close" onSubmit={close}><div><h3>بستن شیفت</h3><p>ابتدا وجه نقد کشو را شمارش و مبلغ نهایی را ثبت کنید.</p></div><label htmlFor="closingCash">مبلغ نقد شمارش‌شده (تومان)<input id="closingCash" type="number" min="0" step="1" inputMode="numeric" required value={closingCash} onChange={(event) => setClosingCash(event.target.value)} /></label><label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />مبالغ را بررسی کرده‌ام و بستن شیفت را تأیید می‌کنم.</label><button className="button button--danger" disabled={state === "saving"}>{state === "saving" ? "در حال بستن…" : "بستن و محاسبه مغایرت"}</button></form></div>}
    {closedShift && <section className="panel reconciliation" aria-labelledby="reconciliation-title"><div><span className="eyebrow">نتیجه نهایی</span><h3 id="reconciliation-title">تسویه شیفت صندوق</h3></div><dl><div><dt>فروش نقدی</dt><dd>{money(closedShift.cash_sales)}</dd></div><div><dt>موجودی موردانتظار</dt><dd>{money(closedShift.expected_cash)}</dd></div><div><dt>مبلغ شمارش‌شده</dt><dd>{money(closedShift.closing_cash)}</dd></div><div className={(closedShift.variance ?? 0) === 0 ? "variance variance--zero" : "variance variance--warning"}><dt>مغایرت</dt><dd>{money(closedShift.variance)}</dd></div></dl><button className="button button--secondary" onClick={() => setClosedShift(null)}>شروع شیفت بعدی</button></section>}
    </>}
  </section>;
}
