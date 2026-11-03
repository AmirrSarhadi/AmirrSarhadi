"use client";
import {withPageSize} from "@/lib/pagination";
import {useEffect,useRef,useState} from "react";
import {Bell,CheckCheck,Plus,RefreshCw,Search,X} from "lucide-react";
import {Pagination} from "@/components/ui/pagination";
import {api,send,fa,dateFa} from "@/lib/api";

const audiences:Record<string,string>={all:"همه کاربران پنل",student:"دانش‌آموزان",family:"خانواده‌ها",teacher:"معلمان",manager:"مدیر",deputy:"معاون"};
type Notice={id:number,title:string,body:string,audience:string,published:boolean,version:number,created_at:string,updated_at:string,is_read:boolean};
type Result={records:Notice[],count:number,pages:number,unread:number};
type Draft={id?:number,version?:number,title:string,body:string,audience:string,published:boolean};
const blank=():Draft=>({title:"",body:"",audience:"all",published:false});
export function AnnouncementsPanel({role,onChanged}:{role:string,onChanged:()=>Promise<void>}){
 const [pageSize,setPageSize]=useState(20);

 const admin=["manager","deputy"].includes(role);
 const [view,setView]=useState("inbox"),[filter,setFilter]=useState("all"),[page,setPage]=useState(1),[reload,setReload]=useState(0);
 const [data,setData]=useState<Result|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [draft,setDraft]=useState<Draft|null>(null);const editor=useRef<HTMLElement>(null);
 const [search,setSearch]=useState(""),[query,setQuery]=useState(""),[composing,setComposing]=useState(false);
 const requestId=useRef(0),searchInput=useRef<HTMLInputElement>(null);
 function invalidate(){requestId.current++;setLoading(true)}
 function commit(value=search){invalidate();setQuery(value.trim());setPage(1);setReload(x=>x+1)}
 useEffect(()=>{if(composing||search.trim()===query)return;const timer=setTimeout(()=>commit(search),search?300:0);return()=>clearTimeout(timer)},[search,query,composing]);
 useEffect(()=>{const id=++requestId.current;setLoading(true);setError("");
  api<Result>(withPageSize("/announcements/?"+new URLSearchParams({view,status:filter,page:String(page),q:query}),pageSize)).then(x=>{if(id===requestId.current){if(page>x.pages){setPage(x.pages);return}setData(x)}}).catch(e=>{if(id===requestId.current){setError(e.message);setData(null)}}).finally(()=>{if(id===requestId.current)setLoading(false)});
  return()=>{requestId.current++};
 },[view,filter,page,reload,query,pageSize]);
 function switchView(next:string){invalidate();setView(next);setFilter("all");setPage(1);setDraft(null);setError("");setSuccess("")}
 async function save(){if(!draft)return;setBusy(true);setError("");setSuccess("");
  try{await send(draft.id?"/announcements/"+draft.id+"/edit/":"/announcements/",{title:draft.title,body:draft.body,audience:draft.audience,published:draft.published,...(draft.id?{expected_version:draft.version}:{})});
   setSuccess(draft.published?"اطلاعیه ذخیره و برای مخاطبان منتشر شد.":"اطلاعیه به‌صورت پیش‌نویس ذخیره شد و برای مخاطبان نمایش داده نمی‌شود.");
   setDraft(null);setReload(x=>x+1);await onChanged();
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function markRead(n:Notice){setBusy(true);setError("");setSuccess("");try{
  await send("/announcements/"+n.id+"/read/",{version:n.version});setSuccess("اطلاعیه به‌عنوان خوانده‌شده ثبت شد.");setReload(x=>x+1);await onChanged();
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function edit(n:Notice){setDraft({...n});setSuccess("");setError("");requestAnimationFrame(()=>editor.current?.scrollIntoView({block:"start",behavior:"smooth"}))}
 return <div className="notices-module">
 <section className="card notices-intro"><div><span className="eyebrow">خبرهای مدرسه، در دسترس شما</span><h2>تابلوی اطلاعیه‌ها</h2><p>اطلاعیه‌های مرتبط با نقش شما؛ {fa(data?.unread||0)} اطلاعیه خوانده‌نشده.</p></div><Bell aria-hidden="true"/></section>
 <div className="notices-toolbar">{admin&&<div className="tabs"><button disabled={busy} className={view==="inbox"?"active":""} onClick={()=>switchView("inbox")}>اطلاعیه‌های من</button><button disabled={busy} className={view==="manage"?"active":""} onClick={()=>switchView("manage")}>مدیریت اطلاعیه‌ها</button></div>}
 <button className="button outline small" disabled={busy||loading} onClick={()=>{setSuccess("");setReload(x=>x+1)}}><RefreshCw size={16}/>تازه‌سازی</button></div>
 {error&&<div className="error" role="alert">{error}<button className="text-link" disabled={busy||loading} onClick={()=>{invalidate();setReload(x=>x+1)}}><RefreshCw size={16}/>تلاش دوباره</button></div>}{success&&<div className="success" role="status">{success}</div>}
 {view==="manage"&&<section className="card notices-editor" ref={editor}>{!draft?<button className="button small" onClick={()=>setDraft(blank())}><Plus size={16}/>اطلاعیه جدید</button>:<form onSubmit={e=>{e.preventDefault();save()}}>
 <h3>{draft.id?"ویرایش اطلاعیه":"اطلاعیه جدید"}</h3><p className="muted">انتشار مستقیم است. مخاطبان فقط نسخه منتشرشده را می‌بینند.</p>
 <label>عنوان اطلاعیه<input aria-label="عنوان اطلاعیه" required maxLength={180} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} disabled={busy}/></label>
 <label>متن اطلاعیه<textarea aria-label="متن اطلاعیه" required maxLength={10000} rows={6} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} disabled={busy}/></label>
 <div className="form-grid"><label>مخاطبان<select aria-label="مخاطبان" value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value})} disabled={busy}>{Object.entries(audiences).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>وضعیت انتشار<select aria-label="وضعیت انتشار" value={draft.published?"published":"draft"} onChange={e=>setDraft({...draft,published:e.target.value==="published"})} disabled={busy}><option value="draft">پیش‌نویس؛ مخفی از مخاطبان</option><option value="published">منتشرشده؛ قابل مشاهده برای مخاطبان</option></select></label></div>
 {draft.id&&<p className="notice">تغییر اطلاعیه منتشرشده بلافاصله اعمال می‌شود و نسخه جدید برای مخاطبان خوانده‌نشده خواهد بود.</p>}
 <div className="notices-actions"><button className="button small" disabled={busy||!draft.title.trim()||!draft.body.trim()}>ذخیره اطلاعیه</button><button type="button" className="button outline small" disabled={busy} onClick={()=>setDraft(null)}>انصراف</button></div>
 </form>}</section>}
 <div className="notices-toolbar"><form role="search" style={{display:"flex",alignItems:"end",gap:8,flex:"1 1 260px",minWidth:0}} onSubmit={e=>{e.preventDefault();if(!composing)commit()}}><label style={{flex:1,minWidth:0}}>جستجوی اطلاعیه‌ها<input ref={searchInput} type="search" maxLength={120} value={search} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} onChange={e=>{invalidate();setSearch(e.target.value);if(e.target.value.trim()===query||!e.target.value)commit(e.target.value)}}/></label><button className="text-link" type="submit" title="جستجو" aria-label="جستجو"><Search size={16}/></button>{search&&<button type="button" className="text-link" title="پاک کردن" aria-label="پاک کردن" onClick={()=>{setSearch("");commit("");searchInput.current?.focus()}}><X size={16}/></button>}</form>
 <label>نمایش<select aria-label="فیلتر اطلاعیه‌ها" value={filter} disabled={busy} onChange={e=>{invalidate();setSuccess("");setFilter(e.target.value);setPage(1)}}><option value="all">همه اطلاعیه‌ها</option>{view==="manage"?<><option value="published">منتشرشده</option><option value="draft">پیش‌نویس</option></>:<option value="unread">خوانده‌نشده</option>}</select></label>{data&&<span className="muted">{fa(data.count)} اطلاعیه</span>}</div>
 {loading?<div role="status" className="card">در حال دریافت اطلاعیه‌ها…</div>:data&&!data.records.length?<div className="card empty-state"><CheckCheck/><h3>{query?"اطلاعیه‌ای با این عبارت پیدا نشد.":filter==="unread"?"همه اطلاعیه‌های شما خوانده شده‌اند.":"اطلاعیه‌ای برای نمایش وجود ندارد."}</h3></div>:data?.records.map(n=><article className="card notice-card" key={n.id}>
 <div className="notice-meta"><span className="badge">{audiences[n.audience]||n.audience}</span><span className={"badge "+(view==="manage"?(n.published?"green":"orange"):(n.is_read?"green":"orange"))}>{view==="manage"?(n.published?"منتشرشده":"پیش‌نویس"):(n.is_read?"خوانده‌شده":"خوانده‌نشده")}</span><time dateTime={n.updated_at}>{dateFa(n.updated_at)}</time></div>
 <h3>{n.title}</h3><p className="notice-body">{n.body}</p><div className="notices-actions">{view==="manage"?<button className="button outline small" disabled={busy} onClick={()=>edit(n)}>ویرایش اطلاعیه</button>:!n.is_read&&<button className="button outline small" disabled={busy} onClick={()=>markRead(n)}><CheckCheck size={16}/>خواندم</button>}<small className="muted">نسخه {fa(n.version)}</small></div>
 </article>)}
 {data&&<Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);invalidate();setPage(1);}} page={page} pages={data.pages} count={data.count} busy={busy||loading||!!error} label="صفحه‌بندی اطلاعیه‌ها" onChange={next=>{invalidate();setPage(next)}}/>}
 </div>
}
