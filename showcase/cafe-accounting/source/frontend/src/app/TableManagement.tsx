import { CreateDialog } from "../shared/ui/CreateDialog";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, Branch, DiningTable } from "../shared/api";
import { TableEditor } from "./TableEditor";


type Props = { branch?: Branch; cafeId: string; canManage: boolean };

export function TableManagement({ branch: activeBranch, cafeId, canManage }: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");

  const loadTables = useCallback(async (selectedBranchId: string) => {
    setTables(await api.tables(selectedBranchId));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextBranches = activeBranch ? [activeBranch] : await api.branches(cafeId);
        if (!active) return;
        setBranches(nextBranches);
        const selectedId = nextBranches[0]?.id ?? "";
        setBranchId(selectedId);
        if (selectedId) await loadTables(selectedId);
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      }
    })();
    return () => { active = false; };
  }, [activeBranch, cafeId, loadTables]);

  async function submitTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice("");
    try {
      const table = await api.createTable(branchId, {
        label: String(data.get("tableLabel")).trim(),
        capacity: Number(data.get("capacity")),
      });
      setTables((current) => [...current, table]);
      form.reset();
      setNotice("میز با موفقیت افزوده شد.");
    } catch { setNotice("ثبت میز انجام نشد. نام و ظرفیت را بررسی کنید."); }
  }

  async function updateTable(tableId: string, data: { label: string; capacity: number; sort_order: number }) {
    const updated = await api.updateTable(branchId, tableId, data);
    setTables((current) => current.map((table) => table.id === tableId ? updated : table).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "fa")));
    setNotice("اطلاعات میز با موفقیت به‌روزرسانی شد.");
  }

  async function deleteTable(tableId: string) {
    await api.deleteTable(branchId, tableId);
    setTables((current) => current.filter((table) => table.id !== tableId));
    setNotice("میز با موفقیت غیرفعال شد.");
  }

  if (state === "loading") return <section className="panel table-state" aria-busy="true">در حال دریافت میزها…</section>;
  if (state === "error") return <section className="alert alert--error" role="alert">دریافت اطلاعات میزها ممکن نشد.</section>;
  if (!branches.length) return <section className="empty-state"><h2>شعبه‌ای ثبت نشده است</h2><p>برای تعریف میز، ابتدا یک شعبه فعال برای کافه ایجاد کنید.</p></section>;

  return <section className="panel tables-panel" aria-labelledby="tables-title">
    <div className="tables-toolbar"><div><h2 id="tables-title">چیدمان میزها</h2></div>
      <div className="panel-header-actions">          {canManage && <CreateDialog prepare={() => loadTables(branchId)} title="میز جدید" trigger="افزودن" notice={notice}><form className="table-form" onSubmit={submitTable}><h3>افزودن میز</h3><label htmlFor="tableLabel">نام یا شماره میز</label><input id="tableLabel" name="tableLabel" maxLength={50} required placeholder="مثلاً میز ۱۲"/><label htmlFor="capacity">ظرفیت</label><input id="capacity" name="capacity" type="number" min="1" max="20" defaultValue="2" required/><button className="button button--primary" type="submit">ثبت میز</button></form></CreateDialog>}</div></div>
    {notice && <p className={notice.startsWith("ثبت") ? "alert alert--error" : "alert alert--success"} role={notice.startsWith("ثبت") ? "alert" : "status"}>{notice}</p>}
    {tables.length ? <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="جدول میزها"><table className="managed-tables"><thead><tr><th scope="col">شماره میز</th><th scope="col">ظرفیت</th><th scope="col">عملیات</th></tr></thead><tbody>{tables.map((table) => canManage ? <TableEditor prepare={() => loadTables(branchId)} key={table.id} table={table} onSave={(data) => updateTable(table.id, data)} onDelete={() => deleteTable(table.id)} /> : <tr key={table.id}><th scope="row">{table.label}</th><td>{new Intl.NumberFormat("fa-IR").format(table.capacity)} نفر</td><td>فقط مشاهده</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>هنوز میزی تعریف نشده است</h3><p>از دکمه افزودن در بالای این بخش استفاده کنید.</p></div>}

  </section>;
}
