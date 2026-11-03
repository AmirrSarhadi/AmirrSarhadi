import { ActionIcon } from "../shared/ui/ActionIcon";
import { Modal } from "../shared/ui/Modal";
import { FormEvent, useState } from "react";
import { DiningTable } from "../shared/api";

type TableData = { label: string; capacity: number; sort_order: number };
type Props = { prepare?: () => Promise<void>; table: DiningTable; onSave: (data: TableData) => Promise<void>; onDelete: () => Promise<void> };
export function TableEditor({ table, onSave, onDelete, prepare }: Props) {
  const [editing, setEditing] = useState(false); const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function show(edit: boolean) {
    setError("");
    if (prepare) { setSaving(true); try { await prepare(); } catch { setError("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); return; } finally { setSaving(false); } }
    if (edit) setEditing(true); else setConfirmingDelete(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError("");
    try { await onSave({ label: String(data.get("label")).trim(), capacity: Number(data.get("capacity")), sort_order: table.sort_order }); setEditing(false); }
    catch { setError("ویرایش میز انجام نشد. اطلاعات را بررسی کنید."); }
    finally { setSaving(false); }
  }
  async function deactivate() {
    setSaving(true); setError("");
    try { await onDelete(); }
    catch { setError("غیرفعال‌سازی انجام نشد؛ ممکن است این میز سفارش باز داشته باشد."); }
    finally { setSaving(false); }
  }
  return <tr><th scope="row">{table.label}</th><td>{new Intl.NumberFormat("fa-IR").format(table.capacity)} نفر</td><td><div className="table-row-actions"><button type="button" className="button button--text" disabled={saving} onClick={() => void show(true)}><ActionIcon kind="edit" label="ویرایش" /></button><button type="button" className="button button--text" disabled={saving} onClick={() => void show(false)}><ActionIcon kind="delete" label="غیرفعال‌سازی" /></button></div>
    {!editing && !confirmingDelete && error && <span role="alert">{error}</span>}
    <Modal title="ویرایش میز" open={editing} busy={saving} onClose={() => setEditing(false)}><form onSubmit={save}><label>نام یا شماره میز<input name="label" defaultValue={table.label} maxLength={50} required /></label><label>ظرفیت<input name="capacity" type="number" min="1" max="20" defaultValue={table.capacity} required /></label>{error && <p className="alert alert--error" role="alert">{error}</p>}<div className="modal-footer"><button className="button button--primary" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</button><button type="button" className="button button--text" disabled={saving} onClick={() => setEditing(false)}>انصراف</button></div></form></Modal>
    <Modal title="حذف میز" open={confirmingDelete} busy={saving} onClose={() => setConfirmingDelete(false)}><p>میز «{table.label}» غیرفعال شود؟ سوابق سفارش‌ها حفظ می‌شوند.</p>{error && <p className="alert alert--error" role="alert">{error}</p>}<div className="modal-footer"><button type="button" className="button button--danger" disabled={saving} onClick={() => void deactivate()}>تأیید</button><button type="button" className="button button--text" disabled={saving} onClick={() => setConfirmingDelete(false)}>انصراف</button></div></Modal>
  </td></tr>;
}
