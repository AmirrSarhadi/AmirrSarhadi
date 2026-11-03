"use client";
import {useEffect,useRef,useState} from "react";
import {Archive,BookOpen,GraduationCap,Link2,RefreshCw,RotateCcw,School,Trash2,X} from "lucide-react";
import {api,send,fa} from "@/lib/api";
import {Pagination} from "@/components/ui/pagination";
import {ArchivedStudents} from "@/components/archived-students";
import {SelectionCheckbox,usePageSelection} from "@/components/bulk-archive";
import {confirmAction} from "@/lib/panel-feedback";
import "@/app/school-structure.css";
import "@/app/structure-archive.css";

type ArchiveRow={id:number;version:number;kind:string;title:string;detail:string;can_restore:boolean;blocked_by:string};
type ArchivePage={records:ArchiveRow[];count:number;page:number;pages:number;page_size:number;can_delete?:boolean;year_choices:{id:number;title:string}[]};
const groups=[
 {id:"years",label:"سال‌های تحصیلی",icon:School},
 {id:"classes",label:"کلاس‌ها",icon:School},
 {id:"teachings",label:"درس و معلم",icon:BookOpen},
 {id:"enrollments",label:"ثبت‌نام‌های کلاسی",icon:GraduationCap},
 {id:"family-links",label:"ارتباط‌های خانواده",icon:Link2},
];

