"use client";
import {withPageSize} from "@/lib/pagination";
import {useEffect,useRef,useState,FormEvent} from "react";
import {ArrowLeft,CheckCheck,History,RefreshCw,Search,X} from "lucide-react";
import {api,send,fa} from "@/lib/api";
import {Pagination} from "@/components/ui/pagination";

type RequestRow={
 id:number;kind:"assignment"|"course";submission_id?:number;components?:{title:string;weight:number}[];old_scores?:Record<string,string>;new_scores?:Record<string,string>;assignment:string;classroom:string;subject:string;
 student:string;teacher:string;old_grade:string|null;new_grade:string|null;old_feedback:string;
 new_feedback:string;reason:string;status:"pending"|"approved"|"rejected";created_at:string;
 reviewed_at:string|null;review_note:string;reviewer:string|null;
};
const labels={pending:"منتظر بررسی مدیر",approved:"تأیید شده",rejected:"رد شده"};
type CorrectionPage={records:RequestRow[];count:number;pages:number;status_counts:Record<string,number>};
const stamp=(v:string)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(v));

export function CorrectionRequest({submission,busy,action,feedbackOnly=false}:{feedbackOnly?:boolean;submission:{id:number;grade:string|null;feedback:string;grade_version:number;pending_correction:boolean};busy:boolean;action:(fn:()=>Promise<void>,message:string)=>Promise<void>}){
 if(submission.pending_correction)return <p className="notice">درخواست اصلاح این پاسخ در انتظار بررسی مدیر است. نتیجه را در بخش «اصلاح نمره» ببینید.</p>;
 return <details className="correction-request"><summary>{feedbackOnly?"درخواست اصلاح بازخورد":"درخواست اصلاح نمره یا بازخورد"}</summary><p className="muted">تا تأیید مدیر، نتیجه فعلی برای دانش‌آموز و خانواده نمایش داده می‌شود.</p><form onSubmit={e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));action(async()=>{await send("/submissions/"+submission.id+"/correction/",{...d,expected_version:submission.grade_version})},feedbackOnly?"درخواست اصلاح برای مدیر ثبت شد. بازخورد فعلی هنوز تغییر نکرده است.":"درخواست اصلاح برای مدیر ثبت شد. نمره فعلی هنوز تغییر نکرده است.")}}><div className="form-grid">{!feedbackOnly&&<label>نمره پیشنهادی از ۲۰<input name="grade" type="number" min="0" max="20" step=".01" defaultValue={submission.grade??""} required/></label>}<label>بازخورد پیشنهادی<textarea name="feedback" maxLength={5000} required={feedbackOnly} defaultValue={submission.feedback}/></label></div><label>دلیل درخواست اصلاح<textarea name="reason" required maxLength={2000} placeholder="علت تغییر نمره یا بازخورد را توضیح دهید."/></label><button className="button small" disabled={busy}>ارسال درخواست به مدیر</button></form></details>;
}

