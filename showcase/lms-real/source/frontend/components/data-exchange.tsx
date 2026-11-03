"use client";
import {FileUpload} from "@/components/ui/file-upload-04";
import {ManualDataEntry} from "@/components/manual-data-entry";
import {FormEvent,useEffect,useRef,useState} from "react";
import {Database,FileDown,FileSpreadsheet,Plus,RefreshCw,Upload} from "lucide-react";
import {ImportPreview,ImportPreviewData} from "@/components/import-preview";
import {api,fa} from "@/lib/api";
import dynamic from "next/dynamic";
import {PencilLoader} from "@/components/ui/loader-1";
const TeachingRegistration=dynamic(()=>import("./school-structure").then(module=>module.TeachingRegistration),{loading:()=> <PencilLoader label="در حال دریافت درس‌ها…"/>});
const TeachingAllocation=dynamic(()=>import("./teaching-allocation").then(module=>module.TeachingAllocation),{loading:()=> <PencilLoader label="در حال دریافت درس‌ها…"/>});

type Kind="classes"|"staff"|"students"|"teachings"|"teaching-allocation";
type Preview=ImportPreviewData&{batch:string};
type Report={education:{active_classes:number;active_students:number;active_teachings:number};attendance:{records:number;absent:number;late:number};communications:{conversations:number;messages:number;active_members:number}};
type Sida={reason:string;required:string[]};

