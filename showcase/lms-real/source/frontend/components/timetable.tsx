"use client";
import {ClassContext} from "@/lib/class-context";
import {useEffect,useState,FormEvent} from "react";
import {CalendarDays,Check,Pencil,Plus,RefreshCw,X} from "lucide-react";
import {api,send,fa} from "@/lib/api";
import {tehranToday} from "./persian-date-picker";
import {FormDialog} from "./ui/form-dialog";
import "@/app/timetable-grid.css";

type ClassOption={id:number;title:string;year:string;year_id?:number;learners:string[]};
type Lesson={period:number;subject:string;teacher:string;state:"planned"|"registered"|"canceled";kind:"regular"|"makeup"};
type Week={start:string;end:string;days:{date:string;lessons:Lesson[]}[];counts:Record<Lesson["state"],number>};
type Grid={version:string;year_id:number;records:{teaching:number;weekday:number;period:number}[];teachings:{id:number;subject:string;teacher:string}[]};
const weekdays=["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه"];
const dayNumbers=[5,6,0,1,2,3];
const yearKey=(row:ClassOption)=>String(row.year_id??row.year);

export function TimetablePanel({role,classContext}:{role:string;classContext?:ClassContext}){
 const office=role==="manager"||role==="deputy";
 const [classes,setClasses]=useState<ClassOption[]>([]),[year,setYear]=useState(""),[selected,setSelected]=useState(classContext?String(classContext.id):""),[week,setWeek]=useState<Week|null>(null);
 const [loading,setLoading]=useState(true),[optionsLoaded,setOptionsLoaded]=useState(false),[error,setError]=useState(""),[reload,setReload]=useState(0),[optionsError,setOptionsError]=useState(""),[editor,setEditor]=useState<"create"|"edit"|null>(null);
 useEffect(()=>{let live=true;setOptionsLoaded(false);setOptionsError("");
  api<{classes:ClassOption[]}>("/timetable/options/").then(d=>{if(live){setClasses(d.classes);const current=d.classes.find(c=>String(c.id)===selected)||d.classes[0];setSelected(String(current?.id||""));setYear(current?yearKey(current):"")}})
  .catch(e=>{if(live)setOptionsError(e.message)}).finally(()=>{if(live)setOptionsLoaded(true)});return()=>{live=false};
 },[reload]);
 useEffect(()=>{let live=true;if(!selected){setWeek(null);setLoading(false);return}
  setLoading(true);setError("");setWeek(null);
  api<Week>("/timetable/?"+new URLSearchParams({classroom:selected,view:"pattern"})).then(d=>{if(live)setWeek(d)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[selected,reload]);
 const years=Array.from(new Map(classes.map(c=>[yearKey(c),c.year])).entries());
 const current=classes.find(c=>String(c.id)===selected);
 const periods=5;
 return <div className="timetable-module">
 {office&&<div className="module-create-toolbar"><button type="button" className="button" disabled={!optionsLoaded||!!optionsError||!classes.length} onClick={()=>setEditor("create")}><Plus size={17}/>ثبت برنامه هفتگی</button></div>}
 <section className="card timetable-controls"><div className="section-title"><h2>{role==="teacher"?"برنامه هفتگی تدریس":"برنامه هفتگی کلاس"}</h2><div className="timetable-grid-actions">{office&&week&&<button type="button" className="button outline small" disabled={loading||!selected} onClick={()=>setEditor("edit")}><Pencil size={16}/>ویرایش برنامه</button>}<button className="button outline small" disabled={loading||!optionsLoaded} onClick={()=>setReload(x=>x+1)}><RefreshCw size={16}/>تازه‌سازی</button></div></div>
 {classes.length>0&&<><div className="timetable-grid-filters"><label>سال تحصیلی<select aria-label="سال تحصیلی برنامه" value={year} onChange={event=>{const value=event.target.value;setYear(value);setSelected(String(classes.find(c=>yearKey(c)===value)?.id||""))}}>{years.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label><label>کلاس<select aria-label="کلاس برنامه" value={selected} onChange={e=>setSelected(e.target.value)}>{classes.filter(c=>yearKey(c)===year).map(c=><option key={c.id} value={c.id}>{c.title}{c.learners.length?" · "+c.learners.join("، "):""}</option>)}</select></label></div>
 {current?.learners.length?<p className="muted">دانش‌آموز: {current.learners.join("، ")}</p>:null}
 </>}
 </section>
 {(optionsError||error)&&<div role="alert" className="error">{optionsError||error}<button className="text-link" onClick={()=>setReload(x=>x+1)}>تلاش دوباره</button></div>}
 {!optionsLoaded||loading?<div role="status" className="card">در حال دریافت برنامه…</div>:!classes.length&&!optionsError?<section className="card empty-state"><CalendarDays/><h3>کلاسی برای نمایش برنامه به حساب شما اختصاص نیافته است.</h3></section>:week&&!optionsError&&<>
 <div className="table-wrap timetable-grid-scroll" tabIndex={0} aria-label="جدول برنامه هفتگی"><table className="timetable-grid"><caption><strong>برنامه هفتگی {current?.title}</strong><span>{current?.year}</span></caption><thead><tr><th scope="col">روز / زنگ</th>{Array.from({length:periods},(_,i)=><th scope="col" key={i}>زنگ {fa(i+1)}</th>)}</tr></thead><tbody>{week.days.slice(0,6).map((day,index)=><tr key={day.date} className={day.date===tehranToday()?"is-today":""}><th scope="row">{weekdays[index]}</th>{Array.from({length:periods},(_,i)=>{const lesson=day.lessons.find(l=>l.period===i+1);return <td key={i}>{lesson?<div className={lesson.state==="canceled"?"timetable-grid-lesson canceled":"timetable-grid-lesson"}><strong>{lesson.subject}</strong><small>{lesson.teacher}</small>{lesson.state!=="planned"&&<span className="badge">{lesson.state==="canceled"?"لغوشده":"جلسه ثبت‌شده"}</span>}{lesson.kind==="makeup"&&<span className="badge">جبرانی</span>}</div>:<span className="timetable-grid-empty">—</span>}</td>})}</tr>)}</tbody></table></div>
 </>}
 {editor&&<TimetableEditor mode={editor} classes={classes} initialClass={selected} close={()=>setEditor(null)} saved={(classroom)=>{const row=classes.find(c=>String(c.id)===classroom);setSelected(classroom);if(row)setYear(yearKey(row));setEditor(null);setReload(x=>x+1)}}/>}
 </div>;
}

function TimetableEditor({mode,classes,initialClass,close,saved}:{mode:"create"|"edit";classes:ClassOption[];initialClass:string;close:()=>void;saved:(classroom:string)=>void}){
 const initial=classes.find(c=>String(c.id)===initialClass);
 const [year,setYear]=useState(mode==="edit"&&initial?yearKey(initial):""),[classroom,setClassroom]=useState(mode==="edit"?initialClass:""),[grid,setGrid]=useState<Grid|null>(null),[values,setValues]=useState<Record<string,string>>({}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
 const columns=5;
 const years=Array.from(new Map(classes.map(c=>[yearKey(c),c.year])).entries());
 useEffect(()=>{let live=true;setGrid(null);setError("");setValues({});if(!classroom){setLoading(false);return}setLoading(true);
  api<Grid>("/timetable/grid/?"+new URLSearchParams({classroom})).then(result=>{if(!live)return;setGrid(result);setValues(mode==="edit"?Object.fromEntries(result.records.filter(row=>dayNumbers.includes(row.weekday)&&row.period>=1&&row.period<=5).map(row=>[`${row.weekday}-${row.period}`,String(row.teaching)])):{})})
  .catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false};
 },[classroom,mode,revision]);
 async function submit(event:FormEvent){event.preventDefault();if(busy||!grid)return;setError("");const records=Object.entries(values).filter(([,value])=>value).map(([key,value])=>{const [weekday,period]=key.split("-").map(Number);return {teaching:Number(value),weekday,period}});if(mode==="create"&&!records.length){setError("حداقل یک درس برای برنامه انتخاب کنید.");return}setBusy(true);try{await send("/timetable/grid/",{classroom:Number(classroom),mode,expected_version:grid.version,records});saved(classroom)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <FormDialog title={mode==="edit"?"ویرایش برنامه هفتگی":"ثبت برنامه هفتگی"} busy={busy} close={close}><form className="timetable-editor" onSubmit={submit} noValidate><div className="timetable-editor-actions"><button type="submit" className="button small" disabled={busy||loading||!grid}><Check size={20}/>{mode==="edit"?"تأیید تغییرات":"ثبت برنامه"}</button><button type="button" className="button outline small" disabled={busy} onClick={close}><X size={20}/>انصراف</button></div>{error&&<div className="error" role="alert">{error}{!grid&&classroom&&<button type="button" className="text-link" onClick={()=>setRevision(v=>v+1)}>تلاش دوباره</button>}</div>}<fieldset disabled={busy} className="workflow-fields"><div className="timetable-grid-filters"><label>سال تحصیلی<select aria-label="سال تحصیلی ثبت برنامه" value={year} disabled={mode==="edit"} onChange={event=>{setYear(event.target.value);setClassroom("")}}><option value="">انتخاب سال تحصیلی</option>{years.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label><label>کلاس<select aria-label="کلاس ثبت برنامه" value={classroom} disabled={!year||mode==="edit"} onChange={event=>setClassroom(event.target.value)}><option value="">انتخاب کلاس</option>{classes.filter(c=>yearKey(c)===year).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label></div>
 {loading?<p role="status">در حال دریافت درس‌های کلاس…</p>:grid&&<>{!grid.teachings.length&&<p className="notice">درسی برای این کلاس ثبت نشده است.</p>}<div className="table-wrap timetable-grid-scroll" tabIndex={0} aria-label="جدول ثبت برنامه"><table className="timetable-grid timetable-grid-entry"><caption>برنامه هفتگی · {classes.find(c=>String(c.id)===classroom)?.title}</caption><thead><tr><th scope="col">روز / زنگ</th>{Array.from({length:columns},(_,i)=><th scope="col" key={i}>زنگ {fa(i+1)}</th>)}</tr></thead><tbody>{weekdays.map((label,index)=><tr key={label}><th scope="row">{label}</th>{Array.from({length:columns},(_,i)=>{const key=`${dayNumbers[index]}-${i+1}`;const value=values[key]||"";return <td key={key}><select aria-label={`${label} زنگ ${fa(i+1)}`} value={value} onChange={event=>setValues(old=>({...old,[key]:event.target.value}))}><option value="">بدون درس</option>{value&&!grid.teachings.some(t=>String(t.id)===value)&&<option value={value}>درس غیرفعال؛ انتخاب مجدد</option>}{grid.teachings.map(t=><option key={t.id} value={t.id}>{t.subject} · {t.teacher}</option>)}</select></td>})}</tr>)}</tbody></table></div></>}
 </fieldset></form></FormDialog>;
}
