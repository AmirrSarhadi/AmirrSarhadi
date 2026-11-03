import { Modal } from "../shared/ui/Modal";
import { CreateDialog } from "../shared/ui/CreateDialog";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { api, Branch, Expense, ExpenseCategory } from "../shared/api";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "supplies", label: "مواد اولیه" }, { value: "salary", label: "حقوق و دستمزد" },
  { value: "rent", label: "اجاره" }, { value: "utilities", label: "آب، برق و گاز" },
  { value: "maintenance", label: "تعمیر و نگهداری" }, { value: "other", label: "سایر" },
];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const monthStart = () => `${today().slice(0, 8)}01`;
const money = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;

export function ExpenseManager({ branch: activeBranch, cafeId }: { branch?: Branch; cafeId: string }) {
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]); const [branchId, setBranchId] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]); const [report, setReport] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [startDate, setStartDate] = useState(monthStart); const [endDate, setEndDate] = useState(today);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading"); const [notice, setNotice] = useState("");
  const visible = useMemo(() => expenses.filter((item) => item.expense_date >= startDate && item.expense_date <= endDate), [expenses, startDate, endDate]);

  const load = useCallback(async (nextBranch: string, start = startDate, end = endDate) => {
    setState("loading"); setNotice("");
    try { const [items, summary] = await Promise.all([api.expenses(nextBranch), api.expenseReport(nextBranch, start, end)]); setExpenses(items); setReport({ total: summary.summary.expense_total, count: summary.summary.expense_count }); setState("ready"); }
    catch { setState("error"); }
  }, [startDate, endDate]);

  /* v8 ignore next -- cleanup race is defensive and requires an unmounted network request */
  useEffect(() => { let active = true; void (async () => { try { const next = activeBranch ? [activeBranch] : await api.branches(cafeId); if (!active) return; setBranches(next); const first = next[0]?.id ?? ""; setBranchId(first); if (first) await load(first); else setState("ready"); } catch { if (active) setState("error"); } })(); return () => { active = false; }; }, [activeBranch, cafeId, load]);

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setState("saving"); try { await api.createExpense(branchId, { category: String(data.get("category")) as ExpenseCategory, amount: Number(data.get("amount")), description: String(data.get("description")).trim(), expense_date: String(data.get("expenseDate")) }); form.reset(); (form.elements.namedItem("expenseDate") as HTMLInputElement).value = today(); await load(branchId); setNotice("هزینه با موفقیت ثبت شد."); } catch { setState("error"); } }
  async function showDelete(item: Expense) {
    setDeleteError("");
    try { const current = await api.expenses(branchId); setExpenses(current); const fresh = current.find((row) => row.id === item.id); if (fresh) setDeletingExpense(fresh); else setNotice("این هزینه دیگر در فهرست نیست."); }
    catch { setNotice("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); }
  }
  async function remove(id: string) { setState("saving"); try { await api.deleteExpense(branchId, id); await load(branchId); setDeletingExpense(null); setNotice("هزینه حذف شد."); } catch { setDeleteError("حذف هزینه انجام نشد؛ دوباره تلاش کنید."); setState("ready"); } }

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای ثبت هزینه وجود ندارد</h2></section>;
  return <section className="expense-dashboard"><header className="panel expense-header section-heading"><div><h2>هزینه‌های شعبه</h2></div><CreateDialog title="هزینه جدید" trigger="افزودن" notice={state === "error" ? "ثبت هزینه انجام نشد؛ دوباره تلاش کنید." : notice}><form className="panel expense-form" onSubmit={submit}><h3>ثبت هزینه جدید</h3><label>دسته‌بندی<select name="category" required>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>مبلغ (تومان)<input name="amount" type="number" min="1" step="1" inputMode="numeric" required /></label><label>تاریخ هزینه<input name="expenseDate" type="date" defaultValue={today()} required /></label><label>شرح<input name="description" maxLength={250} required placeholder="مثلاً خرید شیر روزانه" /></label><button className="button button--primary" disabled={state === "saving"}>{state === "saving" ? "در حال ثبت…" : "ثبت هزینه"}</button></form></CreateDialog></header>
    {notice && <p className="alert alert--success" role="status">{notice}</p>}{state === "error" && <div className="alert alert--error" role="alert">دریافت یا ثبت هزینه انجام نشد.<button className="button button--text" onClick={() => void load(branchId)}>تلاش دوباره</button></div>}
    <div className="expense-grid">
      <div className="expense-list"><div className="panel expense-filter"><div><h3>گزارش هزینه</h3><strong>{money(report.total)}</strong><span>{new Intl.NumberFormat("fa-IR").format(report.count)} ثبت</span></div><label>از<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label>تا<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label><button className="button button--secondary" onClick={() => void load(branchId)}>اعمال بازه</button></div>
      {state === "loading" ? <div className="panel report-state" aria-busy="true">در حال دریافت هزینه‌ها…</div> : visible.length ? <div className="panel table-scroll"><table className="receipt-table expense-table"><caption className="sr-only">هزینه‌های ثبت‌شده</caption><thead><tr><th scope="col">تاریخ</th><th scope="col">دسته</th><th scope="col">شرح</th><th scope="col">مبلغ</th><th scope="col">عملیات</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td data-label="تاریخ">{new Intl.DateTimeFormat("fa-IR").format(new Date(`${item.expense_date}T12:00:00`))}</td><td data-label="دسته">{item.category_label}</td><td data-label="شرح">{item.description}</td><td data-label="مبلغ">{money(item.amount)}</td><td data-label="عملیات"><button className="button button--remove" onClick={() => void showDelete(item)}><ActionIcon kind="delete" label="حذف" /></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>هزینه‌ای در این بازه ثبت نشده است</h3><p>برای ثبت اولین هزینه، دکمه افزودن را بزنید.</p></div>}</div></div>
    <Modal title="حذف هزینه" open={!!deletingExpense} busy={state === "saving"} onClose={() => setDeletingExpense(null)}>
      <p>هزینه «{deletingExpense?.description}» به مبلغ {money(deletingExpense?.amount ?? 0)} حذف شود؟</p>
      {deleteError && <p className="alert alert--error" role="alert">{deleteError}</p>}
      <div className="modal-footer"><button type="button" className="button button--danger" disabled={state === "saving"} onClick={() => deletingExpense && void remove(deletingExpense.id)}>تأیید حذف</button><button type="button" className="button button--text" disabled={state === "saving"} onClick={() => setDeletingExpense(null)}>انصراف</button></div>
    </Modal>
  </section>;
}
