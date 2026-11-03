"use client";
import {BulkArchiveButton,BulkArchiveDialog,SelectionCheckbox,usePageSelection} from "@/components/bulk-archive";
import {ArchiveStudentDialog} from "@/components/archive-student-dialog";
import {Trash2} from "lucide-react";
import {FormEvent,useEffect,useRef,useState} from "react";
import {BookOpen,CalendarDays,ClipboardCheck,FileQuestion,FileText,GraduationCap,MessageCircle,NotebookTabs,Plus,RefreshCw,ShieldAlert,Users,BarChart3,FolderOpen,Search} from "lucide-react";
import {api,fa,send} from "@/lib/api";
import {ClassContext} from "@/lib/class-context";
import type {RegistrationOptions} from "@/lib/registration-options";
import {FormDialog} from "@/components/ui/form-dialog";
import {Pagination} from "@/components/ui/pagination";
import "@/app/my-classes.css";
import "@/app/school-structure.css";
import "@/app/student-roster.css";

export type Classroom=ClassContext&{grade:number;major:string;count:number};
const actions=[
 {tab:"roster",label:"دانش‌آموزان",icon:Users,roles:["manager","deputy","teacher"]},
 {tab:"attendance",label:"ثبت حضور",icon:ClipboardCheck,roles:["manager","deputy","teacher"]},
 {tab:"grade-entry",label:"ثبت نمره",icon:GraduationCap,roles:["teacher","deputy"]},
 {tab:"monthly-reports",label:"کارنامه ماهیانه",icon:NotebookTabs,roles:["manager","deputy","teacher"]},
 {tab:"academic-reports",label:"گزارش آموزشی",icon:BarChart3,roles:["manager","deputy","teacher"]},
 {tab:"attendance-report",label:"گزارش حضور",icon:ClipboardCheck,roles:["manager","deputy","student","family"]},
 {tab:"assignments",label:"تکلیف‌ها",icon:FileText},
 {tab:"exams",label:"آزمون‌ها",icon:FileQuestion},
 {tab:"discipline",label:"موارد انضباطی",icon:ShieldAlert,roles:["manager","deputy","teacher"]},
 {tab:"timetable",label:"برنامه هفتگی",icon:CalendarDays},
 {tab:"communications",label:"گروه‌های کلاسی",icon:MessageCircle},
];
export function MyClasses({classes,role,year,setYear,open,created,allowedSections}:{classes:Classroom[];role:string;year:string;setYear:(value:string)=>void;open:(classroom:Classroom,tab:string)=>void;created:()=>Promise<void>;allowedSections?:string[]}){
 const [creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [registration,setRegistration]=useState<RegistrationOptions|null>(null),[optionsRevision,setOptionsRevision]=useState(0);
 useEffect(()=>{if(!creating)return;let live=true;setRegistration(null);setError("");api<RegistrationOptions>("/data-exchange/options/").then(value=>{if(live)setRegistration(value)}).catch(reason=>{if(live)setError(reason.message)});return()=>{live=false}},[creating,optionsRevision]);
 const years=Array.from(new Set(classes.map(row=>row.year))),shown=classes.filter(row=>!year||row.year===year),office=["manager","deputy"].includes(role);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setError("");try{await send("/classes/",{...values,grade:Number(values.grade)});setYear(String(values.year));setCreating(false);await created()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="my-classes" aria-busy={busy}>{error&&!creating&&<div className="error" role="alert">{error}</div>}<div className="my-classes-toolbar"><label>سال تحصیلی<select aria-label="سال تحصیلی" value={year} onChange={event=>setYear(event.target.value)}><option value="">همه سال‌های تحصیلی</option>{years.map(value=><option key={value} value={value}>{value}</option>)}</select></label><span className="muted">{fa(shown.length)} کلاس</span><button type="button" className="text-link" disabled={busy} onClick={()=>created().catch(e=>setError(e.message))}><RefreshCw size={15}/>تازه‌سازی کلاس‌ها</button>{office&&<button type="button" className="button small" onClick={()=>{setError("");setCreating(true)}}><Plus size={17}/>ساخت کلاس جدید</button>}</div>
 <div className="my-classes-grid">{shown.map(row=><article className="card classroom-card" key={row.id} aria-label={row.title+" · "+row.year}><header><BookOpen size={22}/><span className="badge">{row.year}</span></header><h2>{row.title}</h2><p>{row.major} · {fa(row.count)} دانش‌آموز</p><div className="classroom-actions">{actions.filter(action=>(!action.roles||action.roles.includes(role))&&(!allowedSections||action.tab==="roster"||allowedSections.includes(action.tab))).map(action=><button type="button" className="button outline small" key={action.tab} onClick={()=>open(row,action.tab)}><action.icon size={16}/>{action.label}</button>)}</div></article>)}</div>
 {!shown.length&&<div className="card empty-state">کلاسی در این سال تحصیلی در دسترس نیست.</div>}
 {creating&&office&&<FormDialog title="ساخت کلاس جدید" busy={busy} close={()=>setCreating(false)}><form noValidate data-persian-validation onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return}void submit(event)}}>{error&&<div className="error" role="alert">{error}<button type="button" className="text-link" disabled={busy} onClick={()=>setOptionsRevision(value=>value+1)}>تلاش دوباره</button></div>}{!registration&&!error&&<p role="status">در حال دریافت سال‌های تحصیلی…</p>}{registration&&!registration.years.length&&<p className="notice">ابتدا سال تحصیلی را در ساختار مدرسه ثبت کنید.</p>}<div className="form-grid"><label>نام کلاس<input name="title" required maxLength={100} autoFocus disabled={busy}/></label><label>سال تحصیلی<select key={registration?"ready":"loading"} aria-label="سال تحصیلی" name="year" defaultValue={year||registration?.years[0]?.title||""} required disabled={busy||!registration}><option value="">انتخاب سال تحصیلی</option>{registration?.years.map(row=><option key={row.id} value={row.title}>{row.title}</option>)}</select></label><label>پایه<select name="grade" disabled={busy}><option value="10">دهم</option><option value="11">یازدهم</option><option value="12">دوازدهم</option></select></label><label>رشته<select name="major" disabled={busy}><option value="science">تجربی</option><option value="math">ریاضی‌فیزیک</option></select></label></div><footer><button type="button" className="button outline small" disabled={busy} onClick={()=>setCreating(false)}>انصراف</button><button className="button small" disabled={busy||!registration?.years.length}><Plus size={16}/>ثبت کلاس</button></footer></form></FormDialog>}
 </div>;
}

