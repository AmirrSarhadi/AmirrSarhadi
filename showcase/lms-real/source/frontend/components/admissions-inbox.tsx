"use client";
import {beginOperation} from "@/lib/operation-progress";
import {withPageSize} from "@/lib/pagination";
import {Pagination} from "@/components/ui/pagination";
import {useEffect,useState} from "react";
import {Search,RefreshCw,FileText,Inbox} from "lucide-react";
import {api,fa,dateFa} from "@/lib/api";
const majors:Record<string,string>={math:"ریاضی‌فیزیک",science:"علوم تجربی"};
type Row={id:number,student_name:string,parent_name:string,phone:string,grade:number,major:string,tracking:string,created_at:string,has_document:boolean};
type DocumentRow={id:number;title:string;name:string;size:number;url:string};
type Detail=Row&{address:string,previous_school:string,note:string,documents:DocumentRow[],retention_until:string|null};
type Result={records:Row[],count:number,pages:number};
const blank=()=>({q:"",grade:"",major:""});
export function AdmissionsInbox({role="deputy"}:{role?:string}){
 const [pageSize,setPageSize]=useState(20);

 const [filters,setFilters]=useState(blank),[query,setQuery]=useState(blank),[page,setPage]=useState(1),[reload,setReload]=useState(0);
 const [data,setData]=useState<Result|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState("");
 const [selected,setSelected]=useState<number|null>(null),[detail,setDetail]=useState<Detail|null>(null),[detailError,setDetailError]=useState(""),[detailReload,setDetailReload]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError("");setSelected(null);
  const params=new URLSearchParams({page:String(page)});Object.entries(query).forEach(([k,v])=>{if(v.trim())params.set(k,v.trim())});
  api<Result>(withPageSize("/admissions/?"+params,pageSize)).then(x=>{if(live){setData(x);if(page>x.pages)setPage(x.pages)}}).catch(e=>{if(live){setError(e.message);setData(null)}}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[query,page,reload,pageSize]);
 useEffect(()=>{let live=true;setDetail(null);setDetailError("");setDownloadError("");if(selected!==null)api<Detail>(withPageSize("/admissions/"+selected+"/",pageSize)).then(x=>{if(live)setDetail(x)}).catch(e=>{if(live)setDetailError(e.message)});return()=>{live=false}},[selected,detailReload]);
 async function downloadDocument(endpoint:string){
  const finish=beginOperation();
  setDownloading(true);setDownloadError("");
  try{
   const response=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
   if(!response.ok||response.status===204)throw new Error("دریافت مدرک ممکن نشد؛ دسترسی یا ارتباط را بررسی کنید.");
   const blob=await response.blob();
   if(!blob.size)throw new Error("فایل خالی دریافت شد؛ تنظیمات دانلود مرورگر را بررسی و دوباره تلاش کنید.");
   const filename=response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1]||"document";
   const blobUrl=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=blobUrl;link.download=filename;document.body.appendChild(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(blobUrl),60000);
  }catch(e){setDownloadError((e as Error).message)}finally{setDownloading(false);finish()}
 }
 return <div className="admissions-inbox">
 <section className="card"><div className="section-title"><div><h2>درخواست‌های آشنایی و ثبت‌نام</h2><p>مشاهده اطلاعات متقاضیان؛ ادامه مراحل پذیرش به‌صورت حضوری انجام می‌شود.</p></div><button className="button outline small" disabled={loading} onClick={()=>setReload(x=>x+1)}><RefreshCw size={16}/>تازه‌سازی</button></div>
 <form onSubmit={e=>{e.preventDefault();setQuery({...filters});setPage(1)}}>
 <div className="admission-filters"><label>جست‌وجوی درخواست<input aria-label="جست‌وجوی درخواست" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} maxLength={120} placeholder="نام دانش‌آموز یا والد، موبایل یا کد پیگیری"/></label>
 <label>پایه<select aria-label="فیلتر پایه" value={filters.grade} onChange={e=>setFilters({...filters,grade:e.target.value})}><option value="">همه پایه‌ها</option>{[10,11,12].map(g=><option key={g} value={g}>پایه {fa(g)}</option>)}</select></label>
 <label>رشته<select aria-label="فیلتر رشته" value={filters.major} onChange={e=>setFilters({...filters,major:e.target.value})}><option value="">همه رشته‌ها</option>{Object.entries(majors).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
 <div className="admission-actions"><button className="button small" disabled={loading}><Search size={16}/>جست‌وجو</button><button type="button" className="button outline small" disabled={loading} onClick={()=>{setFilters(blank());setQuery(blank());setPage(1)}}>پاک‌کردن فیلترها</button></div>
 </form></section>{role==="manager"&&<AdmissionConfigEditor/>}
 {error&&<div className="error" role="alert">{error}</div>}
 {loading?<div className="card" role="status">در حال دریافت درخواست‌ها…</div>:data&&<>
 <p className="muted">{fa(data.count)} درخواست مطابق فیلترها</p>
 {!data.records.length?<section className="card empty-state"><Inbox/><h3>درخواستی با این مشخصات پیدا نشد.</h3></section>:data.records.map(row=><article className="card admission-request" key={row.id}>
 <header><div><span className="badge">پایه {fa(row.grade)} · {majors[row.major]||"رشتهٔ غیرفعال"}</span><h3>{row.student_name}</h3></div><time dateTime={row.created_at}>{dateFa(row.created_at)}</time></header>
 <dl className="admission-summary"><div><dt>والد</dt><dd>{row.parent_name}</dd></div><div><dt>شماره تماس</dt><dd><a href={"tel:"+row.phone} dir="ltr">{row.phone}</a></dd></div><div><dt>کد پیگیری</dt><dd dir="ltr">{row.tracking}</dd></div></dl>
 <button className="button outline small" aria-expanded={selected===row.id} aria-controls={"admission-details-"+row.id} onClick={()=>setSelected(selected===row.id?null:row.id)}>{selected===row.id?"بستن جزئیات":"نمایش جزئیات"}</button>
 {selected===row.id&&<section className="admission-details" id={"admission-details-"+row.id}>
 {detailError?<div role="alert" className="error">{detailError}<button className="button outline small" onClick={()=>setDetailReload(x=>x+1)}>تلاش دوباره</button></div>:detail?.id!==row.id?<p role="status">در حال دریافت جزئیات…</p>:<>
 <dl><div><dt>مدرسه قبلی</dt><dd>{detail.previous_school||"ثبت نشده"}</dd></div><div><dt>نشانی سکونت</dt><dd>{detail.address||"ثبت نشده"}</dd></div><div><dt>توضیحات متقاضی</dt><dd>{detail.note||"توضیحی ثبت نشده است."}</dd></div><div><dt>نگهداری تا</dt><dd>{detail.retention_until?dateFa(detail.retention_until):"سیاست قدیمی"}</dd></div></dl>
 {downloadError&&<div className="error" role="alert">{downloadError}</div>}{detail.documents?.length?<div className="admission-documents">{detail.documents.map(document=><div className="admission-document" key={document.id}><b>{document.title}</b><small>{document.name}</small><button className="button outline small" disabled={downloading} onClick={()=>downloadDocument(document.url)}><FileText size={16}/>{downloading?"در حال دریافت مدرک…":detail.documents.length===1?"دریافت مدرک پیوست":`دریافت ${document.title}`}</button></div>)}</div>:<p className="muted">مدرکی پیوست نشده است.</p>}
 </>}
 </section>}
 </article>)}
 <Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} page={page} pages={data.pages} count={data.count} busy={loading} onChange={setPage}/>
 </>}
 </div>
}