const labels:Record<Kind,string>={classes:"سال و کلاس‌ها",staff:"کادر مدرسه و معلمان",students:"دانش‌آموز، ولی و ثبت‌نام",teachings:"ثبت درس و معلم","teaching-allocation":"تخصیص درس به کلاس"};
export function DataExchangePanel({role,canPrint=role==="manager"||role==="deputy"}:{role:string;canPrint?:boolean}){
 const canImport=["manager","deputy"].includes(role);
 const [kind,setKind]=useState<Kind>("classes"),[mode,setMode]=useState<"manual"|"excel">("manual"),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<Preview|null>(null),[report,setReport]=useState<Report|null>(null),[sida,setSida]=useState<Sida|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function load(){setError("");try{const [r,s]=await Promise.all([api<Report>("/data-exchange/reports/management/"),api<Sida>("/data-exchange/sida/status/")]);setReport(r);setSida(s)}catch(e){setError((e as Error).message)}}
 useEffect(()=>{load()},[]);
 function changeKind(value:Kind){setKind(value);setPreview(null);setFile(null);setError("");setSuccess("")}
 async function submitManual(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");const form=event.currentTarget;try{await api("/data-exchange/manual/",{method:"POST",body:JSON.stringify({type:kind,values:Object.fromEntries(new FormData(form).entries())})});form.reset();setSuccess("اطلاعات با موفقیت ثبت شد.");await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function upload(action:"preview"|"apply",form?:HTMLFormElement|null){if(busy||(action==="apply"&&!preview?.can_apply))return;if(!file)return setError("ابتدا فایل Excel را انتخاب کنید.");setBusy(true);setError("");setSuccess("");if(action==="preview")setPreview(null);try{const body=new FormData();body.append("file",file);if(action==="preview")body.append("type",kind);else{body.append("batch",preview!.batch);body.append("confirmed_valid_rows",JSON.stringify(preview!.rows.filter(row=>!row.errors.length).map(row=>row.row)))}const result=await api<any>(`/data-exchange/import/${action}/`,{method:"POST",body,form,confirm:false,feedback:action!=="preview"});if(action==="preview")setPreview(result);else{setPreview(null);setFile(null);setSuccess(`${fa(result.rows)} ردیف با موفقیت اعمال شد؛ ${fa(result.skipped||0)} ردیف خطادار ثبت نشد.`);await load()}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="exchange-module">
  <section className="card exchange-intro"><div><span className="badge">مدیریت داده</span><h2>ورود اطلاعات مدرسه</h2><p>یک مورد را دستی ثبت کنید یا برای ورود گروهی از قالب استاندارد Excel استفاده کنید.</p></div><Database/></section>
  {error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status">{success}</div>}
  {canImport&&<section className="card"><div className="section-title"><div><h3>ثبت و ورود اطلاعات</h3><p className="muted">هر دو روش از قواعد اعتبارسنجی یکسان استفاده می‌کنند.</p></div>{kind!=="teachings"&&kind!=="teaching-allocation"&&<a className="button outline small" href={`/api/v1/data-exchange/template/?type=${kind}`} download><FileDown size={15}/>دانلود Excel نمونه</a>}</div>
   <label className="exchange-kind">نوع اطلاعات<select aria-label="نوع اطلاعات" disabled={busy} value={kind} onChange={e=>changeKind(e.target.value as Kind)}>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
   {kind==="teaching-allocation"?<TeachingAllocation onChanged={load} onBusyChange={setBusy}/>:kind==="teachings"?<TeachingRegistration onChanged={load} onBusyChange={setBusy}/>:<><div className="exchange-mode" role="tablist" aria-label="روش ورود اطلاعات"><button type="button" role="tab" aria-selected={mode==="manual"} className={mode==="manual"?"active":""} onClick={()=>setMode("manual")}><Plus size={16}/>ورود دستی</button><button type="button" role="tab" aria-selected={mode==="excel"} className={mode==="excel"?"active":""} onClick={()=>setMode("excel")}><FileSpreadsheet size={16}/>ورود با Excel</button></div>
   {mode==="manual"?<ManualDataEntry key={kind} kind={kind} busy={busy} onSubmit={submitManual}/>:<ExcelImport file={file} setFile={file=>{setFile(file);setPreview(null)}} preview={preview} busy={busy} upload={upload}/>}</>}
  </section>}
  <section className="card"><div className="section-title"><div><h3>گزارش مدیریتی یکپارچه</h3><p className="muted">تصویر لحظه‌ای از آموزش، حضور و ارتباطات؛ بدون متن خصوصی پیام‌ها.</p></div><button className="text-link" onClick={load}><RefreshCw size={15}/>تازه‌سازی</button></div>{report?<><div className="exchange-report-grid"><ReportCard title="آموزشی" values={[["کلاس فعال",report.education.active_classes],["دانش‌آموز فعال",report.education.active_students],["تدریس فعال",report.education.active_teachings]]}/><ReportCard title="حضور" values={[["کل رکورد",report.attendance.records],["غیبت",report.attendance.absent],["تأخیر",report.attendance.late]]}/><ReportCard title="ارتباطات" values={[["گفت‌وگو",report.communications.conversations],["پیام",report.communications.messages],["کاربر فعال",report.communications.active_members]]}/></div><div className="exchange-downloads"><a className="button" href="/api/v1/data-exchange/reports/management/?export=xlsx" download><FileSpreadsheet size={16}/>خروجی Excel</a>{canPrint&&<a className="button outline" href="/api/v1/data-exchange/reports/management/?export=pdf" download><FileDown size={16}/>خروجی PDF</a>}</div></>:<p className="muted">در حال دریافت گزارش…</p>}</section>

 </div>
}

function ExcelImport({file,setFile,preview,busy,upload}:{file:File|null;setFile:(file:File|null)=>void;preview:Preview|null;busy:boolean;upload:(action:"preview"|"apply",form?:HTMLFormElement|null)=>void}){const form=useRef<HTMLFormElement>(null);return <form ref={form} aria-label="ورود فایل Excel" noValidate data-persian-validation onSubmit={event=>{event.preventDefault();upload("preview",event.currentTarget)}}><div className="exchange-upload"><FileUpload name="file" title="فایل اکسل" aria-label="فایل اکسل" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hint="Excel تا ۲ مگابایت" maxSize={2*1024*1024} files={file?[file]:[]} disabled={busy} onFilesChange={files=>setFile(files[0]||null)}/><button type="submit" className="button" disabled={busy||!file}><Upload size={16}/>پیش‌نمایش امن</button></div>{preview&&<ImportPreview preview={preview} busy={busy} onApply={()=>upload("apply",form.current)}/>}</form>}
function ReportCard({title,values}:{title:string;values:[string,number][]}){return <article><h4>{title}</h4>{values.map(([label,value])=><span key={label}><small>{label}</small><b>{fa(value)}</b></span>)}</article>}
