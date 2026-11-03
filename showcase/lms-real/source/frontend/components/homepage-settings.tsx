"use client";

import {FormDialog} from "@/components/ui/form-dialog";
import {confirmAction} from "@/lib/panel-feedback";
import "@/app/public-management.css";
import {useEffect, useState} from "react";
import {Plus, RefreshCw, Save, Trash2} from "lucide-react";
import {api, send} from "@/lib/api";
import {defaultHomepage, HOMEPAGE_KEY, HomepageSettings, persianMonths, readHomepage, safePublicImage, safePublicUrl, validSchoolEvent} from "@/lib/homepage";
import {SCHOOL_TOUR_URL} from "@/lib/public-links";

type SavedContent = {title: string; body: string; revision: string | null};

export function HomepageSettingsEditor() {
  const [open,setOpen]=useState(false),[saved,setSaved]=useState<HomepageSettings|null>(null);
  const [draft, setDraft] = useState<HomepageSettings>(() => structuredClone(defaultHomepage));
  const [revision, setRevision] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const content = await api<Record<string, SavedContent>>("/public/");
      setDraft(readHomepage(content[HOMEPAGE_KEY]?.body));
      setSaved(readHomepage(content[HOMEPAGE_KEY]?.body));
      setRevision(content[HOMEPAGE_KEY]?.revision ?? null); setDirty(false);
    } catch (reason) {setError((reason as Error).message);}
    finally {setLoading(false);}
  }
  useEffect(() => {load();}, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = "";};
    if (dirty) window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function change(next: HomepageSettings) {setDraft(next); setDirty(true); setSuccess(""); setError("");}
  async function refresh(){if(!dirty||await confirmAction("تغییرات واردشده کنار گذاشته و تنظیمات منتشرشده دریافت شود؟"))await load()}
  async function save() {
    if (draft.stats.some(stat => !stat.label.trim() || !Number.isInteger(stat.value) || stat.value < 0 || stat.value > 1_000_000)) {
      setError("برای هر آمار، عنوان و عدد صحیح بین صفر و یک میلیون وارد کنید."); return;
    }
    if (!draft.tour.title.trim() || draft.events.some(event => !validSchoolEvent(event))) {
      setError("عنوان تور و عنوان و تاریخ معتبر هر رویداد را وارد کنید. اسفند حداکثر ۲۹ روز دارد."); return;
    }
    if (draft.tour.url && !safePublicUrl(draft.tour.url)) {
      setError("آدرس تور باید با https:// یا یک / شروع شود."); return;
    }
    if (draft.tour.image && !safePublicImage(draft.tour.image)) {
      setError("مسیر تصویر باید از همین سایت و با یک / شروع شود."); return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      await send("/public/", {key: HOMEPAGE_KEY, title: "آمار، تور مجازی و تقویم صفحه نخست", body: JSON.stringify(draft), revision});
      setOpen(false);setDirty(false);setSaved(structuredClone(draft));
      const content = await api<Record<string, SavedContent>>("/public/");
      setRevision(content[HOMEPAGE_KEY]?.revision ?? null); setDirty(false); setSuccess("تنظیمات صفحه نخست منتشر شد.");
    } catch (reason) {setError((reason as Error).message);}
    finally {setBusy(false);}
  }
  return <section className="card homepage-settings public-management" aria-labelledby="homepage-settings-title"><div className="section-title"><h2 id="homepage-settings-title">آمار، تور مجازی و تقویم صفحه نخست</h2><button className="button small" disabled={loading||!saved} onClick={()=>setOpen(true)}><Plus size={17}/>ثبت تنظیمات صفحه نخست</button><button className="text-link" type="button" disabled={busy || loading} onClick={refresh}><RefreshCw size={16}/>{dirty ? "بازخوانی و کنارگذاشتن تغییرات" : "تازه‌سازی"}</button></div>
    {error && <div className="error" role="alert">{error}</div>}{success && <div className="success" role="status">{success}</div>}
    {loading ? <p role="status">در حال دریافت تنظیمات…</p> : saved&&<><div className="public-ledger" role="region" aria-label="فهرست آمار مدرسه" tabIndex={0}><table><thead><tr><th>عنوان آمار</th><th>تعداد</th></tr></thead><tbody>{saved.stats.map((stat,index)=><tr key={index}><th scope="row">{stat.label}</th><td>{stat.value.toLocaleString("fa-IR")}{stat.suffix}</td></tr>)}{!saved.stats.length&&<tr><td colSpan={2}>آماری ثبت نشده است.</td></tr>}</tbody></table></div><div className="public-ledger" role="region" aria-label="تنظیمات تور مجازی" tabIndex={0}><table><thead><tr><th>عنوان تور</th><th>توضیح</th></tr></thead><tbody><tr><th scope="row">{saved.tour.title}</th><td>{saved.tour.description||"—"}</td></tr></tbody></table></div><div className="public-ledger" role="region" aria-label="فهرست رویدادها" tabIndex={0}><table><thead><tr><th>رویداد</th><th>روز</th><th>ماه</th></tr></thead><tbody>{saved.events.map((event,index)=><tr key={index}><th scope="row">{event.title}</th><td>{event.day.toLocaleString("fa-IR")}</td><td>{persianMonths[event.month-1]}</td></tr>)}{!saved.events.length&&<tr><td colSpan={3}>رویدادی ثبت نشده است.</td></tr>}</tbody></table></div></>}
    {open&&<FormDialog title="ثبت تنظیمات صفحه نخست" busy={busy} close={()=>setOpen(false)}><button className="text-link" type="button" disabled={busy||loading} onClick={refresh}><RefreshCw size={16}/>{dirty?"بازخوانی و کنارگذاشتن تغییرات":"تازه‌سازی"}</button>{error&&<div className="error" role="alert">{error}</div>}<form noValidate onSubmit={event => {event.preventDefault(); save();}}><fieldset disabled={busy || (Boolean(error) && !dirty)}><legend>آمار مدرسه</legend>
      {draft.stats.map((stat, index) => <div className="homepage-settings-row" key={index}><label>عنوان آمار<input aria-label={`عنوان آمار ${index + 1}`} value={stat.label} maxLength={60} onChange={event => change({...draft, stats: draft.stats.map((item, i) => i === index ? {...item, label: event.target.value} : item)})}/></label><label>تعداد<input aria-label={`تعداد آمار ${index + 1}`} type="number" min={0} max={1_000_000} value={Number.isFinite(stat.value) ? stat.value : ""} onChange={event => change({...draft, stats: draft.stats.map((item, i) => i === index ? {...item, value: event.target.valueAsNumber} : item)})}/></label><label>پسوند<input value={stat.suffix} maxLength={4} onChange={event => change({...draft, stats: draft.stats.map((item, i) => i === index ? {...item, suffix: event.target.value} : item)})}/></label><button type="button" className="icon-button" aria-label={`حذف آمار ${index + 1}`} title="حذف آمار" onClick={() => change({...draft, stats: draft.stats.filter((_, i) => i !== index)})}><Trash2 size={18}/></button></div>)}
      <button className="text-link" type="button" disabled={draft.stats.length >= 5} onClick={() => change({...draft, stats: [...draft.stats, {label: "سال سابقه", value: 0, suffix: ""}]})}><Plus size={16}/>افزودن آمار</button>
      <h3>تور مجازی</h3><div className="form-grid"><label>عنوان تور<input value={draft.tour.title} maxLength={120} onChange={event => change({...draft, tour: {...draft.tour, title: event.target.value}})}/></label><label>آدرس تور<input type="url" dir="ltr" value={SCHOOL_TOUR_URL} readOnly/></label></div><label>توضیح تور<textarea rows={2} value={draft.tour.description} maxLength={300} onChange={event => change({...draft, tour: {...draft.tour, description: event.target.value}})}/></label><label>مسیر تصویر بنر<input dir="ltr" value={draft.tour.image} onChange={event => change({...draft, tour: {...draft.tour, image: event.target.value}})}/></label>
      <h3>رویدادهای سال تحصیلی</h3>
      {draft.events.map((event, index) => <div className="homepage-settings-row" key={index}><label>عنوان رویداد<input aria-label={`عنوان رویداد ${index + 1}`} value={event.title} maxLength={120} onChange={input => change({...draft, events: draft.events.map((item, i) => i === index ? {...item, title: input.target.value} : item)})}/></label><label>ماه<select aria-label={`ماه رویداد ${index + 1}`} value={event.month} onChange={input => change({...draft, events: draft.events.map((item, i) => i === index ? {...item, month: Number(input.target.value)} : item)})}>{persianMonths.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select></label><label>روز<input aria-label={`روز رویداد ${index + 1}`} type="number" min={1} max={event.month <= 6 ? 31 : event.month === 12 ? 29 : 30} value={Number.isFinite(event.day) ? event.day : ""} onChange={input => change({...draft, events: draft.events.map((item, i) => i === index ? {...item, day: input.target.valueAsNumber} : item)})}/></label><button type="button" className="icon-button" aria-label={`حذف رویداد ${index + 1}`} title="حذف رویداد" onClick={() => change({...draft, events: draft.events.filter((_, i) => i !== index)})}><Trash2 size={18}/></button></div>)}
      <button className="text-link" type="button" disabled={draft.events.length >= 30} onClick={() => change({...draft, events: [...draft.events, {title: "", month: 7, day: 1}]})}><Plus size={16}/>افزودن رویداد</button><div className="homepage-save"><button className="button" disabled={busy || !dirty}>{busy ? "در حال انتشار…" : <><Save size={17}/>ذخیره و انتشار تنظیمات</>}</button></div>
    </fieldset></form></FormDialog>}
  </section>;
}
