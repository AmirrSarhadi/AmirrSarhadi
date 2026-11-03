"use client";
import {FileUpload} from "@/components/ui/file-upload-04";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,CheckCircle,FileText,Search,UploadCloud} from "lucide-react";
import {PublicFooter,PublicHeader} from "@/components/public-shell";
import {PublicExperience} from "@/components/public-experience";
import {PublicPageIntro} from "@/components/public-page-intro";
import {api,dateFa} from "@/lib/api";

type Field={id:number;key:string;label:string;required:boolean;active:boolean;position:number};
type Requirement={id:number;title:string;required:boolean;active:boolean;position:number};
type Config={settings:{accepting:boolean;intro:string;retention_days:number};fields:Field[];documents:Requirement[]};

export default function Admissions(){
 const [config,setConfig]=useState<Config|null>(null),[tracking,setTracking]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[major,setMajor]=useState("science");
 useEffect(()=>{api<Config>("/admissions/config/").then(setConfig).catch(e=>setError(e.message));const q=new URLSearchParams(window.location.search).get("major");if(["math","science"].includes(q||""))setMajor(q!)},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");try{const data=new FormData(e.currentTarget);for(const [key,value] of [...data.entries()])if(value instanceof File&&!value.size)data.delete(key);const result=await api<{tracking:string}>("/admissions/",{method:"POST",body:data});setTracking(result.tracking)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const fields=(config?.fields||[]).filter(x=>x.active).sort((a,b)=>a.position-b.position);
 return <PublicExperience className="admission-page"><PublicHeader/><main id="main-content"><PublicPageIntro title="یک قدم به مدرسه نمونه نزدیک‌تر." kicker="پذیرش و ثبت‌نام"><p>آغاز آشنایی مدرسه و خانواده؛ درخواست اولیه و پیگیری مراحل پذیرش.</p></PublicPageIntro><div id="public-page-content" className="admission-layout"><aside data-public-reveal><span className="eyebrow">شروع آشنایی ما</span><h2>از درخواست تا دیدار</h2><p>{config?.settings.intro||"اطلاعات اولیه را ثبت کنید. ادامه مراحل پذیرش و بررسی مدارک به‌صورت حضوری انجام می‌شود."}</p><div className="admission-step"><span>۱</span><div><b>ثبت اطلاعات اولیه</b><small>تکمیل فرم و مدارک اعلام‌شده</small></div></div><div className="admission-step"><span>۲</span><div><b>دریافت کد پیگیری</b><small>کد را نزد خود نگه دارید</small></div></div><div className="admission-step"><span>۳</span><div><b>ادامه مراحل حضوری</b><small>ثبت درخواست به معنی پذیرش نیست</small></div></div></aside><div className="admission-side"><section className="card admission-form" data-public-reveal>{tracking?<div className="success-block"><CheckCircle size={56}/><h2>درخواست شما دریافت شد</h2><p>کد پیگیری درخواست</p><strong className="tracking" dir="ltr">{tracking}</strong><p className="muted">کد را نگه دارید. رسید پیامکی در صف امن ارسال قرار گرفته است.</p><Link href="/" className="button">بازگشت به صفحه اصلی</Link></div>:<><div className="card-heading"><FileText/><div><h2>درخواست ثبت‌نام</h2><p>فیلدها و مدارک ستاره‌دار الزامی هستند.</p></div></div>{!config?<p role="status">در حال دریافت فرم پذیرش…</p>:!config.settings.accepting?<div className="notice"><b>ثبت درخواست جدید موقتاً بسته است.</b><br/>برای اطلاع بیشتر با مدرسه تماس بگیرید.</div>:<form noValidate data-persian-validation onSubmit={submit}><div className="form-grid">{fields.map(field=><AdmissionFieldInput key={field.id} field={field} major={major} setMajor={setMajor}/>)}</div>{config.documents.filter(x=>x.active).map(document=><FileUpload key={document.id} title={document.title} hint="عکس JPG/PNG یا PDF، حداکثر ۵ مگابایت" name={`document_${document.id}`} required={document.required} accept=".jpg,.jpeg,.png,.pdf" maxSize={5*1024*1024} disabled={busy}/>)}{error&&<div role="alert" className="error">{error}</div>}<button className="button full" disabled={busy}>{busy?"در حال ثبت…":"ثبت درخواست و دریافت کد پیگیری"}<ArrowLeft size={18}/></button><p className="privacy-note">اطلاعات و مدارک فقط در اختیار مدیر و معاون است و پس از {new Intl.NumberFormat("fa-IR").format(config.settings.retention_days)} روز طبق سیاست نگهداری حذف می‌شود.</p></form>}</>}</section><TrackingLookup/></div></div></main><PublicFooter/></PublicExperience>;
}

function AdmissionFieldInput({field,major,setMajor}:{field:Field;major:string;setMajor:(value:string)=>void}){
 const common={name:field.key,required:field.required};
 if(field.key==="student_name"||field.key==="parent_name"){const prefix=field.key==="student_name"?"student":"parent",person=prefix==="student"?"دانش‌آموز":"والد";return <><label>نام {person}<input name={`${prefix}_first_name`} required={field.required} maxLength={60}/></label><label>نام خانوادگی {person}<input name={`${prefix}_last_name`} required={field.required} maxLength={60}/></label></>}
 if(field.key==="grade")return <label>{field.label}{field.required?" *":""}<select {...common}><option value="10">دهم</option></select></label>;
 if(field.key==="major")return <label>{field.label}{field.required?" *":""}<select {...common} value={major} onChange={e=>setMajor(e.target.value)}><option value="math">ریاضی‌فیزیک</option><option value="science">علوم تجربی</option></select></label>;
 if(field.key==="address"||field.key==="note")return <label className="wide-field">{field.label}{field.required?" *":""}<textarea {...common} rows={2} maxLength={field.key==="note"?2000:1000}/></label>;
 const phone=field.key==="phone";
 return <label>{field.label}{field.required?" *":""}<input {...common} maxLength={phone?11:field.key==="previous_school"?180:120} type={phone?"tel":"text"} pattern={phone?"0?9[0-9]{9}":undefined} dir={phone?"ltr":undefined}/></label>;
}

function TrackingLookup(){
 const [result,setResult]=useState<{student_name:string;created_at:string;detail:string}|null>(null),[error,setError]=useState("");
 async function lookup(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");setResult(null);const data=Object.fromEntries(new FormData(e.currentTarget));try{setResult(await api("/admissions/tracking/",{method:"POST",body:JSON.stringify(data)}))}catch(e){setError((e as Error).message)}}
 return <section className="card tracking-lookup" data-public-reveal><h3>پیگیری دریافت درخواست</h3><p>کد پیگیری و همان شماره موبایل ثبت‌شده را وارد کنید.</p><form noValidate data-persian-validation onSubmit={lookup}><div className="form-grid"><label>کد پیگیری<input name="tracking" required maxLength={32} dir="ltr"/></label><label>شماره موبایل<input name="phone" required pattern="0?9[0-9]{9}" maxLength={11} dir="ltr"/></label></div><button className="button outline small"><Search size={15}/>بررسی کد</button></form>{error&&<div className="error" role="alert">{error}</div>}{result&&<div className="success"><b>{result.student_name}</b> · {dateFa(result.created_at)}<br/>{result.detail}</div>}</section>;
}
