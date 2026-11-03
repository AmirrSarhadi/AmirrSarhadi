"use client";
import {useEffect,useState} from "react";
import {RotateCcw,Trash2} from "lucide-react";
import {api,send,fa} from "@/lib/api";
import {confirmAction} from "@/lib/panel-feedback";
import {SelectionCheckbox,usePageSelection} from "@/components/bulk-archive";
import {Pagination} from "@/components/ui/pagination";

type Row={id:number;name:string;national_id:string};
type Data={records:Row[];count:number;page:number;pages:number;can_delete:boolean};
export function ArchivedStudents({query,reload}:{query:string;reload:number}){
 const [data,setData]=useState<Data>(),[page,setPage]=useState(1),[size,setSize]=useState(10),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const selection=usePageSelection(!loading&&!error?data?.records.map(row=>row.id)||[]:[]);
 useEffect(()=>{setPage(1);selection.clear()},[query]);
 useEffect(()=>{let live=true;setLoading(true);setError("");api<Data>("/students/archived/?"+new URLSearchParams({q:query,page:String(page),page_size:String(size)})).then(value=>{if(live){setData(value);if(value.page!==page)setPage(value.page)}}).catch(reason=>{if(live)setError(reason.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[query,page,size,revision,reload]);
 async function act(rows:Row[],action:"restore"|"delete"){
  if(busy||!rows.length)return;setBusy(true);setError("");
  try{
   const message=action==="delete"?"حذف دائمی و غیرقابل‌بازگشت پرونده، حساب و سوابق این دانش‌آموزان انجام شود؟ حساب ولی اصلی فقط اگر به دانش‌آموز دیگری متصل نباشد حذف می‌شود.":"حساب دانش‌آموزان و ثبت‌نام‌های پیش از بایگانی در کلاس‌ها و سال‌های فعال بازگردانده شوند؟";
   if(!await confirmAction(message+"\n\n"+rows.map(row=>row.name).join("، "),action==="delete"?"حذف دائمی":"بازگردانی",action==="delete"))return;
   await send("/students/archived/",{ids:rows.map(row=>row.id),action,confirm:true},{confirm:false});selection.clear();setRevision(value=>value+1);
  }catch(reason){setError((reason as Error).message)}finally{setBusy(false)}
 }
 return <section className="archive-group" aria-label="پرونده‌های بایگانی‌شده دانش‌آموزان"><header><h3>پرونده‌های بایگانی‌شده دانش‌آموزان</h3><span>{fa(data?.count||0)} مورد</span></header>
 <p className="muted">بازگردانی حساب مستقل از بازگردانی ساختار است؛ کلاس یا سال غیرفعال ابتدا از بایگانی ساختار بازگردانده شود.</p>
 {error&&<div className="error" role="alert">{error}<button className="text-link" onClick={()=>setRevision(value=>value+1)} disabled={loading||busy}>تلاش دوباره</button></div>}
 <div className="archive-bulk-actions"><button type="button" className="button outline small" disabled={busy||loading||!selection.ids.length} onClick={()=>void act(data?.records.filter(row=>selection.ids.includes(row.id))||[],"restore")}><RotateCcw size={16}/>بازگردانی انتخاب‌شده‌ها ({fa(selection.ids.length)})</button>{data?.can_delete&&<button type="button" className="button outline small" disabled={busy||loading||!selection.ids.length} onClick={()=>void act(data.records.filter(row=>selection.ids.includes(row.id)),"delete")}><Trash2 size={16}/>حذف دائمی انتخاب‌شده‌ها ({fa(selection.ids.length)})</button>}</div>
 <div className="table-wrap structure-table-wrap"><table className="structure-table" aria-label="پرونده‌های بایگانی‌شده"><thead><tr><th><SelectionCheckbox label="انتخاب همه دانش‌آموزان این صفحه" checked={selection.all} partial={selection.partial} disabled={loading||busy||!!error||!data?.records.length} onChange={selection.toggleAll}/></th><th>ردیف</th><th>نام دانش‌آموز</th><th>کد ملی</th><th>عملیات</th></tr></thead><tbody>
 {loading?<tr><td colSpan={5}>در حال دریافت…</td></tr>:data?.records.map((row,index)=><tr key={row.id}><td><SelectionCheckbox label={`انتخاب ${row.name}`} checked={selection.ids.includes(row.id)} disabled={busy||loading||!!error} onChange={()=>selection.toggle(row.id)}/></td><td>{fa((page-1)*size+index+1)}</td><th scope="row">{row.name}</th><td><bdi>{row.national_id}</bdi></td><td><div className="form-actions"><button type="button" className="icon-button" title="بازگردانی پرونده" aria-label={`بازگردانی ${row.name}`} disabled={busy} onClick={()=>void act([row],"restore")}><RotateCcw size={18}/></button>{data.can_delete&&<button type="button" className="icon-button" title="حذف دائمی" aria-label={`حذف دائمی ${row.name}`} disabled={busy} onClick={()=>void act([row],"delete")}><Trash2 size={18}/></button>}</div></td></tr>)}
 {!loading&&!data?.records.length&&<tr><td colSpan={5}>پرونده‌ای یافت نشد.</td></tr>}</tbody></table></div>
 <Pagination page={page} pages={data?.pages||1} count={data?.count||0} pageSize={size} onPageSizeChange={value=>{setSize(value);setPage(1)}} onChange={setPage} busy={busy||loading||!!error}/>
 </section>;
}
