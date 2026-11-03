"use client";
import {beginOperation} from "@/lib/operation-progress";
import {withPageSize} from "@/lib/pagination";
import {ClassContext} from "@/lib/class-context";
import {Pagination} from "@/components/ui/pagination";
import {Fragment,useEffect,useState} from "react";
import "@/app/attendance-report.css";
import {api,send,fa,dateFa} from "@/lib/api";
import {PersianDatePicker,tehranToday} from "./persian-date-picker";
import {AlertTriangle,CheckCircle2,Download,RefreshCw,Search} from "lucide-react";
import {SearchablePersonSelect} from "@/components/ui/searchable-person-select";
import {AttendanceClassReport,ClassAttendanceRow} from "@/components/attendance-class-report";
import {AttendanceTodaySummary} from "@/components/attendance-today-summary";

const statuses:Record<string,string>={present:"حاضر",absent:"غایب",late:"تأخیر",early:"خروج زودهنگام"};
type Row={id:number,student:string,date:string,classroom:string,year:string,period:number,subject:string,status:string,excused:boolean|null,version:number,reason?:string};
type CoverageRow={key:string,date:string,classroom_id:number,classroom:string,period:number,teaching:number|null,subject:string};
type Coverage={summary:Record<"daily"|"lesson",{expected:number,finalized:number,missing:number}>,missing:CoverageRow[]};
type Report={today_summary?:{date:string;daily:Record<string,number>;excuses:Record<string,number>};records:Row[],count:number,page:number,pages:number,summary:Record<string,Record<string,number>>,excuse_summary:Record<string,number>,coverage:Coverage|null,students:{id:number,name:string}[]};
function initial(){const end=tehranToday();return {end,start:new Date(new Date(end+"T12:00:00Z").getTime()-29*86400000).toISOString().slice(0,10),student:"",kind:"all",status:"all",excuse:"all"}}
type Props={role:string;onOpenAttendance?:(row:CoverageRow)=>void;classContext?:ClassContext;onOpenAbsences?:(row:ClassAttendanceRow)=>void;initialDate?:string;onDateChange?:(value:string)=>void};
export function AttendanceReportPanel(props:Props){
 return ['manager','deputy'].includes(props.role)?<AttendanceClassReport classContext={props.classContext} onOpenAbsences={props.onOpenAbsences} initialDate={props.initialDate} onDateChange={props.onDateChange}/>:<AttendanceReportDetails {...props}/>;
}
function AttendanceReportDetails({role,onOpenAttendance,classContext}:Props){
 const [pageSize,setPageSize]=useState(50);

 const [filters,setFilters]=useState(initial),[query,setQuery]=useState(initial),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
 const [data,setData]=useState<Report|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [editing,setEditing]=useState<number|null>(null),[reason,setReason]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;setLoading(true);setError("");setEditing(null);
  const params=new URLSearchParams({...query,page:String(page)});if(classContext)params.set("classroom",String(classContext.id));if(!query.student)params.delete("student");
  api<Report>(withPageSize("/attendance/report/?"+params,pageSize)).then(d=>{if(live)setData(d)}).catch(e=>{if(live){setError(e.message);setData(null)}}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[query,page,refresh,pageSize]);
 async function review(row:Row){setBusy(true);setError("");setSuccess("");try{
  await send("/attendance/"+row.id+"/excuse/",{excused:true,reason,expected_version:row.version});
  setSuccess("وضعیت غیبت ثبت شد.");setEditing(null);setRefresh(x=>x+1);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function download(){const finish=beginOperation();setBusy(true);setError("");try{
  const params=new URLSearchParams({...query,export:"csv"});if(classContext)params.set("classroom",String(classContext.id));if(!query.student)params.delete("student");
  const response=await fetch("/api/v1/attendance/report/?"+params,{credentials:"same-origin",cache:"no-store"});
  if(!response.ok){const payload=await response.json().catch(()=>null);throw new Error(payload?.detail||"دریافت خروجی حضور ممکن نشد.")}
  const blob=await response.blob();if(!blob.size)throw new Error("فایل خروجی خالی دریافت شد.");
  const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`attendance-${query.start}-${query.end}.csv`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){setError((e as Error).message)}finally{setBusy(false);finish()}}
 const office=["manager","deputy"].includes(role);
 const columns=office?9:7;
 return <div className="attendance-report attendance-ledger">
  <header className="report-heading"><div><h2>سوابق حضور دانش‌آموزان</h2><p>ثبت‌های نهایی · بازه پیش‌فرض ۳۰ روز اخیر</p></div><div className="report-actions"><button className="button outline small" disabled={loading||busy||!data?.count} onClick={download}><Download size={15}/>دریافت CSV برای Excel</button><button className="button outline small" disabled={loading||busy} onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={15}/>تازه‌سازی</button></div></header>
  {error&&<div role="alert" className="error">{error}</div>}{success&&<div role="status" className="success">{success}</div>}
  {data&&<AttendanceTodaySummary summary={data.today_summary} loading={loading}/>}
  {data&&<p className="report-note">آمار بالا فقط مربوط به حضور روزانهٔ امروز است؛ بازه و فیلترهای وضعیت برای جزئیات گزارش اعمال می‌شوند.</p>}
  {office&&data?.coverage&&<fieldset className="report-group attendance-coverage" aria-busy={loading}><legend>پوشش ثبت حضور</legend><div className="report-section-heading"><p className="report-note">تطبیق جلسه‌های فعال با ثبت‌های نهایی در بازه انتخاب‌شده</p>{data.coverage.missing.length?<span className="badge orange"><AlertTriangle size={15}/>نیازمند تکمیل</span>:<span className="badge green"><CheckCircle2 size={15}/>کامل</span>}</div>
   <div className="table-wrap"><table className="attendance-table coverage-table"><caption className="report-sr-only">خلاصه پوشش ثبت حضور</caption><thead><tr><th scope="col">نوع ثبت</th><th scope="col">مورد انتظار</th><th scope="col">نهایی‌شده</th><th scope="col">نهایی‌نشده</th></tr></thead><tbody>{[["daily","روزانه"],["lesson","زنگ درسی"]].map(([key,label])=>{const item=data.coverage!.summary[key as "daily"|"lesson"];return <tr key={key}><th scope="row">{label}</th><td>{fa(item.expected)}</td><td>{fa(item.finalized)}</td><td><span className={"badge "+(item.missing?"orange":"green")}>{fa(item.missing)}</span></td></tr>})}</tbody></table></div>
   {data.coverage.missing.length?<details className="coverage-detail"><summary>{fa(data.coverage.missing.length)} برگه نهایی‌نشده</summary><div className="table-wrap coverage-missing-table"><table className="attendance-table"><caption className="report-sr-only">برگه‌های نیازمند تکمیل ثبت حضور</caption><thead><tr><th scope="col">کلاس</th><th scope="col">تاریخ</th><th scope="col">زنگ / درس</th>{onOpenAttendance&&<th scope="col">پیگیری</th>}</tr></thead><tbody>{data.coverage.missing.map(row=><tr key={row.key}><th scope="row">{row.classroom}</th><td>{dateFa(row.date)}</td><td>{row.period?"زنگ "+fa(row.period)+" · "+row.subject:"حضور روزانه"}</td>{onOpenAttendance&&<td><button type="button" className="button outline small" disabled={loading||busy} onClick={()=>onOpenAttendance(row)}>تکمیل ثبت حضور</button></td>}</tr>)}</tbody></table></div></details>:<p className="report-note">همه حضورهای مورد انتظار این بازه نهایی شده‌اند.</p>}
  </fieldset>}
  <form className="report-query-form" aria-label="جست‌وجوی سوابق حضور" onSubmit={e=>{e.preventDefault();setSuccess("");setQuery({...filters});setPage(1)}}>
   <fieldset className="report-group"><legend>جست‌وجو و فیلتر گزارش</legend><div className="report-filters">
    <div className="report-filter-row report-date-range"><PersianDatePicker label="از تاریخ" value={filters.start} onChange={start=>setFilters({...filters,start})}/><PersianDatePicker label="تا تاریخ" value={filters.end} onChange={end=>setFilters({...filters,end})}/></div>
    {role!=="student"&&<div className="report-person-filter"><SearchablePersonSelect label="دانش‌آموز" name="student" required={false} disabled={busy} value={filters.student} onChange={student=>setFilters({...filters,student})} options={(data?.students||[]).map(student=>({...student,username:""}))} placeholder="همه افراد در دسترس"/></div>}
    <div className="report-filter-row report-status-filters"><label>نوع حضور<select aria-label="نوع حضور" value={filters.kind} onChange={e=>setFilters({...filters,kind:e.target.value})}><option value="all">روزانه و زنگ‌ها</option><option value="daily">روزانه</option><option value="lesson">زنگ‌های درسی</option></select></label>
    <label>وضعیت حضور<select aria-label="وضعیت حضور" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="all">همه وضعیت‌ها</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>وضعیت غیبت<select aria-label="وضعیت غیبت" value={filters.excuse} onChange={e=>setFilters({...filters,excuse:e.target.value})}><option value="all">همه وضعیت‌ها</option><option value="excused">موجه</option><option value="unexcused">غیرموجه</option></select></label></div>
   </div><div className="report-query-actions"><button className="button small" disabled={loading||busy}><Search size={16}/>نمایش گزارش</button></div></fieldset>
  </form>
  <section className="report-detail-section" aria-labelledby="attendance-detail-title" aria-busy={loading}><div className="report-section-heading"><h2 id="attendance-detail-title">جزئیات حضور</h2>{data&&<span className="badge">{fa(data.count)} ثبت</span>}</div>
   {loading?<div role="status" className="empty-state">در حال دریافت گزارش…</div>:data&&!data.records.length?<div className="empty-state">در این بازه، سابقه‌ای با فیلترهای انتخاب‌شده وجود ندارد.</div>:data&&<div className="table-wrap attendance-detail-scroll" tabIndex={0} role="region" aria-label="جدول جزئیات حضور"><table className="attendance-table attendance-detail-table"><caption className="report-sr-only">جزئیات ثبت‌های نهایی حضور دانش‌آموزان</caption><thead><tr><th scope="col">ردیف</th><th scope="col">دانش‌آموز</th><th scope="col">کلاس / سال تحصیلی</th><th scope="col">تاریخ</th><th scope="col">نوع حضور / درس</th><th scope="col">وضعیت حضور</th><th scope="col">وضعیت غیبت</th>{office&&<><th scope="col">دلیل بررسی</th><th scope="col">اقدام</th></>}</tr></thead>
   <tbody>{data.records.map((row,index)=><Fragment key={row.id}><tr className="report-row"><td className="report-row-number">{fa((page-1)*50+index+1)}</td><th scope="row">{row.student}</th><td><span>{row.classroom}</span><small>{row.year}</small></td><td className="report-date-cell">{dateFa(row.date)}</td><td>{row.period?<><span>{row.subject||"زنگ درسی"}</span><small>زنگ {fa(row.period)}</small></>:"حضور روزانه"}</td><td><span className={"badge "+(row.status==="present"?"green":"orange")}>{statuses[row.status]||row.status}</span></td><td>{row.status==="absent"?<span className={"badge "+(row.excused?"green":"orange")}>{row.excused?"غیبت موجه":"غیبت غیرموجه"}</span>:"—"}</td>{office&&<><td className="report-reason-cell">{row.reason||"—"}</td><td>{role==="deputy"&&row.status==="absent"&&!row.excused?<button type="button" className="text-link" disabled={busy} aria-expanded={editing===row.id} onClick={()=>{setEditing(editing===row.id?null:row.id);setReason(row.reason||"")}}>{editing===row.id?"بستن":"موجه کردن غیبت"}</button>:"—"}</td></>}</tr>
   {role==="deputy"&&editing===row.id&&<tr className="report-review-row"><td colSpan={columns}><form className="report-review" onSubmit={e=>{e.preventDefault();review(row)}}><label htmlFor={"attendance-review-reason-"+row.id}>دلیل بررسی</label><textarea id={"attendance-review-reason-"+row.id} required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/><p className="report-note">توضیحات فقط برای مسئولان مدرسه نمایش داده می‌شود؛ دانش‌آموز و خانواده فقط نتیجه را می‌بینند.</p><div className="report-actions"><button className="button small" disabled={busy||!reason.trim()}>ثبت وضعیت غیبت</button><button type="button" className="button outline small" disabled={busy} onClick={()=>setEditing(null)}>انصراف</button></div></form></td></tr>}
   </Fragment>)}</tbody></table></div>}
   {data&&<Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} page={page} pages={data.pages} count={data.count} busy={busy||loading||!!error} label="صفحه‌بندی سوابق حضور" onChange={setPage}/>}
  </section>
 </div>
}