type ConfigField={id:number;key:string;label:string;required:boolean;active:boolean;position:number;version:number;locked:boolean};
type ConfigDocument={id:number;title:string;required:boolean;active:boolean;position:number;version:number};
type AdmissionConfig={settings:{accepting:boolean;intro:string;retention_days:number;version:number};fields:ConfigField[];documents:ConfigDocument[]};

function AdmissionConfigEditor(){
 const [open,setOpen]=useState(false),[data,setData]=useState<AdmissionConfig|null>(null),[error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 async function load(){setError("");try{setData(await api("/admissions/config/"))}catch(e){setError((e as Error).message)}}
 useEffect(()=>{if(open&&!data)load()},[open]);
 async function save(payload:Record<string,unknown>){setBusy(true);setError("");setSuccess("");try{setData(await api("/admissions/config/",{method:"POST",body:JSON.stringify(payload)}));setSuccess("تنظیمات پذیرش ذخیره شد.")}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="card admission-config"><div className="section-title"><div><h2>تنظیم فرم پذیرش</h2><p>مدیر می‌تواند عنوان و الزام فیلدها و مدارک را کنترل کند.</p></div><button className="button outline small" onClick={()=>setOpen(!open)}>{open?"بستن تنظیمات":"مدیریت فرم"}</button></div>{open&&<>{error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status">{success}</div>}{!data?<p role="status">در حال دریافت تنظیمات…</p>:<><form className="admission-config-settings" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);save({action:"settings",accepting:form.get("accepting")==="true",intro:form.get("intro"),retention_days:Number(form.get("retention_days")),expected_version:data.settings.version})}}><h3>وضعیت و نگهداری</h3><label className="check"><input name="accepting" type="checkbox" value="true" defaultChecked={data.settings.accepting}/>فرم پذیرش باز باشد</label><label>متن راهنما<textarea name="intro" defaultValue={data.settings.intro} rows={3} required/></label><label>مدت نگهداری اطلاعات و مدارک (روز)<input name="retention_days" type="number" min="30" max="1825" defaultValue={data.settings.retention_days} required/></label><button className="button small" disabled={busy}>ذخیره تنظیمات</button></form><div className="config-grid"><section><h3>فیلدهای فرم</h3>{data.fields.map(field=><ConfigFieldRow key={field.id} row={field} busy={busy} save={save}/>)}</section><section><h3>مدارک درخواستی</h3><form className="config-row" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);save({action:"document",title:form.get("title"),required:form.get("required")==="true",active:true,position:Number(form.get("position"))})}}><b>مدرک جدید</b><input name="title" aria-label="عنوان مدرک جدید" placeholder="مثلاً کارنامه سال قبل" required/><input name="position" type="number" min="0" max="99" defaultValue="0" aria-label="ترتیب مدرک جدید"/><label className="check"><input name="required" type="checkbox" value="true"/>الزامی</label><button className="button outline small" disabled={busy}>افزودن مدرک</button></form>{data.documents.map(document=><ConfigDocumentRow key={document.id} row={document} busy={busy} save={save}/>)}</section></div></>}</>}</section>;
}

function ConfigFieldRow({row,busy,save}:{row:ConfigField;busy:boolean;save:(payload:Record<string,unknown>)=>Promise<void>}){
 return <form className="config-row" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);save({action:"field",id:row.id,label:form.get("label"),required:row.locked||form.get("required")==="true",active:row.locked||form.get("active")==="true",position:Number(form.get("position")),expected_version:row.version})}}><b>{row.key}</b><input name="label" defaultValue={row.label} aria-label={`عنوان فیلد ${row.key}`} required/><input name="position" type="number" min="0" max="99" defaultValue={row.position}/><label className="check"><input name="required" type="checkbox" value="true" defaultChecked={row.required} disabled={row.locked}/>الزامی</label><label className="check"><input name="active" type="checkbox" value="true" defaultChecked={row.active} disabled={row.locked}/>فعال</label><button className="text-link" disabled={busy}>ذخیره</button></form>;
}

function ConfigDocumentRow({row,busy,save}:{row:ConfigDocument;busy:boolean;save:(payload:Record<string,unknown>)=>Promise<void>}){
 return <form className="config-row" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);save({action:"document",id:row.id,title:form.get("title"),required:form.get("required")==="true",active:form.get("active")==="true",position:Number(form.get("position")),expected_version:row.version})}}><input name="title" defaultValue={row.title} aria-label={`عنوان مدرک ${row.title}`} required/><input name="position" type="number" min="0" max="99" defaultValue={row.position}/><label className="check"><input name="required" type="checkbox" value="true" defaultChecked={row.required}/>الزامی</label><label className="check"><input name="active" type="checkbox" value="true" defaultChecked={row.active}/>فعال</label><button className="text-link" disabled={busy}>ذخیره</button></form>;
}
