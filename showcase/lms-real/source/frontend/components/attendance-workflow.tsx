"use client";
import {withPageSize} from "@/lib/pagination";
import {NotificationItems} from "@/components/notification-center";
import {NotificationRow,notificationsChanged} from "@/lib/notifications";
import {FormDialog} from "@/components/ui/form-dialog";
import "@/app/panel-workflows.css";
import {ClassContext} from "@/lib/class-context";
import {PersianDatePicker} from "@/components/persian-date-picker";
import {FormEvent,useEffect,useRef,useState} from "react";
import {Pagination} from "@/components/ui/pagination";
import {Bell,CheckCircle2,Clock3,RefreshCw,ShieldAlert,UserCheck,Plus} from "lucide-react";
import {api,dateFa,fa,send} from "@/lib/api";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Absence={id:number;sheet_id:number;student:string;classroom:string;candidate:boolean;finalized:boolean};
export function DailyAbsencePanel(){const [day,setDay]=useState(today()),[data,setData]=useState<any>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[arrival,setArrival]=useState<Absence|null>(null);async function load(){setData(await api('/attendance/daily-workflow/?date='+day))}useEffect(()=>{load().catch(e=>setError(e.message))},[day]);async function act(fn:()=>Promise<any>,msg:string){setBusy(true);setError('');try{await fn();setSuccess(msg);setArrival(null);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}return <div className="attendance-flow"><section className="card flow-hero"><div><span className="badge">کنترل روزانه</span><h2>لیست غایبین</h2><p>پیشنهاد زنگ اول را بررسی کنید و پس از اطمینان، حضور روز را یک‌جا نهایی کنید.</p></div><UserCheck/></section>{error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}<section className="card"><div className="flow-toolbar"><PersianDatePicker label="تاریخ" value={day} onChange={setDay}/><button className="text-link" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>تازه‌سازی</button><button className="button" disabled={busy||!data?.sheets?.length} onClick={()=>act(()=>send('/attendance/daily-workflow/',{action:'finalize_day',date:day}),'حضور روزانه نهایی و پیامک غایبان در صف قرار گرفت.')}>ثبت نهایی روز و ارسال پیامک</button></div><div className="flow-summary"><span>کلاس‌های ثبت‌شده <b>{fa(data?.sheets?.length||0)}</b></span><span>غایبان امروز <b>{fa(data?.records?.length||0)}</b></span><span>پیشنهاد معلم <b>{fa(data?.sheets?.filter((x:any)=>x.candidate).length||0)}</b></span></div></section><section className="absence-grid">{data?.records?.map((x:Absence)=><article className="card absence-card" key={x.id}><div><span className={'badge '+(x.candidate?'orange':'')}>{x.candidate?'پیشنهاد زنگ اول':x.finalized?'نهایی':'پیش‌نویس روزانه'}</span><h3>{x.student}</h3><p>{x.classroom}</p></div><button className="button outline small" onClick={()=>setArrival(x)}><Clock3 size={16}/>ثبت ساعت ورود</button></article>)}</section>{data&&!data.records.length&&<div className="card empty-state"><CheckCircle2/><h3>برای این روز غایبی ثبت نشده است.</h3></div>}{arrival&&<div className="flow-dialog" role="dialog" aria-modal="true"><form className="card" onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const value=new FormData(e.currentTarget).get('arrival_time');act(()=>send('/attendance/daily-workflow/',{action:'arrival',record_id:arrival.id,arrival_time:value}),'ساعت ورود ثبت و وضعیت به تأخیر تبدیل شد.')}}><h3>ساعت ورود {arrival.student}</h3><label>ساعت و دقیقه ورود<input type="time" name="arrival_time" required autoFocus/></label><div><button className="button" disabled={busy}>ثبت ورود</button><button type="button" className="button outline" onClick={()=>setArrival(null)}>انصراف</button></div></form></div>}</div>}
type Case={id:number;student:string;classroom:string;kind:string;kind_label:string;date:string;details:string;status:string;sms_sent:boolean;created_by:string};
export function DisciplinePanel({role,classContext}:{role:string;classContext?:ClassContext}){
 const [pageSize,setPageSize]=useState(20);

 const [creating,setCreating]=useState(false);
 const [data,setData]=useState<any>({records:[],students:[],classrooms:[],page:1,pages:1,count:0});
 const [filters,setFilters]=useState({day:'',search:'',classroom:classContext?String(classContext.id):'',status:'',page:1});
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const requestId=useRef(0),actionId=useRef(0);
 const office=['manager','deputy'].includes(role);
 useEffect(()=>{
  if(search===filters.search)return;
  const timer=setTimeout(()=>setFilters(current=>({...current,search,page:1})),search?300:0);
  return ()=>clearTimeout(timer);
 },[search,filters.search]);
 useEffect(()=>{
  if(search!==filters.search)return;
  const id=++requestId.current;
  setLoading(true);setError('');
  const params=new URLSearchParams({page:String(filters.page)});
  if(filters.day)params.set('date',filters.day);
  if(filters.search.trim())params.set('search',filters.search.trim());
  if(filters.classroom)params.set('classroom',filters.classroom);
  if(filters.status)params.set('status',filters.status);
  api(withPageSize('/discipline/?'+params,pageSize)).then(result=>{
   if(id!==requestId.current)return;
   const page=Number.isInteger(result.page)&&result.page>0?result.page:filters.page;
   setData({...result,classrooms:result.classrooms||[],pages:result.pages||1,count:result.count??result.records.length});
   if(page!==filters.page)setFilters(current=>({...current,page}));
  }).catch(e=>{if(id===requestId.current)setError(e.message)}).finally(()=>{if(id===requestId.current)setLoading(false)});
  return ()=>{requestId.current++;};
 },[filters,reload,role,search,pageSize]);
 useEffect(()=>()=>{actionId.current++;},[]);
 function filter(key:'day'|'search'|'classroom'|'status',value:string){
  requestId.current++;setLoading(true);setFilters(current=>({...current,[key]:value,page:1}));
 }
 async function act(fn:()=>Promise<any>){
  if(busy)return;
  const id=++actionId.current;setBusy(true);setError('');
  try{await fn();if(id===actionId.current){setReload(value=>value+1);return true}return false}
  catch(e){if(id===actionId.current)setError((e as Error).message);return false}
  finally{if(id===actionId.current)setBusy(false)}
 }
 return <div className="attendance-flow"><section className="card flow-hero"><div><span className="badge">پیگیری رفتاری</span><h2>موارد انضباطی</h2><p>غیبت زنگ به‌صورت خودکار و سایر موارد به‌صورت دستی ثبت می‌شوند.</p></div><ShieldAlert/></section>
 <div className="module-create-toolbar"><button type="button" className="button" disabled={busy||loading} onClick={()=>{setError("");setCreating(true)}}><Plus size={17}/>ثبت مورد</button></div>
 {error&&!creating&&<div className="error" role="alert">{error}<button type="button" className="text-link" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}><RefreshCw size={16}/>تلاش دوباره</button></div>}
 {creating&&<FormDialog title="ثبت مورد انضباطی" busy={busy} close={()=>setCreating(false)}>{error&&<div className="error" role="alert">{error}</div>}<form className="discipline-form workflow-modal-form" aria-label="ثبت مورد انضباطی" onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=e.currentTarget;const payload=Object.fromEntries(new FormData(f));void act(()=>send('/discipline/',payload)).then(ok=>{if(ok)setCreating(false)})}}>
 <fieldset className="workflow-fields" disabled={busy}>{filters.classroom&&<input type="hidden" name="classroom" value={filters.classroom}/>}<label>دانش‌آموز<select name="student_id" required><option value="">انتخاب کنید</option>{data.students.map((x:any)=><option key={x.id} value={x.id}>{x.name} · {x.classroom}</option>)}</select></label>
 <label>نوع مورد<select name="kind"><option value="conduct">بی‌نظمی</option><option value="homework">انجام ندادن تکلیف</option><option value="late">تأخیر</option><option value="leave">خروج از کلاس</option><option value="other">سایر</option></select></label>
 <PersianDatePicker label="تاریخ" name="date" defaultValue={today()} required/><label className="wide">توضیحات<textarea name="details" required/></label></fieldset><button className="button" disabled={busy}>ثبت مورد</button></form></FormDialog>}
 <section className="card"><h3>فهرست موارد</h3><div className="flow-toolbar">
 <label>نام دانش‌آموز<input type="search" maxLength={120} value={search} onChange={e=>{requestId.current++;setLoading(true);setSearch(e.target.value)}}/></label>
 <label>کلاس<select aria-label="کلاس" value={filters.classroom} onChange={e=>filter('classroom',e.target.value)}><option value="">همه کلاس‌ها</option>{classContext&&!data.classrooms.some((row:any)=>row.id===classContext.id)&&<option value={classContext.id}>{classContext.title}</option>}{data.classrooms.map((x:any)=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
 <label>وضعیت<select aria-label="وضعیت" value={filters.status} onChange={e=>filter('status',e.target.value)}><option value="">همه وضعیت‌ها</option><option value="open">باز</option><option value="resolved">رسیدگی‌شده</option></select></label>
 <PersianDatePicker label="روز" value={filters.day} onChange={value=>filter('day',value)} clearable/></div>
 <div className="discipline-list" aria-busy={loading}>
 {loading?<p role="status">در حال بارگذاری…</p>:!error&&data.records.length===0?<p role="status">موردی با این فیلترها یافت نشد.</p>:!error&&data.records.map((x:Case)=><article key={x.id}><div><span className="badge">{x.kind_label}</span><h3>{x.student}</h3><p>{x.classroom} · {dateFa(x.date)} · ثبت‌کننده: {x.created_by}</p><small>{x.details}</small></div><div>
 {x.status==='open'&&office&&<button className="text-link" disabled={busy} onClick={()=>act(()=>send(`/discipline/${x.id}/action/`,{action:'resolve'}))}>ثبت رسیدگی</button>}
 {office&&!x.sms_sent&&<button className="button outline small" disabled={busy} onClick={()=>act(()=>send(`/discipline/${x.id}/action/`,{action:'sms'}))}>ارسال پیامک</button>}{x.sms_sent&&<span className="badge green">پیامک ارسال شد</span>}</div></article>)}</div>
 <Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setFilters(current=>({...current,page:1}));}} page={filters.page} pages={data.pages} count={data.count} busy={loading||busy||!!error} label="موارد انضباطی" onChange={page=>{requestId.current++;setLoading(true);setFilters(current=>({...current,page}))}}/>
 </section></div>
}
export function NotificationsPanel({onOpen}:{onOpen:(row:NotificationRow)=>void}){
 type Row=NotificationRow;
 type Result={records:Row[];unread:number;count:number;pages:number};
 const [data,setData]=useState<Result>(),[filter,setFilter]=useState('all'),[page,setPage]=useState(1),[reload,setReload]=useState(0);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const requestId=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestId.current++}},[]);
 useEffect(()=>{
  const id=++requestId.current;setLoading(true);setError('');
  api<Result>('/notifications/in-app/?'+new URLSearchParams({page:String(page),status:filter})).then(result=>{
   if(id!==requestId.current)return;
   if(page>result.pages){setPage(result.pages);return}
   setData(previous=>({...result,records:page===1?result.records:Array.from(new Map([...(previous?.records||[]),...result.records].map(row=>[row.id,row])).values())}));
  }).catch(e=>{if(id===requestId.current)setError(e.message)}).finally(()=>{if(id===requestId.current)setLoading(false)});
  return()=>{requestId.current++};
 },[filter,page,reload]);
 useEffect(()=>{const changed=()=>{requestId.current++;setData(undefined);setPage(1);setReload(x=>x+1)};window.addEventListener("panel-notifications-changed",changed);return()=>window.removeEventListener("panel-notifications-changed",changed)},[]);
 async function read(id?:number){
  requestId.current++;setBusy(true);setError('');
  try{await send('/notifications/in-app/',id?{ids:[id]}:{},id?{confirm:false,feedback:false}:{});notificationsChanged()}
  catch(e){if(mounted.current){setError((e as Error).message);setLoading(false)}}finally{if(mounted.current)setBusy(false)}
 }
 return <div className="attendance-flow"><section className="card flow-hero"><div><span className="badge">{fa(data?.unread||0)} خوانده‌نشده</span><h2>اعلان‌ها</h2><p>ثبت‌های جدید حضور و موارد نیازمند رسیدگی</p></div><Bell/></section>
 <section className="card"><div className="section-title"><h3>اعلان‌های شما</h3><button className="text-link" disabled={busy||loading} onClick={()=>read()}>علامت‌گذاری همه به‌عنوان خوانده‌شده</button></div>
 <label>نمایش<select aria-label="فیلتر اعلان‌ها" value={filter} disabled={busy} onChange={e=>{requestId.current++;setLoading(true);setData(undefined);setPage(1);setFilter(e.target.value)}}><option value="all">همه اعلان‌ها</option><option value="unread">خوانده‌نشده</option></select></label>
 {error&&<div className="error" role="alert">{error}<button className="text-link" disabled={busy||loading} onClick={()=>{setLoading(true);setReload(x=>x+1)}}><RefreshCw size={16}/>تلاش دوباره</button></div>}
 <div className="notification-list" aria-busy={loading||busy}><NotificationItems rows={data?.records||[]} busy={busy} onOpen={onOpen} onRead={read}/></div>
 {loading&&<p role="status">در حال بارگذاری…</p>}{!loading&&!error&&data&&!data.records.length&&<div className="empty-state" role="status">اعلانی وجود ندارد.</div>}
 {data&&page<data.pages&&<button className="button outline small" disabled={busy||loading||!!error} onClick={()=>{requestId.current++;setLoading(true);setPage(x=>x+1)}}>نمایش بیشتر</button>}
 </section></div>
}