export function ClassRoster({classroom,openStudent}:{classroom:ClassContext;openStudent?:(id:number)=>void}){
 const [pageSize,setPageSize]=useState(20);

 const [rows,setRows]=useState<{id:number;name:string;father_name?:string;student_code?:string;enrollment_version?:number}[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[query,setQuery]=useState(""),[page,setPage]=useState(1),[retry,setRetry]=useState(0);
 const [count,setCount]=useState(0),[pages,setPages]=useState(1),[search,setSearch]=useState(""),[composing,setComposing]=useState(false);
 const searchInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(composing)return;const timer=setTimeout(()=>{setSearch(query.trim());setPage(1)},query?300:0);return()=>clearTimeout(timer)},[query,composing]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError("");
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize),q:search});
  api(`/classes/${classroom.id}/roster/?${params}`,{signal:controller.signal}).then(value=>{
   if(controller.signal.aborted)return;
   setRows(value.students);setCount(value.count??value.students.length);setPages(value.pages??1);
   if(value.page&&value.page!==page)setPage(value.page);
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[classroom.id,retry,page,pageSize,search]);
 const [bulkOpen,setBulkOpen]=useState(false);
 const [removing,setRemoving]=useState<(typeof rows)[number]|null>(null);
 const visible=rows,selection=usePageSelection(openStudent&&!loading&&!error?visible.map(row=>row.id):[]);
 return <section className="class-roster">
 {bulkOpen&&openStudent&&<BulkArchiveDialog entries={visible.filter(row=>selection.ids.includes(row.id))} kind="students" classroom={classroom.id} close={()=>setBulkOpen(false)} saved={()=>{selection.clear();setRetry(value=>value+1)}}/>}<header className="roster-heading"><div><h2>دانش‌آموزان {classroom.title}</h2><span>{classroom.year}</span></div><span className="badge">{fa(count)} دانش‌آموز</span></header>
 <div className="roster-toolbar">{openStudent&&<BulkArchiveButton count={selection.ids.length} disabled={loading||Boolean(error)} open={()=>setBulkOpen(true)}/>}<label>جستجوی دانش‌آموز<span><Search size={17} aria-hidden="true"/><input ref={searchInput} type="search" maxLength={120} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} value={query} onChange={event=>{selection.clear();setQuery(event.target.value)}}/></span></label>{query&&<button type="button" className="text-link" onClick={()=>{selection.clear();setQuery("");setSearch("");setPage(1);searchInput.current?.focus()}}>پاک کردن جستجو</button>}</div>
 {error&&<div className="error" role="alert">{error}<button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>تلاش دوباره</button></div>}
 <div className="table-wrap structure-table-wrap roster-table-wrap" role="region" aria-label="فهرست دانش‌آموزان کلاس" tabIndex={0} aria-busy={loading}><table className="structure-table roster-table" aria-label="دانش‌آموزان کلاس"><thead><tr>{openStudent&&<th scope="col" className="selection-cell"><SelectionCheckbox label="انتخاب همه دانش‌آموزان این صفحه" checked={selection.all} partial={selection.partial} disabled={loading||!visible.length||Boolean(error)} onChange={selection.toggleAll}/></th>}{["ردیف","دانش‌آموز","نام پدر","کد دانش‌آموزی",...(openStudent?["عملیات"]:[])].map(title=><th scope="col" key={title}>{title}</th>)}</tr></thead>
 <tbody>{loading||error?<tr><td className="structure-empty" colSpan={openStudent?6:4}><span role="status">{loading?"در حال دریافت فهرست…":"دریافت فهرست ناموفق بود."}</span></td></tr>:visible.map((row,index)=><tr key={row.id}>{openStudent&&<td className="selection-cell"><SelectionCheckbox label={`انتخاب ${row.name}`} checked={selection.ids.includes(row.id)} onChange={()=>selection.toggle(row.id)}/></td>}<td>{fa((page-1)*pageSize+index+1)}</td><th scope="row">{row.name}</th><td>{row.father_name||"—"}</td><td><bdi dir="ltr">{row.student_code||"—"}</bdi></td>{openStudent&&<td><button type="button" className="roster-profile-action" title="مشاهده پرونده" aria-label={`مشاهده پرونده ${row.name}`} onClick={()=>openStudent(row.id)}><FolderOpen size={20} aria-hidden="true"/></button><button type="button" className="roster-profile-action" title="حذف از کلاس" aria-label={`حذف از کلاس ${row.name}`} onClick={()=>setRemoving(row)}><Trash2 size={19}/></button></td>}</tr>)}
 {!loading&&!error&&!visible.length&&<tr><td className="structure-empty" colSpan={openStudent?6:4}>دانش‌آموزی یافت نشد.</td></tr>}</tbody></table></div>
 {!loading&&!error&&<Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);selection.clear();setPage(1);}} page={page} pages={pages} count={count} onChange={setPage}/>} {removing&&openStudent&&<ArchiveStudentDialog student={removing} classroom={classroom.id} close={()=>setRemoving(null)} saved={()=>setRetry(value=>value+1)}/>}</section>;
}
