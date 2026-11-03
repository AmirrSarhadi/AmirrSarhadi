"use client";
import {useState} from "react";
import {Archive} from "lucide-react";
import {send} from "@/lib/api";
import {FormDialog} from "@/components/ui/form-dialog";

export function ArchiveStudentDialog({student,classroom,close,saved}:{student:{id:number;name:string;enrollment_version?:number};classroom?:number;close:()=>void;saved:()=>void}){
 const [archive,setArchive]=useState(!classroom),[busy,setBusy]=useState(false),[error,setError]=useState("");
 return <FormDialog title={classroom?"حذف دانش‌آموز از کلاس":"بایگانی پرونده دانش‌آموز"} busy={busy} close={close}><form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError("");try{await send(`/students/case-files/${student.id}/archive/`,{archive_profile:archive,...(classroom?{classroom,expected_version:student.enrollment_version}:{})});close();saved()}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}}}><p><strong>{student.name}</strong></p>{classroom&&<label className="work-check"><input type="checkbox" checked={archive} disabled={busy} onChange={event=>setArchive(event.target.checked)}/>پرونده کامل دانش‌آموز بایگانی شود</label>}<p>{archive?"حساب و همه ثبت‌نام‌های دانش‌آموز غیرفعال می‌شوند؛ تمام اطلاعات، نمرات و سوابق محفوظ می‌مانند.":"فقط ثبت‌نام در این کلاس غیرفعال می‌شود؛ پرونده و سوابق دانش‌آموز تغییری نمی‌کند."}</p>{error&&<div className="error" role="alert">{error}</div>}<footer><button type="button" className="button outline" disabled={busy} onClick={close}>انصراف</button><button className="button" disabled={busy}><Archive size={17}/>{archive?"بایگانی پرونده":"حذف از کلاس"}</button></footer></form></FormDialog>;
}
