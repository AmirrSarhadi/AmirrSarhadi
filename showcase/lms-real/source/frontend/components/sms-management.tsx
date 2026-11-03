"use client";
import {withPageSize} from "@/lib/pagination";
import {PersianDatePicker,PersianDateTimePicker} from "@/components/persian-date-picker";
import {FileUpload} from "@/components/ui/file-upload-04";
import {FormEvent,useEffect,useRef,useState} from "react";
import {BookUser,FileSpreadsheet,History,MessageSquareText,RefreshCw,Search,Send,UserX,X} from "lucide-react";
import {api,fa,send} from "@/lib/api";
import {Pagination} from "@/components/ui/pagination";
type Student={id:number;name:string;student_code:string;guardian_name:string;guardian_phone:string};type Entry={id:number|null;name:string;phone:string;note:string};type Book={id:number;name:string;system:boolean;count:number;entries?:Entry[]};type Template={id:number;title:string;body:string;provider_pattern_code:string};
export function SmsManagementPanel(){const [tab,setTab]=useState('absence'),[students,setStudents]=useState<Student[]>([]),[books,setBooks]=useState<Book[]>([]),[templates,setTemplates]=useState<Template[]>([]),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);async function load(){const x=await api<any>('/notifications/sms/options/');setStudents(x.students);setBooks(x.books);setTemplates(x.templates)}useEffect(()=>{load().catch(e=>setError(e.message))},[]);async function act(fn:()=>Promise<unknown>,msg:string){setBusy(true);setError('');setSuccess('');try{await fn();setSuccess(msg);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}const tabs=[['absence','غیبت دستی',UserX],['send','ارسال پیامک',Send],['contacts','دفترچه‌ها',BookUser],['templates','الگوها',MessageSquareText],['reports','گزارش‌ها',History]] as const;return <div className="sms-management"><section className="card sms-hero"><div><span className="badge">فراز اس‌ام‌اس</span><h2>مرکز پیامک مدرسه</h2><p className="muted">ارسال، زمان‌بندی، مخاطبین همگام و گزارش کامل</p></div><MessageSquareText size={36}/></section><div className="sms-tabs">{tabs.map(([id,label,Icon])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</div>{error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}{tab==='absence'&&<Absence students={students} busy={busy} act={act}/>} {tab==='send'&&<Bulk books={books} templates={templates} busy={busy} act={act}/>} {tab==='contacts'&&<Contacts books={books} busy={busy} act={act}/>} {tab==='templates'&&<Templates rows={templates} busy={busy} act={act}/>} {tab==='reports'&&<Reports/>}</div>}
function Absence({students,busy,act}:any){const [q,setQ]=useState(''),[chosen,setChosen]=useState<Student|null>(null);const matches=q?students.filter((x:Student)=>(x.name+x.student_code).includes(q)).slice(0,8):[];return <section className="card"><h3>اعلام غیبت دستی</h3><p className="muted">نام یا کد دانش‌آموزی را جست‌وجو کنید؛ پیام فقط به ولی اصلی می‌رود.</p><label>دانش‌آموز<input value={q} onChange={e=>{setQ(e.target.value);setChosen(null)}}/></label>{matches.length>0&&<div className="sms-search-results">{matches.map((x:Student)=><button key={x.id} onClick={()=>{setChosen(x);setQ(x.name)}}><b>{x.name}</b><small>{x.student_code||'بدون کد'} · {x.guardian_name||'ولی اصلی'}</small></button>)}</div>}{chosen&&<div className="notice">گیرنده: {chosen.guardian_name||'ولی اصلی'} · {mask(chosen.guardian_phone)} <button className="button small" disabled={busy||!chosen.guardian_phone} onClick={()=>act(()=>send('/notifications/sms/absence/',{student_id:chosen.id}),'پیامک غیبت در صف قرار گرفت.')}>تأیید و ارسال</button></div>}</section>}
function Bulk({books,templates,busy,act}:any){const [mode,setMode]=useState('manual'),[ids,setIds]=useState<number[]>([]);return <section className="card"><h3>ارسال پیامک</h3><div className="sms-mode"><button type="button" className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>ورود شماره</button><button type="button" className={mode==='book'?'active':''} onClick={()=>setMode('book')}>دفترچه مخاطبین</button><button type="button" className={mode==='excel'?'active':''} onClick={()=>setMode('excel')}>فایل Excel</button></div><form onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const d=new FormData(e.currentTarget);d.set('mode',mode);d.set('book_ids',JSON.stringify(ids));act(()=>api('/notifications/sms/send/',{method:'POST',body:d}),'پیامک‌ها در صف قرار گرفتند.')}}>{mode==='manual'?<label>شماره‌ها<textarea name="numbers" required placeholder="با فاصله یا ویرگول جدا کنید"/></label>:mode==='excel'?<div className="sms-import"><FileUpload title="فایل Excel" name="file" accept=".xlsx" hint="Excel تا ۲ مگابایت" maxSize={2*1024*1024} required disabled={busy}/><a className="text-link" href="/api/v1/notifications/sms/contact-template/" download><FileSpreadsheet size={15}/>دانلود نمونه</a></div>:<div className="sms-book-grid">{books.map((x:Book)=><label key={x.id}><input type="checkbox" onChange={e=>setIds(e.target.checked?[...ids,x.id]:ids.filter(i=>i!==x.id))}/><span><b>{x.name}</b><small>{fa(x.count)} مخاطب</small></span></label>)}</div>}<div className="form-grid"><label>الگو<select name="template_id"><option value="">بدون الگو</option>{templates.map((x:Template)=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label><PersianDateTimePicker label="زمان ارسال" name="scheduled_for" disabled={busy}/></div><label>متن<textarea name="body" maxLength={1000} placeholder="با انتخاب الگو اختیاری است"/></label><button className="button" disabled={busy||(mode==='book'&&!ids.length)}><Send size={16}/>ثبت در صف</button></form></section>}
type ContactPage<T>={records:T[];count:number;page:number;pages:number;book?:Book};
type ContactQuery={page:number;q:string};
type ContactAction=(work:()=>Promise<unknown>,message:string)=>Promise<void>;
function useContactPage<T>(path:string|null,query:ContactQuery,revision:Book[],bookId?:number){
 const [pageSize,setPageSize]=useState(20);
 const params=new URLSearchParams({page:String(query.page),q:query.q,page_size:String(pageSize)});
 if(bookId)params.set('book_id',String(bookId));
 const key=path?path+'?'+params:null;
 const [result,setResult]=useState<{key:string;revision:Book[];data?:ContactPage<T>;error?:string}>();
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!key)return;
  let live=true;
  api<ContactPage<T>>(key).then(data=>{if(live)setResult({key,revision,data})}).catch(error=>{if(live)setResult({key,revision,error:error.message})});
  return()=>{live=false};
 },[key,revision,retry]);
 const current=result?.key===key&&result?.revision===revision?result:undefined;
 function reload(){setResult(undefined);setRetry(value=>value+1)}
 return {pageSize,setPageSize,data:current?.data,error:current?.error,pending:Boolean(key)&&!current,reload};
}
function ContactSearch({label,value,onSearch}:{label:string;value:string;onSearch:(value:string)=>void}){
 const [draft,setDraft]=useState(value),input=useRef<HTMLInputElement>(null),composing=useRef(false);
 useEffect(()=>setDraft(value),[value]);
 return <form className="inline-form" role="search" onSubmit={event=>{event.preventDefault();if(!composing.current)onSearch(draft.trim())}}>
  <label>{label}<input ref={input} type="search" maxLength={120} value={draft} onCompositionStart={()=>{composing.current=true}} onCompositionEnd={()=>{composing.current=false}} onChange={event=>{setDraft(event.target.value);if(!event.target.value)onSearch('')}} onKeyDown={event=>{if(event.key==='Enter'&&event.nativeEvent.isComposing)event.preventDefault()}}/></label>
  {draft&&<button type="button" className="text-link" aria-label={'پاک کردن '+label} title={'پاک کردن '+label} onClick={()=>{setDraft('');onSearch('');input.current?.focus()}}><X size={16}/></button>}
  <button className="button outline small"><Search size={16}/>جست‌وجو</button>
 </form>;
}
function Contacts({books,busy,act}:{books:Book[];busy:boolean;act:ContactAction}){
 const [selected,setSelected]=useState<Book|null>(null),[bookQuery,setBookQuery]=useState<ContactQuery>({page:1,q:''}),[entryQuery,setEntryQuery]=useState<ContactQuery>({page:1,q:''});
 const list=useContactPage<Book>('/notifications/sms/contact-books/',bookQuery,books);
 const entries=useContactPage<Entry>(selected?'/notifications/sms/contact-entries/':null,entryQuery,books,selected?.id);
 const detail=entries.data?.book||selected;
 const entryBusy=busy||entries.pending||Boolean(entries.error);
 useEffect(()=>{if(list.data&&list.data.page!==bookQuery.page)setBookQuery(current=>({...current,page:list.data!.page}))},[list.data,bookQuery.page]);
 useEffect(()=>{if(entries.data&&entries.data.page!==entryQuery.page)setEntryQuery(current=>({...current,page:entries.data!.page}))},[entries.data,entryQuery.page]);
 function open(book:Book){setSelected(book);setEntryQuery({page:1,q:''})}
 return <div className="sms-contact-layout">
  <section className="card" aria-label="دفترچه‌های مخاطبین">
   <div className="section-title"><h3>دفترچه‌ها</h3><a className="text-link" href="/api/v1/notifications/sms/contact-template/" download><FileSpreadsheet size={15}/>Excel نمونه</a></div>
   <ContactSearch label="جست‌وجوی دفترچه" value={bookQuery.q} onSearch={q=>setBookQuery({q,page:1})}/>
   <form className="inline-form" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;act(async()=>{const book=await send<Book>('/notifications/sms/contact-books/',{name:new FormData(form).get('name')});form.reset();open(book);setBookQuery({q:'',page:1})},'دفترچه ساخته شد.')}}><input name="name" aria-label="نام دفترچه" required placeholder="نام دفترچه"/><button className="button small" disabled={busy}>ساخت</button></form>
   {list.pending&&<p role="status">در حال دریافت دفترچه‌ها…</p>}
   {list.error&&<div className="error" role="alert">{list.error}<button type="button" className="text-link" onClick={list.reload}><RefreshCw size={15}/>تلاش دوباره</button></div>}
   <div className="sms-book-list" aria-busy={list.pending}>{list.data?.records.map(book=><button type="button" key={book.id} className={selected?.id===book.id?'active':''} aria-pressed={selected?.id===book.id} onClick={()=>open(book)}><span><b>{book.name}</b><small>{book.system?'همگام خودکار':'دستی'}</small></span><em>{fa(book.count)}</em></button>)}</div>
   {list.data&&!list.data.records.length&&<p role="status" className="notice">{bookQuery.q?'دفترچه‌ای با این جست‌وجو پیدا نشد.':'دفترچه‌ای وجود ندارد.'}</p>}
   <Pagination pageSize={list.pageSize} onPageSizeChange={size=>{list.setPageSize(size);setBookQuery(current=>({...current,page:1}))}} page={list.data?.page||bookQuery.page} pages={list.data?.pages||bookQuery.page} count={list.data?.count} busy={list.pending||Boolean(list.error)||busy} onChange={page=>setBookQuery(current=>({...current,page}))} label="صفحه‌بندی دفترچه‌ها"/>
  </section>
  <section className="card" aria-label="مخاطبین دفترچه">
   {!selected?<div className="empty-state">یک دفترچه را انتخاب کنید.</div>:<>
    <div className="section-title"><h3>{detail?.name||selected.name}</h3><button type="button" className="text-link" disabled={entries.pending||busy} onClick={entries.reload}><RefreshCw size={15}/>تازه‌سازی</button></div>
    <ContactSearch key={selected.id} label="جست‌وجوی نام یا شماره مخاطب" value={entryQuery.q} onSearch={q=>setEntryQuery({q,page:1})}/>
    {detail&&!detail.system&&<>
     <form key={'entry-'+detail.id} className="form-grid" onSubmit={event=>{event.preventDefault();if(entryBusy)return;const form=event.currentTarget;act(()=>send('/notifications/sms/contact-entries/',{...Object.fromEntries(new FormData(form)),book_id:detail.id}).then(()=>form.reset()),'مخاطب ذخیره شد.')}}><label>نام<input name="name" required/></label><label>شماره<input name="phone" required/></label><label>توضیح<input name="note"/></label><button className="button small" disabled={entryBusy}>افزودن</button></form>
     <form key={'import-'+detail.id} className="sms-import" onSubmit={event=>{event.preventDefault();if(entryBusy)return;const data=new FormData(event.currentTarget);data.set('book_id',String(detail.id));act(()=>api('/notifications/sms/contact-import/',{method:'POST',body:data}),'Excel وارد شد.')}}><FileUpload title="فایل مخاطبین" name="file" aria-label="فایل مخاطبین" accept=".xlsx" hint="Excel تا ۲ مگابایت" maxSize={2*1024*1024} required disabled={entryBusy}/><button className="button outline small" disabled={entryBusy}><FileSpreadsheet size={15}/>ورود Excel</button></form>
    </>}
    {entries.pending&&<p role="status">در حال دریافت مخاطبین…</p>}
    {entries.error&&<div className="error" role="alert">{entries.error}<button type="button" className="text-link" onClick={entries.reload}><RefreshCw size={15}/>تلاش دوباره</button></div>}
    <div className="table-wrap" aria-busy={entries.pending}><table><thead><tr><th>نام</th><th>شماره</th><th>توضیح</th>{detail&&!detail.system&&<th/>}</tr></thead><tbody>{entries.data?.records.map((entry,index)=><tr key={entry.id??entry.phone+':'+index}><td>{entry.name}</td><td dir="ltr">{entry.phone}</td><td>{entry.note||'—'}</td>{detail&&!detail.system&&<td><button type="button" className="text-link danger" disabled={busy} onClick={()=>act(()=>api('/notifications/sms/contact-entries/?id='+entry.id,{method:'DELETE'}),'مخاطب حذف شد.')}>حذف</button></td>}</tr>)}</tbody></table></div>
    {entries.data&&!entries.data.records.length&&<p role="status" className="notice">{entryQuery.q?'مخاطبی با این جست‌وجو پیدا نشد.':'این دفترچه مخاطبی ندارد.'}</p>}
    <Pagination pageSize={entries.pageSize} onPageSizeChange={size=>{entries.setPageSize(size);setEntryQuery(current=>({...current,page:1}))}} page={entries.data?.page||entryQuery.page} pages={entries.data?.pages||entryQuery.page} count={entries.data?.count} busy={entries.pending||Boolean(entries.error)||busy} onChange={page=>setEntryQuery(current=>({...current,page}))} label="صفحه‌بندی مخاطبین"/>
   </>}
  </section>
 </div>;
}
function Templates({rows,busy,act}:any){const [edit,setEdit]=useState<Template|null>(null),[q,setQ]=useState('');const matches=(rows as Template[]).filter(row=>(row.title+' '+row.body).toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()));return <div className="sms-contact-layout"><section className="card"><h3>{edit?'ویرایش الگو':'ساخت الگو'}</h3><form key={edit?.id||0} onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=e.currentTarget;act(()=>send('/notifications/sms/templates/',{...Object.fromEntries(new FormData(f)),...(edit?{id:edit.id}:{})}).then(()=>{f.reset();setEdit(null)}),'الگو ذخیره شد.')}}><label>عنوان<input name="title" required defaultValue={edit?.title}/></label><label>متن<textarea name="body" required defaultValue={edit?.body}/></label><label>کد پترن فراز (اختیاری)<input name="provider_pattern_code" defaultValue={edit?.provider_pattern_code}/></label><button className="button" disabled={busy}>ذخیره</button></form></section><section className="card"><h3>الگوهای آماده</h3><label>جست‌وجوی الگو<input type="search" maxLength={120} value={q} onChange={event=>setQ(event.target.value)}/></label>{q&&<button type="button" className="text-link" onClick={()=>setQ('')}>پاک کردن جست‌وجوی الگو</button>}{!matches.length&&<p className="notice">الگویی با این جست‌وجو پیدا نشد.</p>}<div className="sms-template-list">{matches.map((x:Template)=><article key={x.id}><div><b>{x.title}</b><p>{x.body}</p></div><button className="text-link" onClick={()=>setEdit(x)}>ویرایش</button></article>)}</div></section></div>}
type ReportResult={records:{id:number;recipient:string;body:string;status:string;last_error:string;created_at:string}[];count:number;pages:number;summary:Record<string,number>};
function Reports(){
 const [pageSize,setPageSize]=useState(50);

 const [data,setData]=useState<ReportResult>(),[status,setStatus]=useState('all'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[page,setPage]=useState(1),[busy,setBusy]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 const request=useRef(0);
 useEffect(()=>{
  const ticket=++request.current;setBusy(true);setError('');setData(undefined);
  api<ReportResult>(withPageSize(`/notifications/sms/?status=${status}&start=${start}&end=${end}&page=${page}`,pageSize)).then(result=>{
   if(ticket!==request.current)return;
   if(page>result.pages){setPage(Math.max(1,result.pages));return}
   setData(result);
  }).catch(e=>{if(ticket===request.current)setError((e as Error).message)}).finally(()=>{if(ticket===request.current)setBusy(false)});
  return()=>{request.current++};
 },[status,start,end,page,revision,pageSize]);
 function filter(update:()=>void){request.current++;setBusy(true);setData(undefined);setError('');setPage(1);update()}
 function reload(){request.current++;setBusy(true);setRevision(x=>x+1)}
 async function deliver(path:string){setBusy(true);setError('');setMessage('');try{const result=await send(path,{});setMessage(result.detail);setRevision(x=>x+1)}catch(e){setError((e as Error).message);setBusy(false)}}
 const labels:Record<string,string>={pending:'در صف',processing:'در حال ارسال',retry:'تلاش مجدد',sent:'ارسال‌شده',failed:'ناموفق'};
 return <section className="card"><div className="section-title"><h3>گزارش ارسال‌ها</h3><div className="sms-report-actions"><button className="button small" disabled={busy||!(data?.summary.pending||data?.summary.retry)} onClick={()=>deliver('/notifications/sms/send-pending/')}><Send size={15}/>ارسال همه در صف</button><button className="text-link" disabled={busy} onClick={reload}><RefreshCw size={15}/>تازه‌سازی</button></div></div>{message&&<div className="success" role="status">{message}</div>}<div className="toolbar"><PersianDatePicker label="از" value={start} onChange={value=>filter(()=>setStart(value))} clearable/><PersianDatePicker label="تا" value={end} onChange={value=>filter(()=>setEnd(value))} clearable/><label>وضعیت<select aria-label="وضعیت" value={status} onChange={e=>filter(()=>setStatus(e.target.value))}><option value="all">همه</option><option value="pending">در صف</option><option value="retry">تلاش مجدد</option><option value="sent">ارسال‌شده</option><option value="failed">ناموفق</option></select></label><button className="button small" disabled={busy} onClick={reload}>اعمال</button></div>
 {busy&&<p role="status" className="muted">در حال دریافت…</p>}
 {error&&<div className="error" role="alert">{error}<button className="text-link" onClick={reload}><RefreshCw size={15}/>تلاش دوباره</button></div>}
 <div className="table-wrap" aria-busy={busy}><table><thead><tr><th>گیرنده</th><th>متن</th><th>وضعیت</th><th>ثبت</th><th>عملیات</th></tr></thead><tbody>{data?.records.map(x=><tr key={x.id}><td dir="ltr">{x.recipient}</td><td>{x.body}</td><td>{labels[x.status]||x.status}{x.last_error&&<small className="error">{x.last_error}</small>}</td><td>{new Date(x.created_at).toLocaleString('fa-IR')}</td><td>{['pending','retry'].includes(x.status)?<button className="button outline small" disabled={busy} onClick={()=>deliver(`/notifications/sms/${x.id}/send/`)}><Send size={14}/>ارسال</button>:'—'}</td></tr>)}</tbody></table></div>
 {!busy&&!error&&data&&!data.records.length&&<div className="empty-state">پیامکی با این فیلترها وجود ندارد.</div>}
 <Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} page={page} pages={data?.pages||page} count={data?.count} busy={busy||Boolean(error)} onChange={next=>{request.current++;setBusy(true);setData(undefined);setPage(next)}} label="گزارش ارسال‌ها"/>
 </section>
}
const mask=(x:string)=>x?x.slice(0,4)+'•••'+x.slice(-4):'شماره ثبت نشده';
