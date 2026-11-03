"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Archive,Trash2} from "lucide-react";
import {fa,send} from "@/lib/api";
import {FormDialog} from "@/components/ui/form-dialog";
import "@/app/bulk-selection.css";

export function usePageSelection(eligible:number[]){
 const [ids,setIds]=useState<number[]>([]),key=eligible.join(",");
 const clear=useCallback(()=>setIds([]),[]);
 useEffect(clear,[key,clear]);
 const selected=ids.filter(id=>eligible.includes(id));
 return {ids:selected,clear,toggle:(id:number)=>setIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]),all:eligible.length>0&&selected.length===eligible.length,partial:selected.length>0&&selected.length<eligible.length,toggleAll:(checked:boolean)=>setIds(checked?[...eligible]:[])};
}

export function SelectionCheckbox({label,checked,partial=false,disabled=false,reason,onChange}:{label:string;checked:boolean;partial?:boolean;disabled?:boolean;reason?:string;onChange:(checked:boolean)=>void}){
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(input.current)input.current.indeterminate=partial},[partial]);
 return <input ref={input} className="row-selection" type="checkbox" aria-label={label} title={reason||label} checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)}/>;
}

export function BulkArchiveButton({count,disabled,open}:{count:number;disabled:boolean;open:()=>void}){
 return <button type="button" className="button outline small" aria-label="حذف انتخاب‌شده‌ها" disabled={disabled||!count} onClick={open}><Trash2 size={17}/>حذف انتخاب‌شده‌ها <span className="bulk-selection-count">{fa(count)}</span></button>;
}

export type ArchiveEntry={id:number;name:string;enrollment_version?:number};
export function BulkArchiveDialog({entries,kind,classroom,close,saved}:{entries:ArchiveEntry[];kind:"users"|"students";classroom?:number;close:()=>void;saved:()=>void}){
 const [full,setFull]=useState(!classroom),[busy,setBusy]=useState(false),[error,setError]=useState("");
 return <FormDialog title="حذف انتخاب‌شده‌ها" busy={busy} close={close}><form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError("");try{await send(kind==="users"?"/users/archive/":"/students/case-files/archive/",{ids:entries.map(row=>row.id),archive_profile:full,...(classroom?{classroom,expected_versions:Object.fromEntries(entries.map(row=>[String(row.id),row.enrollment_version]))}:{})});close();saved()}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}}><p>{fa(entries.length)} مورد انتخاب شده است.</p><ul className="bulk-archive-names">{entries.map(row=><li key={row.id}>{row.name}</li>)}</ul>{classroom&&<label className="work-check"><input type="checkbox" checked={full} disabled={busy} onChange={event=>setFull(event.target.checked)}/>پرونده کامل دانش‌آموزان بایگانی شود</label>}<p>{full?"موارد انتخاب‌شده غیرفعال و بایگانی می‌شوند. تمام اطلاعات و سوابق حفظ می‌شوند.":"فقط ثبت‌نام موارد انتخاب‌شده در این کلاس بایگانی می‌شود؛ حساب و پرونده‌ها فعال می‌مانند."}</p>{error&&<div className="error" role="alert">{error}</div>}<footer><button type="button" className="button outline" disabled={busy} onClick={close}>انصراف</button><button className="button" disabled={busy}><Archive size={17}/>{full?"بایگانی انتخاب‌شده‌ها":"حذف از کلاس"}</button></footer></form></FormDialog>;
}
