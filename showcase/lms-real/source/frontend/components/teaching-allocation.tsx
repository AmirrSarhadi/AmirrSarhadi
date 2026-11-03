"use client";
import {FormEvent,useEffect,useState} from "react";
import {BookOpen,Check,GraduationCap,RefreshCw,UserRound,X} from "lucide-react";
import {api,fa} from "@/lib/api";
import {confirmAction,isActionCancelled} from "@/lib/panel-feedback";
import {SearchableDropdown} from "@/components/ui/searchable-dropdown";
import "@/app/teaching-allocation.css";

type Catalog={subjects:{subject:string;teachers:{id:number;teacher_id:number;name:string;unit_count:number;version:number}[]}[];classes:{id:number;title:string;year:string}[]};
export function TeachingAllocation({onChanged,onBusyChange}:{onChanged:()=>Promise<void>;onBusyChange:(busy:boolean)=>void}){
 const [data,setData]=useState<Catalog|null>(null),[subjectId,setSubjectId]=useState(""),[teacherId,setTeacherId]=useState(""),[classes,setClasses]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function load(){setLoading(true);setError("");try{setData(await api<Catalog>("/data-exchange/teaching-allocation/"))}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{const controller=new AbortController();api<Catalog>("/data-exchange/teaching-allocation/",{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[]);
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false)},[busy,onBusyChange]);
 const subject=data?.subjects[Number(subjectId)-1],teacher=subject?.teachers.find(row=>String(row.id)===teacherId),selected=data?.classes.filter(row=>classes.includes(String(row.id)))||[];
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;if(busy||!subject||!teacher||!selected.length)return;setBusy(true);setError("");setSuccess("");try{
  const summary=`درس «${subject.subject}» با معلم «${teacher.name}» (${fa(teacher.unit_count)} واحد) به این کلاس‌ها اختصاص داده شود؟ ${selected.map(row=>`${row.title} (${row.year})`).join("، ")}`;
  if(!await confirmAction(summary))return;
  const result=await api<{created:number;unchanged:number}>("/data-exchange/teaching-allocation/",{method:"POST",body:JSON.stringify({source_id:teacher.id,expected_version:teacher.version,classroom_ids:selected.map(row=>row.id)}),confirm:false,form});
  setClasses([]);setSuccess(`${fa(result.created)} تخصیص ثبت شد؛ ${fa(result.unchanged)} تخصیص از قبل موجود بود.`);await onChanged();
 }catch(e){if(!isActionCancelled(e))setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="teaching-allocation" aria-label="تخصیص درس به کلاس" aria-busy={busy||loading}>
  <div className="section-title"><h3>تخصیص درس به کلاس</h3><button type="button" className="text-link" disabled={busy||loading} onClick={()=>{setSubjectId("");setTeacherId("");setClasses([]);load()}}><RefreshCw size={15}/>تازه‌سازی</button></div>
  {error&&<p className="error" role="alert">{error}</p>}{success&&<p className="success" role="status">{success}</p>}
  {loading?<p role="status">در حال دریافت درس‌ها و معلم‌ها…</p>:!data?<button className="button outline" onClick={load}>تلاش دوباره</button>:!data.subjects.length?<p className="notice">درس و معلم ثبت‌شده‌ای برای تخصیص وجود ندارد.</p>:<form aria-label="تخصیص درس و معلم" noValidate onSubmit={submit}>
   <div className="teaching-allocation-fields">
    <div className="allocation-field"><span className="allocation-field-icon"><BookOpen size={20}/></span><SearchableDropdown label="درس" options={data.subjects.map((row,index)=>({value:String(index+1),label:row.subject}))} values={subjectId?[subjectId]:[]} onChange={values=>{setSubjectId(values[0]||"");setTeacherId("");setClasses([]);setSuccess("")}} disabled={busy}/></div>
    <div className="allocation-field"><span className="allocation-field-icon"><UserRound size={20}/></span><SearchableDropdown key={'teacher-'+subjectId} name="source_id" label="معلم درس" options={(subject?.teachers||[]).map(row=>({value:String(row.id),label:row.name}))} values={teacherId?[teacherId]:[]} onChange={values=>{setTeacherId(values[0]||"");setSuccess("")}} disabled={busy||!subject}/></div>
    <div className="allocation-field"><span className="allocation-field-icon"><GraduationCap size={20}/></span><SearchableDropdown key={'classes-'+subjectId} name="classroom_ids" label="کلاس‌ها" options={data.classes.map(row=>({value:String(row.id),label:row.title,detail:row.year}))} multiple values={classes} onChange={setClasses} disabled={busy||!teacher}/></div>
   </div>
   {!!selected.length&&<div className="teaching-allocation-selected">{selected.map(row=><span key={row.id}>{row.title} · {row.year}<button type="button" className="icon-button" disabled={busy} title="حذف از انتخاب" aria-label={`حذف ${row.title} از انتخاب`} onClick={()=>setClasses(ids=>ids.filter(id=>id!==String(row.id)))}><X size={14}/></button></span>)}</div>}
   {!data.classes.length&&<p className="notice">کلاس فعال در سال تحصیلی فعال وجود ندارد.</p>}
   <div className="teaching-allocation-action"><button type="submit" className="button" disabled={busy||!teacher||!selected.length}><Check size={17}/>{busy?"در حال بررسی…":"ثبت"}</button></div>
  </form>}
 </section>;
}
