import { AvailabilityLabel } from "../shared/ui/AvailabilityLabel";
import { FormEvent, useState } from "react";
import { MenuCategory, MenuItem } from "../shared/api";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { MenuPhotoField } from "../shared/ui/MenuPhotoField";
import { Modal } from "../shared/ui/Modal";
import { useNavigationGuard, useUnsavedChanges } from "../shared/ui/navigation";

type ItemData = { category: string; name: string; price: number; is_available: boolean; image?: File };
export function MenuItemEditor({ item, categories, onSave, onDelete, prepare }: { prepare?: () => Promise<void>; item: MenuItem; categories: MenuCategory[]; onSave: (data: ItemData) => Promise<void>; onDelete?: () => Promise<void> }) {
  const { run } = useNavigationGuard();
  const [editing, setEditing] = useState(false); const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false); const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"delete" | "availability" | null>(null);
  useUnsavedChanges(editing && dirty, pending);
  async function show(mode: "edit" | "delete" | "availability") {
    setError("");
    if (prepare) { setPending(true); try { await prepare(); } catch { setError("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); return; } finally { setPending(false); } }
    if (mode === "edit") setEditing(true); else setConfirmation(mode);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget); setPending(true); setError("");
    try {
      await onSave({ category: String(data.get("category")), name: String(data.get("name")).trim(), price: Number(data.get("price")), is_available: data.get("available") === "on", ...(data.get("image") instanceof File && (data.get("image") as File).size ? { image: data.get("image") as File } : {}) });
      setDirty(false); setEditing(false);
    } catch { setError("ذخیره تغییرات انجام نشد؛ اطلاعات را بررسی کنید."); }
    finally { setPending(false); }
  }
  async function confirm() {
    if (pending) return; setPending(true); setError("");
    try {
      if (confirmation === "delete") await onDelete?.();
      else await onSave({ category: item.category, name: item.name, price: item.price, is_available: !item.is_available });
      setConfirmation(null);
    } catch { setError("عملیات انجام نشد؛ دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  return <article className="menu-item menu-item--managed">
    {!editing && !confirmation && error && <p role="alert">{error}</p>}
    {item.image_url && <img className="menu-item-photo" src={item.image_url} alt={item.name} loading="lazy" />}
    <div className="menu-item__heading"><div className="menu-item__identity"><span className="menu-item__category">{item.category_name}</span><h3>{item.name}</h3></div><AvailabilityLabel available={item.is_available} /><div className="card-actions"><button type="button" className="button button--text" disabled={pending} onClick={() => void show("edit")}><ActionIcon kind="edit" label="ویرایش آیتم" /></button>{onDelete && <button type="button" className="button button--text" disabled={pending} onClick={() => void show("delete")}><ActionIcon kind="delete" label="حذف آیتم" /></button>}</div></div>
    <div className="menu-item__footer"><strong>{new Intl.NumberFormat("fa-IR").format(item.price)} تومان</strong><button type="button" className="availability-toggle" disabled={pending} onClick={() => void show("availability")}>{item.is_available ? "ناموجود کردن" : "موجود کردن"}</button></div>
    <Modal title="ویرایش آیتم" open={editing} busy={pending} onClose={() => { setEditing(false); setDirty(false); }}>
      <form className="menu-item-edit" onChange={() => setDirty(true)} onSubmit={submit}><fieldset className="menu-item-edit__fields" disabled={pending}>
        <MenuPhotoField current={item.image_url} />
        <label>نام<input name="name" defaultValue={item.name} maxLength={120} required /></label>
        <label>دسته‌بندی<select name="category" defaultValue={item.category}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>قیمت (تومان)<input name="price" type="number" min="1" step="1" defaultValue={item.price} required /></label>
        <label className="confirm-check"><input name="available" type="checkbox" defaultChecked={item.is_available} />قابل سفارش</label>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        <div className="modal-footer"><button className="button button--primary" disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><button type="button" className="button button--text" disabled={pending} onClick={() => run(() => { setEditing(false); setDirty(false); })}>انصراف</button></div>
      </fieldset></form>
    </Modal>
    <Modal title={confirmation === "delete" ? "حذف آیتم" : "تغییر وضعیت سفارش‌پذیری"} open={confirmation !== null} busy={pending} onClose={() => setConfirmation(null)}>
      <p>{confirmation === "delete" ? `«${item.name}» از منوی فعال حذف شود؟ سوابق فروش حفظ می‌شوند.` : `«${item.name}» ${item.is_available ? "ناموجود" : "موجود"} شود؟`}</p>
      {error && <p role="alert" className="alert alert--error">{error}</p>}
      <div className="modal-footer"><button type="button" className={confirmation === "delete" ? "button button--danger" : "button button--primary"} disabled={pending} onClick={() => void confirm()}>{pending ? "در حال ثبت…" : "تأیید"}</button><button type="button" className="button button--text" disabled={pending} onClick={() => setConfirmation(null)}>انصراف</button></div>
    </Modal>
  </article>;
}
