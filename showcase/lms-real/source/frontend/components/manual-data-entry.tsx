"use client";
import {useEffect,useState,type FormEvent} from "react";
import {Plus} from "lucide-react";
import {api} from "@/lib/api";
import {clearFieldError} from "@/lib/form-errors";
import type {RegistrationOptions} from "@/lib/registration-options";

type Kind="classes"|"staff"|"students";
type Field={name:string;required?:boolean;type?:string;options?:string[];placeholder?:string};
type Group={title:string;fields:Field[]};
const field=(name:string,required=true,type="text"):Field=>({name,required,type});
export const manualEntryGroups:Record<Kind,Group[]>={
 classes:[{title:"مشخصات کلاس",fields:[field("سال تحصیلی"),{name:"پایه",options:["10","11","12"]},{name:"رشته",options:["ریاضی","تجربی"]},{name:"کلاس",placeholder:"حرف کلاس، مانند A؛ برای کلاس بدون حرف خالی بگذارید"},{name:"تعداد مورد انتظار دانش‌آموز",type:"number"}]}],
 staff:[
  {title:"مشخصات فردی",fields:[field("نام"),field("نام خانوادگی"),field("کد ملی"),field("شماره تماس",true,"tel")]},
  {title:"اطلاعات شغلی",fields:[field("سمت"),field("کد پرسنلی",false)]},
 ],
 students:[
  {title:"مشخصات دانش‌آموز",fields:[field("نام"),field("نام خانوادگی"),field("کد ملی دانش‌آموز"),field("کد دانش‌آموزی",false),field("شماره دانش‌آموز",false,"tel")]},
  {title:"ثبت‌نام در کلاس",fields:[field("سال تحصیلی"),field("کلاس")]},
  {title:"اطلاعات پدر",fields:[field("نام پدر",false),field("شماره پدر",false,"tel")]},
  {title:"اطلاعات مادر",fields:[field("نام مادر",false),field("نام خانوادگی مادر",false),field("شماره مادر",false,"tel")]},
  {title:"ولی اصلی",fields:[{name:"ولی اصلی",options:["پدر","مادر"]},field("کد ملی ولی اصلی")]},
 ],
};

export function ManualDataEntry({kind,busy,onSubmit}:{kind:Kind;busy:boolean;onSubmit:(event:FormEvent<HTMLFormElement>)=>void}){
 const [data,setData]=useState<RegistrationOptions|null>(null),[error,setError]=useState(""),[revision,setRevision]=useState(0),[year,setYear]=useState(""),[classId,setClassId]=useState("");
 const needsOptions=kind!=="staff";
 const [guardian,setGuardian]=useState("");
 useEffect(()=>{
  if(!needsOptions)return;
  let live=true;setError("");setData(null);
  api<RegistrationOptions>("/data-exchange/options/").then(value=>{if(live)setData(value)}).catch(reason=>{if(live)setError(reason.message)});
  return()=>{live=false};
 },[needsOptions,revision]);
 const selected=data?.classes.find(row=>String(row.id)===classId);
 return <form className="exchange-manual" aria-label="ورود دستی اطلاعات" noValidate data-persian-validation onSubmit={onSubmit}>
  {error&&<div className="error" role="alert">{error}<button type="button" className="text-link" disabled={busy} onClick={()=>setRevision(value=>value+1)}>تلاش دوباره</button></div>}
  {needsOptions&&!data&&!error&&<p role="status">در حال دریافت سال‌ها و کلاس‌ها…</p>}
  {needsOptions&&data&&!data.years.length&&<p className="notice">ابتدا سال تحصیلی را در ساختار مدرسه ثبت کنید.</p>}
  {manualEntryGroups[kind].map(group=><fieldset key={group.title} className="exchange-field-group" disabled={busy||needsOptions&&!data}>
   <legend>{group.title}</legend><div className="exchange-field-grid">{group.fields.map(item=><label key={item.name}>{item.name}{
    item.name==="سال تحصیلی"?<select aria-label={item.name} name={item.name} required value={year} onChange={event=>{setYear(event.target.value);setClassId("")}}><option value="">انتخاب سال تحصیلی</option>{data?.years.map(row=><option key={row.id} value={row.title}>{row.title}</option>)}</select>:
    kind==="students"&&item.name==="کلاس"?<select aria-label="کلاس" name="classroom_id" required value={classId} disabled={!year||busy} onChange={event=>setClassId(event.target.value)}><option value="">انتخاب کلاس</option>{data?.classes.filter(row=>row.year===year).map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select>:
    item.options?<select aria-label={item.name} name={item.name} required defaultValue="" onChange={item.name==="ولی اصلی"?event=>{setGuardian(event.target.value);event.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="شماره پدر"],input[name="شماره مادر"],input[name="نام پدر"],input[name="نام مادر"],input[name="نام خانوادگی مادر"]').forEach(clearFieldError)}:undefined}><option value="" disabled>انتخاب کنید</option>{item.options.map(value=><option key={value}>{value}</option>)}</select>:
    <input name={item.name} type={item.type||"text"} required={["شماره پدر","نام پدر"].includes(item.name)?guardian==="پدر":["شماره مادر","نام مادر","نام خانوادگی مادر"].includes(item.name)?guardian==="مادر":item.required} placeholder={item.placeholder} min={item.type==="number"?1:undefined} max={item.type==="number"?100:undefined} autoComplete="off"/>
   }</label>)}</div>{group.title==="ثبت‌نام در کلاس"&&<p className="muted" role="status">{selected?`پایه ${selected.grade} · ${selected.major==="science"?"تجربی":"ریاضی‌فیزیک"}`:year&&!data?.classes.some(row=>row.year===year)?"کلاس فعالی در این سال وجود ندارد؛ ابتدا کلاس را ثبت کنید.":""}</p>}</fieldset>)}
  <div className="exchange-form-action"><button className="button" disabled={busy||needsOptions&&(!data?.years.length||!!error)||kind==="students"&&!selected} type="submit"><Plus size={16}/>ثبت اطلاعات</button></div>
 </form>;
}