export function GradeCorrectionsPanel({role}:{role:"teacher"|"manager"}){
 const [pageSize,setPageSize]=useState(20);

 const [result,setResult]=useState<CorrectionPage|null>(null),[filter,setFilter]=useState("pending"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[listError,setListError]=useState(""),[success,setSuccess]=useState(""),[reload,setReload]=useState(0),[page,setPage]=useState(1),[draft,setDraft]=useState(""),[q,setQ]=useState("");
 const request=useRef(0),reviewing=useRef(false);
 useEffect(()=>{
  const ticket=++request.current;setLoading(true);setListError("");setResult(null);
  api<CorrectionPage>(withPageSize(`/grade-corrections/?page=${page}&status=${filter}&q=${encodeURIComponent(q)}`,pageSize)).then(x=>{
   if(ticket!==request.current)return;
   if(page>x.pages){setPage(Math.max(1,x.pages));return}
   setResult(x);
  }).catch(e=>{if(ticket===request.current)setListError(e.message)}).finally(()=>{if(ticket===request.current)setLoading(false)});
  return()=>{request.current++};
 },[reload,page,filter,q,pageSize]);
 function navigate(change:()=>void){request.current++;setLoading(true);setListError("");setResult(null);change()}
 function refresh(){navigate(()=>setReload(x=>x+1))}
 function search(value:string){navigate(()=>{setQ(value.trim());setPage(1);setReload(x=>x+1)})}
 async function review(id:number,decision:string,note:string,kind:"assignment"|"course"){
  if(reviewing.current)return;reviewing.current=true;setBusy(true);setError("");setSuccess("");
  try{await send((kind==="course"?"/course-corrections/":"/grade-corrections/")+id+"/review/",{decision,note});refresh();setSuccess(decision==="approved"?"اصلاح تأیید شد و نمره و بازخورد جدید برای دانش‌آموز و خانواده نمایش داده می‌شود.":"درخواست رد شد؛ نمره فعلی بدون تغییر باقی ماند.")}catch(e){setError((e as Error).message)}finally{reviewing.current=false;setBusy(false)}
 }
 const shown=result?.records||[];
 return <div className="corrections-module" aria-busy={busy}>
 <div className="card correction-intro"><div><span className="eyebrow">سابقه روشن، تصمیم مشخص</span><h2>{role==="manager"?"بررسی درخواست‌های اصلاح نمره و بازخورد":"پیگیری درخواست‌های من"}</h2><p>{role==="manager"?"نتیجه قبلی و پیشنهاد معلم را بررسی کنید؛ تغییر فقط با تأیید شما منتشر می‌شود.":"درخواست را از پاسخ تکلیف یا دفتر نمرات درسی ثبت کنید و نتیجه مدیر را اینجا ببینید."}</p></div><History aria-hidden="true"/></div>
 {error&&<div role="alert" className="error">{error}</div>}{success&&<div role="status" className="success">{success}</div>}
 <div className="correction-toolbar"><div className="tabs" aria-label="وضعیت درخواست‌ها">{[["pending","منتظر بررسی"],["approved","تأیید شده"],["rejected","رد شده"],["","همه"]].map(([value,label])=><button key={value} className={filter===value?"active":""} onClick={()=>{if(value!==filter)navigate(()=>{setFilter(value);setPage(1)})}} aria-pressed={filter===value}>{label} <span>{result?fa(result.status_counts[value||"all"]||0):"…"}</span></button>)}</div><button className="button outline small" onClick={refresh} disabled={busy||loading}><RefreshCw size={16}/>تازه‌سازی</button></div>
 <form className="toolbar" onSubmit={e=>{e.preventDefault();search(draft)}}><label>جست‌وجوی درخواست‌ها<input type="search" maxLength={120} value={draft} onChange={e=>setDraft(e.target.value)}/></label>{draft&&<button type="button" className="icon-button" aria-label="پاک کردن جست‌وجو" title="پاک کردن جست‌وجو" onClick={()=>{setDraft("");search("")}}><X size={16}/></button>}<button className="button outline small" type="submit"><Search size={16}/>جست‌وجو</button></form>
 {listError&&<div className="error" role="alert">{listError}<button className="text-link" onClick={refresh}><RefreshCw size={16}/>تلاش دوباره</button></div>}
 {loading?<div role="status" className="empty-state">در حال دریافت درخواست‌ها…</div>:listError?null:!shown.length?<section className="card empty-state"><CheckCheck/><h3>درخواستی در این بخش وجود ندارد.</h3></section>:shown.map(r=><article className="card correction-card" key={r.kind+"-"+r.id}><header><div><span className="badge">{r.kind==="course"?"نمره درسی":"تکلیف"} · {r.subject} · {r.classroom}</span><h3>{r.assignment}</h3><p>{r.student} · معلم: {r.teacher}</p></div><span className={"badge "+(r.status==="approved"?"green":r.status==="pending"?"orange":"")}>{labels[r.status]}</span></header><div className="correction-comparison"><section><small>{r.old_grade===null?"بازخورد پیش از درخواست":"نمره پیش از درخواست"}</small><strong>{r.old_grade===null?"بدون نمره":<>{fa(Number(r.old_grade))}<small> از ۲۰</small></>}</strong>{r.kind==="course"?<ScoreBreakdown components={r.components||[]} scores={r.old_scores||{}}/>:<p>{r.old_feedback||"بدون بازخورد"}</p>}</section><ArrowLeft aria-hidden="true"/><section className="proposed"><small>پیشنهاد معلم</small><strong>{r.new_grade===null?"بدون نمره":<>{fa(Number(r.new_grade))}<small> از ۲۰</small></>}</strong>{r.kind==="course"?<ScoreBreakdown components={r.components||[]} scores={r.new_scores||{}}/>:<p>{r.new_feedback||"بدون بازخورد"}</p>}</section></div><div className="correction-reason"><b>دلیل درخواست</b><p>{r.reason}</p><small>{stamp(r.created_at)}</small></div>{r.reviewed_at&&<div className="correction-decision"><b>نتیجه بررسی {r.reviewer}</b><p>{r.review_note||"تأیید درخواست اصلاح"}</p><small>{stamp(r.reviewed_at)}</small></div>}{role==="manager"&&r.status==="pending"&&<ReviewForm busy={busy} onSubmit={(d,n)=>review(r.id,d,n,r.kind)}/>}</article>)}
 <Pagination pageSize={pageSize} onPageSizeChange={size=>navigate(()=>{setPageSize(size);setPage(1);})} page={page} pages={result?.pages||page} count={result?.count} busy={loading||busy||Boolean(listError)} onChange={next=>navigate(()=>setPage(next))} label="درخواست‌های اصلاح"/>
 </div>;
}
function ReviewForm({busy,onSubmit}:{busy:boolean;onSubmit:(decision:string,note:string)=>Promise<void>}){
 const [decision,setDecision]=useState("");
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);onSubmit(decision,String(d.get("note")||""))}
 return <form className="correction-review" onSubmit={submit}><div className="form-grid"><label>تصمیم مدیر<select value={decision} onChange={e=>setDecision(e.target.value)} required><option value="">انتخاب تصمیم</option><option value="approved">تأیید و اعمال اصلاح</option><option value="rejected">رد درخواست</option></select></label><label>{decision==="rejected"?"دلیل رد درخواست":"توضیح مدیر (اختیاری)"}<textarea name="note" required={decision==="rejected"} maxLength={2000}/></label></div><button className="button small" disabled={busy||!decision}>ثبت تصمیم مدیر</button></form>;
}

function ScoreBreakdown({components,scores}:{components:{title:string;weight:number}[];scores:Record<string,string>}){
 return <dl className="score-breakdown">{components.map((c,i)=><div key={i}><dt>{c.title}<small>ضریب {fa(c.weight)}</small></dt><dd>{fa(Number(scores[String(i)]))}</dd></div>)}</dl>;
}
