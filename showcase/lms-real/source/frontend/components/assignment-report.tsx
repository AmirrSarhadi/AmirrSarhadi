"use client";
import {useEffect,useState} from "react";
import {Download,RefreshCw} from "lucide-react";
import {api,dateFa,fa} from "@/lib/api";

type Status="missing"|"pending"|"reviewed";
type Report={
 summary:{total:number,missing:number,pending:number,reviewed:number,late:number,average_score:string|null},
 records:{assignment_id:number,assignment:string,classroom:string,subject:string,student_id:number,student:string,due_at:string,status:Status,submitted_at:string|null,late:boolean,grading_mode:"scored"|"feedback",grade:string|null}[]
};
const labels:Record<Status,string>={missing:"تحویل‌نداده",pending:"منتظر بررسی",reviewed:"بررسی‌شده"};

export function AssignmentReport({classroomId,revision}:{classroomId:string,revision:string}){
 const [data,setData]=useState<Report|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const query=classroomId?"?classroom="+classroomId:"";
 useEffect(()=>{let live=true;setLoading(true);setError("");api<Report>("/assignments/report/"+query).then(x=>{if(live)setData(x)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[query,revision,reload]);
 const csv="/api/v1/assignments/report/?export=csv"+(classroomId?"&classroom="+classroomId:"");
 return <section className="card assignment-report">
  <div className="section-title"><div><h2>گزارش عملکرد تکلیف</h2><p className="muted">خلاصه تحویل و ارزیابی در محدوده دسترسی شما</p></div><div className="attendance-choice"><button type="button" disabled={loading} onClick={()=>setReload(x=>x+1)}><RefreshCw size={15}/>تازه‌سازی</button><a className="button outline small" href={csv} download><Download size={15}/>دریافت CSV برای Excel</a></div></div>
  {error&&<div className="error" role="alert">{error}</div>}
  {loading?<p role="status">در حال آماده‌سازی گزارش…</p>:data&&<>
   <div className="stats-grid"><div className="stat"><span className="muted">کل موارد</span><strong>{fa(data.summary.total)}</strong></div><div className="stat"><span className="muted">تحویل‌نداده</span><strong>{fa(data.summary.missing)}</strong></div><div className="stat"><span className="muted">منتظر بررسی</span><strong>{fa(data.summary.pending)}</strong></div><div className="stat"><span className="muted">بررسی‌شده</span><strong>{fa(data.summary.reviewed)}</strong></div></div>
   <p className="muted">ارسال با تأخیر: {fa(data.summary.late)} · میانگین تکلیف‌های نمره‌دار بررسی‌شده: {data.summary.average_score===null?"—":fa(Number(data.summary.average_score))+" از ۲۰"}</p>
   <details className="work-revisions"><summary>نمایش جزئیات گزارش</summary>{data.records.length?<div className="table-wrap"><table><thead><tr><th>تکلیف</th><th>دانش‌آموز</th><th>کلاس و درس</th><th>وضعیت</th><th>مهلت</th><th>نتیجه</th></tr></thead><tbody>{data.records.map(row=><tr key={row.assignment_id+":"+row.student_id}><th>{row.assignment}</th><td>{row.student}</td><td>{row.classroom} · {row.subject}</td><td>{labels[row.status]}{row.late&&<small> · با تأخیر</small>}</td><td>{dateFa(row.due_at)}</td><td>{row.grade!==null?fa(Number(row.grade))+" از ۲۰":row.status==="reviewed"&&row.grading_mode==="feedback"?"بازخورد ثبت شد":"—"}</td></tr>)}</tbody></table></div>:<p className="notice">داده‌ای برای این محدوده وجود ندارد.</p>}</details>
  </>}
 </section>
}
