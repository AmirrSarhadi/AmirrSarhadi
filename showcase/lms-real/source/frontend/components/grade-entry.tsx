"use client";

import {ClassContext,classYearMatches} from "@/lib/class-context";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Search, Send } from "lucide-react";
import { api, fa, send } from "@/lib/api";
import {clearFieldError,focusInvalid,showFieldError} from "@/lib/form-errors";

type Period={id:number;year:number;year_title:string;month_label:string;issued:boolean};
type Teaching={id:number;year:number;classroom_id?:number;classroom?:string;subject?:string;label:string};
type Options={teachings:Teaching[]};
type Sheet={version:number;column_count:number;status:string;issued:boolean;students:{id:number;name:string}[]};

export function GradeEntryPanel({classContext}:{classContext?:ClassContext}){
 const [periods,setPeriods]=useState<Period[]>([]),[teachings,setTeachings]=useState<Teaching[]>([]);
 const [period,setPeriod]=useState(""),[classroom,setClassroom]=useState(""),[teaching,setTeaching]=useState("");
 const [sheet,setSheet]=useState<Sheet|null>(null),[scores,setScores]=useState<Record<number,string>>({});
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const selectedPeriod=periods.find(row=>String(row.id)===period);
 const eligible=useMemo(()=>teachings.filter(row=>row.year===selectedPeriod?.year),[teachings,selectedPeriod]);
 const classroomKey=(row:Teaching)=>String(row.classroom_id??`title:${row.classroom??row.label.split(" · ").slice(1).join(" · ")}`);
 const classroomTitle=(row:Teaching)=>row.classroom??(row.label.split(" · ").slice(1).join(" · ")||"کلاس بدون نام");
 const subjectTitle=(row:Teaching)=>row.subject??(row.label.split(" · ")[0]||"درس بدون نام");
 const classes=useMemo(()=>Array.from(new Map(eligible.map(row=>[classroomKey(row),classroomTitle(row)])).entries()),[eligible]);
 const lessons=eligible.filter(row=>classroomKey(row)===classroom);
 useEffect(()=>{Promise.all([api<Period[]>("/monthly-reports/periods/"),api<Options>("/monthly-reports/options/")]).then(([p,o])=>{const periods=p.filter(row=>classYearMatches(row,classContext));setPeriods(periods);setTeachings(classContext?o.teachings.filter(row=>row.classroom_id===classContext.id):o.teachings);setPeriod(String(periods[0]?.id||""))}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{setClassroom(classContext?String(classContext.id):"");setTeaching("");setSheet(null);setScores({})},[period]);
 async function load(){if(!period||!teaching)return;setBusy(true);setError("");setSuccess("");try{const value=await api<Sheet>(`/monthly-reports/periods/${period}/grade-entry/${teaching}/`);setSheet(value);setScores(Object.fromEntries(value.students.map(row=>[row.id,""])))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function submit(form:HTMLFormElement){if(!sheet)return;for(const [index,student] of sheet.students.entries()){const value=(scores[student.id]||"").trim();if(value!=="absent"&&(!/^\d+(?:\.\d{1,2})?$/.test(value)||Number(value)<0||Number(value)>20)){const input=form.elements.namedItem(`records.${index}.score`) as HTMLInputElement;showFieldError(input,`برای ${student.name} نمره‌ای بین صفر تا ۲۰ یا وضعیت غیبت ثبت کنید.`);focusInvalid(input);return}}setBusy(true);setError("");try{await send(`/monthly-reports/periods/${period}/grade-entry/${teaching}/`,{expected_version:sheet.version,records:sheet.students.map(row=>({student:row.id,score:scores[row.id]}))});setSuccess("نمرات ثبت شد و برای تأیید مدیر یا معاون ارسال شد.");setSheet(null);setScores({})}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(loading)return <section className="card empty-state">در حال دریافت دوره‌ها و کلاس‌ها…</section>;
 return <div className="grade-entry-module">
  {error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status"><CheckCircle2 size={18}/>{success}</div>}
  <section className="card grade-entry-hero"><ClipboardList/><div><h2>ثبت نمره</h2><p>یک نوبت نمره برای کلاس ثبت و برای تأیید معاون یا مدیر ارسال کنید.</p></div></section>
  <section className="card"><div className="grade-entry-filters">
   <label>دوره<select aria-label="دوره" value={period} onChange={e=>setPeriod(e.target.value)}><option value="">انتخاب دوره</option>{periods.map(row=><option key={row.id} value={row.id}>{row.month_label} · {row.year_title}{row.issued?" · صادرشده":""}</option>)}</select></label>
   <label>کلاس<select aria-label="کلاس" value={classroom} disabled={!period} onChange={e=>{setClassroom(e.target.value);setTeaching("");setSheet(null)}}><option value="">انتخاب کلاس</option>{classes.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
   <label>درس<select value={teaching} disabled={!classroom} onChange={e=>{setTeaching(e.target.value);setSheet(null)}}><option value="">انتخاب درس</option>{lessons.map(row=><option key={row.id} value={row.id}>{subjectTitle(row)}</option>)}</select></label>
   <button className="button" disabled={busy||!teaching} onClick={load}><Search size={17}/>نمایش لیست</button>
  </div></section>
  {sheet&&<form className="card grade-entry-sheet" noValidate data-persian-validation aria-label="ثبت نمرات دانش‌آموزان" onSubmit={event=>{event.preventDefault();void submit(event.currentTarget)}}><div className="section-title"><div><h2>فهرست دانش‌آموزان</h2><p className="muted">برای هر دانش‌آموز یک نمره وارد کنید یا «غیبت» را بزنید.</p></div><span className="badge">نوبت {fa(sheet.column_count+1)}</span></div>
   <div className="grade-entry-list">{sheet.students.map((student,index)=>{const absent=scores[student.id]==="absent";return <div className="grade-entry-row" key={student.id}><span className="grade-entry-index">{fa(index+1)}</span><strong>{student.name}</strong><input name={`records.${index}.score`} required={!absent} aria-label={`نمره ${student.name}`} type="number" min="0" max="20" step=".01" inputMode="decimal" value={absent?"":scores[student.id]||""} placeholder={absent?"غایب":"نمره از ۲۰"} disabled={busy} onChange={e=>setScores(current=>({...current,[student.id]:e.target.value}))}/><button type="button" className={absent?"score-absence is-active":"score-absence"} aria-pressed={absent} disabled={busy} onClick={event=>{const input=event.currentTarget.parentElement?.querySelector("input");if(input)clearFieldError(input);setScores(current=>({...current,[student.id]:absent?"":"absent"}))}}>غیبت</button></div>})}</div>
   <div className="grade-entry-submit"><span className="muted">پس از ارسال، تا زمان تصمیم مدیر یا معاون قابل تغییر نیست.</span><button className="button" disabled={busy||!sheet.students.length} type="submit"><Send size={17}/>{busy?"در حال ارسال…":"ثبت و ارسال برای تأیید"}</button></div>
  </form>}
 </div>
}
