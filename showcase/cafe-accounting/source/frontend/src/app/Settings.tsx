import { FormEvent, useState } from "react";
import { Branch } from "../shared/api";
import { ActionButton, Notice, SelectField } from "../shared/ui/controls";
import { Modal } from "../shared/ui/Modal";
import { useUnsavedChanges } from "../shared/ui/navigation";

type Change = { label: string; before: string; after: string };
type Review = { branchId: string; changes: Change[] };

export function Settings({ branches, selectedId, onSave }: { branches: Branch[]; selectedId: string; onSave: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState(selectedId);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const [review, setReview] = useState<Review | null>(null); const [saveError, setSaveError] = useState("");
  const changes: Change[] = draft !== selectedId ? [{ label: "شعبه فعال", before: branches.find((branch) => branch.id === selectedId)?.name ?? (selectedId ? "شعبه غیرفعال یا حذف‌شده" : "انتخاب نشده"), after: branches.find((branch) => branch.id === draft)?.name ?? "انتخاب نشده" }] : [];
  useUnsavedChanges(changes.length > 0, busy);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !changes.length) return;
    if (!branches.some((branch) => branch.id === draft)) { setError("یک شعبه فعال انتخاب کنید."); return; }
    setSaveError(""); setReview({ branchId: draft, changes });
  }
  async function confirm() {
    if (busy || !review) return;
    setBusy(true); setSaveError("");
    try { await onSave(review.branchId); setReview(null); setSaved(true); }
    catch { setSaveError("ذخیره تنظیمات انجام نشد؛ دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  return <div className="settings-page">
    <form noValidate onSubmit={submit}>
      <section className="panel settings-panel"><h2>شعبه فعال</h2>
        {branches.length ? <div className="settings-fields"><SelectField label="شعبه فعال" name="branch" value={draft} disabled={busy || !!review} error={error} onChange={(event) => { setDraft(event.target.value); setSaved(false); setError(""); }}><option value="" disabled>انتخاب شعبه</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</SelectField></div> : <Notice tone="info">شعبه فعالی وجود ندارد؛ از مدیر کافه بخواهید شعبه را ثبت یا فعال کند.</Notice>}
      </section>
      <footer className="panel settings-actions" aria-label="ذخیره همه تنظیمات"><p>{changes.length ? "تغییرات پس از بررسی و تأیید شما ذخیره می‌شوند." : "تغییری برای ذخیره وجود ندارد."}</p><ActionButton type="submit" busy={busy} disabled={!changes.length || !branches.length || !!review}>ذخیره تنظیمات</ActionButton></footer>
      {saved && <Notice>تنظیمات ذخیره شد.</Notice>}
    </form>
    <Modal title="تأیید تغییرات تنظیمات" open={!!review} busy={busy} guardClose={false} onClose={() => setReview(null)}>
      <p>تغییرات زیر را بررسی و برای ذخیره تأیید کنید.</p>
      <dl className="settings-review">{review?.changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd><span>قبلی: {change.before}</span><strong>جدید: {change.after}</strong></dd></div>)}</dl>
      {saveError && <Notice tone="error">{saveError}</Notice>}
      <div className="modal-footer"><ActionButton type="button" busy={busy} onClick={() => void confirm()}>تأیید نهایی و ذخیره</ActionButton><button type="button" className="button button--secondary" disabled={busy} onClick={() => setReview(null)}>بازگشت به ویرایش</button></div>
    </Modal>
  </div>;
}