export function StructureArchive(){
 const [kind,setKind]=useState("all"),[year,setYear]=useState(""),[search,setSearch]=useState(""),[query,setQuery]=useState(""),[years,setYears]=useState<{id:number;title:string}[]>([]);
 const [reload,setReload]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),search?300:0);return()=>clearTimeout(timer)},[search]);
 async function restore(row:ArchiveRow){if(busy)return;setBusy(true);setError("");setSuccess("");try{await send(`/structure/${row.kind}/${row.id}/status/`,{active:true,expected_version:row.version,reason:`بازگردانی ${row.title} از بایگانی`});setSuccess(`«${row.title}» بازگردانده شد.`);setReload(value=>value+1)}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}
 async function bulk(rows:ArchiveRow[],action:"restore"|"delete"){
  if(busy||!rows.length)return;setBusy(true);setError("");setSuccess("");
  try{
   const message=action==="delete"?"حذف دائمی و غیرقابل‌بازگشت موارد زیر انجام شود؟ اگر وابستگی حفاظت‌شده‌ای وجود داشته باشد هیچ موردی حذف نمی‌شود.":"موارد زیر از بایگانی بازگردانده شوند؟ کلاس، سال و حساب‌های وابسته باید فعال باشند؛ در صورت خطای هر مورد هیچ تغییری ثبت نمی‌شود.";
   if(!await confirmAction(message+"\n\n"+rows.map(row=>row.title).join("، "),action==="delete"?"حذف دائمی":"بازگردانی",action==="delete"))return;
   await send(`/structure/archive/${rows[0].kind}/`,{entries:rows.map(row=>({id:row.id,expected_version:row.version})),action,confirm:true},{confirm:false});
   setSuccess(`${fa(rows.length)} مورد ${action==="delete"?"برای همیشه حذف شد.":"بازگردانده شد."}`);setReload(value=>value+1);
  }catch(reason){setError((reason as Error).message)}finally{setBusy(false)}
 }
 return <section className="archive-module"><header className="archive-intro"><div><span className="badge">مدیریت سوابق</span><h2>بایگانی ساختار مدرسه</h2><p>موارد حذف‌شده بر اساس موضوع نگهداری می‌شوند و در صورت نیاز قابل بازگردانی‌اند.</p></div><Archive/></header>
 <form className="flow-toolbar archive-filters" aria-label="فیلتر بایگانی" onSubmit={event=>{event.preventDefault();setQuery(search.trim())}}><label>دسته<select aria-label="دسته" value={kind} disabled={busy} onChange={event=>setKind(event.target.value)}><option value="all">همه دسته‌ها</option>{groups.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}</select></label><label>سال تحصیلی<select aria-label="سال تحصیلی" value={year} disabled={busy} onChange={event=>setYear(event.target.value)}><option value="">همه سال‌ها</option>{years.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label><label>جستجو<span style={{display:"flex",gap:8}}><input ref={input} type="search" aria-label="جستجو" maxLength={120} value={search} disabled={busy} onChange={event=>setSearch(event.target.value)}/>{search&&<button type="button" className="icon-button" aria-label="پاک کردن جستجو" onClick={()=>{setSearch("");setQuery("");input.current?.focus()}}><X size={16}/></button>}</span></label></form>
 {error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status">{success}</div>}<div className="archive-summary"><button className="text-link" disabled={busy} onClick={()=>setReload(value=>value+1)}><RefreshCw size={15}/>تازه‌سازی</button></div>
 {kind==="all"&&<ArchivedStudents query={query} reload={reload}/>}
 {groups.filter(group=>kind==="all"||kind===group.id).map(group=><ArchiveGroup key={group.id} group={group} year={year} query={query} reload={reload} busy={busy} restore={restore} bulk={bulk} years={setYears}/>)}</section>;
}

function ArchiveGroup({group,year,query,reload,busy,restore,bulk,years}:{group:(typeof groups)[number];year:string;query:string;reload:number;busy:boolean;restore:(row:ArchiveRow)=>Promise<void>;bulk:(rows:ArchiveRow[],action:"restore"|"delete")=>Promise<void>;years:(rows:{id:number;title:string}[])=>void}){
 const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[data,setData]=useState<ArchivePage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const selection=usePageSelection(!loading&&!error?data?.records.map(row=>row.id)||[]:[]);
 const selected=data?.records.filter(row=>selection.ids.includes(row.id))||[];
 useEffect(()=>setPage(1),[year,query]);
 useEffect(()=>{let live=true;setLoading(true);setError("");const params=new URLSearchParams({scope:"archive",kind:group.id,year,q:query,page:String(page),page_size:String(pageSize)});if(!year)params.delete("year");
 api<ArchivePage>("/structure/?"+params).then(value=>{if(!live)return;setData(value);years(value.year_choices||[]);if(value.page!==page)setPage(value.page)}).catch(reason=>{if(live)setError(reason.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[group.id,year,query,page,pageSize,reload,retry,years]);
 return <section className="archive-group" aria-labelledby={`archive-${group.id}`} aria-busy={loading}><header><group.icon size={20}/><h3 id={`archive-${group.id}`}>{group.label}</h3><span>{fa(data?.count||0)} مورد</span></header>
 <div className="archive-bulk-actions"><button type="button" className="button outline small" disabled={busy||loading||!selected.length||selected.some(row=>!row.can_restore)} title={selected.some(row=>!row.can_restore)?"ابتدا وابستگی‌های غیرفعال موارد انتخاب‌شده را بازگردانید.":undefined} onClick={()=>void bulk(selected,"restore")}><RotateCcw size={16}/>بازگردانی انتخاب‌شده‌ها ({fa(selected.length)})</button>{data?.can_delete&&<button type="button" className="button outline small" disabled={busy||loading||!selected.length} onClick={()=>void bulk(selected,"delete")}><Trash2 size={16}/>حذف دائمی انتخاب‌شده‌ها ({fa(selected.length)})</button>}</div>
 {error&&<div className="error" role="alert">{error}<button className="text-link" disabled={loading} onClick={()=>setRetry(value=>value+1)}>تلاش دوباره</button></div>}
 <div className="table-wrap structure-table-wrap archive-table-wrap" role="region" aria-label={`جدول ${group.label}`} tabIndex={0}><table className="structure-table archive-table" aria-label={group.label}><thead><tr><th scope="col" className="selection-cell"><SelectionCheckbox label={`انتخاب همه ${group.label} این صفحه`} checked={selection.all} partial={selection.partial} disabled={busy||loading||!!error||!data?.records.length} onChange={selection.toggleAll}/></th>{["ردیف","عنوان","اطلاعات","وضعیت بازگردانی","عملیات"].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
 {loading?<tr><td colSpan={6} role="status">در حال دریافت بایگانی…</td></tr>:!error&&data?.records.map((row,index)=><tr key={row.id}><td className="selection-cell"><SelectionCheckbox label={`انتخاب ${row.title}`} checked={selection.ids.includes(row.id)} disabled={busy||loading} onChange={()=>selection.toggle(row.id)}/></td><td>{fa((page-1)*pageSize+index+1)}</td><th scope="row">{row.title}</th><td>{row.detail||"—"}</td><td><span className={row.can_restore?"badge green":"badge orange"}>{row.can_restore?"آماده بازگردانی":"بازگردانی غیرفعال"}</span>{row.blocked_by&&<p className="archive-blocked">{row.blocked_by}</p>}</td><td><div className="archive-row-actions">{row.can_restore?<button type="button" className="button outline small" disabled={busy} onClick={()=>void restore(row)}><RotateCcw size={14}/>بازگردانی</button>:<span className="muted">—</span>}{data?.can_delete&&<button type="button" className="icon-button" title="حذف دائمی" aria-label={`حذف دائمی ${row.title}`} disabled={busy||loading} onClick={()=>void bulk([row],"delete")}><Trash2 size={17}/></button>}</div></td></tr>)}
 {!loading&&!error&&!data?.records.length&&<tr><td colSpan={6}>موردی با این فیلترها یافت نشد.</td></tr>}</tbody></table></div>
 <Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setPage(1)}} page={page} pages={data?.pages||1} count={data?.count||0} busy={busy||loading||!!error} label={`صفحه‌بندی ${group.label}`} onChange={setPage}/></section>;
}
