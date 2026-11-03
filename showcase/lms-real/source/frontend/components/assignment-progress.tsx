"use client";
import {useEffect,useState} from "react";
import {api,fa,dateFa} from "@/lib/api";
type Status="missing"|"pending"|"reviewed";
const labels:Record<Status,string>={missing:"تحویل‌نداده",pending:"منتظر بررسی",reviewed:"بررسی‌شده"};
type Progress={total:number,counts:Record<Status,number>,records:{student_id:number,student:string,status:Status,submitted_at:string|null,late:boolean}[]};
export function AssignmentProgress({assignmentId,revision}:{assignmentId:number,revision:string}){
 const [open,setOpen]=useState(false),[data,setData]=useState<Progress|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[filter,setFilter]=useState(""),[reload,setReload]=useState(0);
 useEffect(()=>{if(!open)return;let live=true;setLoading(true);setError("");api<Progress>("/assignments/"+assignmentId+"/progress/").then(x=>{if(live)setData(x)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[open,assignmentId,revision,reload]);
 return <section className="work-revisions"><button className="button outline small" aria-expanded={open} onClick={()=>setOpen(!open)}>پیگیری تحویل تکلیف</button>{open&&<>
 <p className="muted">اعضای فعال فعلی کلاس؛ سابقه پاسخ اعضای غیرفعال در بخش پاسخ‌ها باقی می‌ماند.</p>
 {error&&<div role="alert" className="error">{error}</div>}
 <button className="button outline small" disabled={loading} onClick={()=>setReload(x=>x+1)}>تازه‌سازی وضعیت تحویل</button>
 {loading?<p role="status">در حال دریافت وضعیت تحویل…</p>:!error&&data&&<>
 <p>کل: {fa(data.total)} · تحویل‌نداده: {fa(data.counts.missing)} · منتظر بررسی: {fa(data.counts.pending)} · بررسی‌شده: {fa(data.counts.reviewed)}</p>
 <label>وضعیت تحویل<select aria-label="فیلتر وضعیت تحویل" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">همه وضعیت‌ها</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 {data.records.filter(r=>!filter||r.status===filter).length?<div className="table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>وضعیت</th><th>آخرین ارسال</th></tr></thead><tbody>{data.records.filter(r=>!filter||r.status===filter).map(r=><tr key={r.student_id}><th>{r.student}</th><td>{labels[r.status]}{r.late&&<small>ارسال با تأخیر</small>}</td><td>{r.submitted_at?dateFa(r.submitted_at):"—"}</td></tr>)}</tbody></table></div>:<p className="notice">دانش‌آموزی با این وضعیت وجود ندارد.</p>}
 </>}
 </>}</section>
}
