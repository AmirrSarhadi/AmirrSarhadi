"use client";
import {useState} from "react";
import {fa} from "@/lib/api";
type Part={title:string;weight:number};
export type CourseCorrectionStudent={id:number;name:string;grade_id:number|null;revision:number;pending_correction:boolean;scores:Record<string,string>;result:string|null};
export function CourseCorrectionRequest({student,components,busy,onSubmit}:{student:CourseCorrectionStudent;components:Part[];busy:boolean;onSubmit:(scores:Record<string,string>,reason:string)=>Promise<void>}){
 const [scores,setScores]=useState({...student.scores});
 return <details className="course-correction-request"><summary><span>{student.name}</span><span className="badge">{student.pending_correction?"منتظر بررسی مدیر":"نمره فعلی: "+fa(Number(student.result))}</span></summary>
 {student.pending_correction?<p className="notice">درخواست اصلاح این نمره ثبت شده است. نتیجه را در بخش «اصلاح نمره» پیگیری کنید.</p>:<form onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);onSubmit(scores,String(form.get("reason")||""))}}><p className="muted">مؤلفه‌های پیشنهادی را وارد کنید. نمره نهایی با ضرایب همین دوره محاسبه می‌شود و پس از تأیید مدیر تغییر می‌کند.</p><div className="form-grid">{components.map((c,i)=><label key={i}>{c.title} پیشنهادی<small>فعلی: {fa(Number(student.scores[String(i)]))} · ضریب {fa(c.weight)}</small><input aria-label={c.title+" پیشنهادی"} type="number" min="0" max="20" step=".01" required inputMode="decimal" value={scores[String(i)]??""} onChange={e=>setScores(s=>({...s,[String(i)]:e.target.value}))}/></label>)}</div><label>دلیل درخواست اصلاح نمره درسی<textarea name="reason" maxLength={2000} required/></label><button className="button small" disabled={busy}>ارسال اصلاح نمره درسی به مدیر</button></form>}</details>;
}
