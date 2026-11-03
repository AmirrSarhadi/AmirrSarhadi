"use client";
import {PencilLoader} from "@/components/ui/loader-1";

import {FormEvent, useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft, RefreshCw, ShieldCheck} from "lucide-react";
import {LoginIllustration} from "@/components/login-illustration";
import {Brand} from "@/components/brand";
import {PasswordRecovery} from "@/components/password-recovery";
import {api, send} from "@/lib/api";
import {isStaffPortalRole, learnerPortalsEnabled} from "@/lib/features";
import {OneTimeCode} from "@/components/ui/one-time-code";
import "@/app/login-experience.css";

export default function Login(){
  const router=useRouter();
  const codeInput=useRef<HTMLInputElement>(null);
  const [ready,setReady]=useState(false),[tab,setTab]=useState("staff"),[role,setRole]=useState("teacher");
  const [step,setStep]=useState(false),[challenge,setChallenge]=useState("");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[cap,setCap]=useState(0),[recovery,setRecovery]=useState(false);
  const [phone,setPhone]=useState(""),[retryAt,setRetryAt]=useState(0),[now,setNow]=useState(Date.now());
  const statusRequest=useRef(0);
  const remaining=Math.max(0,Math.ceil((retryAt-now)/1000));
  async function syncOtp(value?:string){
    const request=++statusRequest.current;
    try{
      const result=await api<{phone?:string;role?:string;challenge?:string;retry_after?:number}>("/auth/otp/request/"+(value?"?phone="+encodeURIComponent(value):""));
      if(request!==statusRequest.current)return;
      const time=Date.now();setNow(time);setRetryAt(time+(result.retry_after||0)*1000);
      if(value===undefined&&result.phone){setPhone(result.phone);if(result.challenge&&result.role&&isStaffPortalRole(result.role)){setRole(result.role);setChallenge(result.challenge);setStep(true)}}
    }catch{/* Sending codes remains guarded by the server if status cannot be loaded. */}
  }
  useEffect(()=>{void syncOtp();const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{statusRequest.current++;clearInterval(timer)}},[]);

  useEffect(()=>{api("/auth/bootstrap/").then(async result=>{if(result.user){if(isStaffPortalRole(result.user.role)){router.replace("/portal/panel");return}if(!learnerPortalsEnabled){const staffRole=result.user.roles?.find((item:string)=>isStaffPortalRole(item));if(staffRole){await send("/auth/active-role/",{role:staffRole});router.replace("/portal/panel");return}await send("/auth/logout/",{}).catch(()=>undefined);setError("پنل دانش‌آموز و خانواده در حال حاضر غیرفعال است.")}}setReady(true)}).catch(()=>{setReady(true);setError("ارتباط با سرور برقرار نیست.")})},[router]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||tab!=="student"&&!step&&remaining>0)return;setError("");
    const data=Object.fromEntries(new FormData(event.currentTarget));
    if(step&&tab!=="student"&&!/^[0-9]{6}$/.test(String(data.code||""))){setError("کد شش‌رقمی را کامل وارد کنید.");codeInput.current?.focus();return}
    statusRequest.current++;setBusy(true);
    try{
      if(tab==="student"){
        await send("/auth/student/",data);router.push("/portal/panel");
      }else if(!step){
        const result=await send<{challenge:string;retry_after?:number}>("/auth/otp/request/",{phone:data.phone,role:tab==="family"?"family":role,captcha:data.captcha});
        const time=Date.now();setNow(time);setRetryAt(time+(result.retry_after??120)*1000);
        setChallenge(result.challenge);setStep(true);
      }else{
        await send("/auth/otp/verify/",{challenge,code:data.code});router.push("/portal/panel");
      }
    }catch(reason){setError((reason as Error).message);setCap(Date.now());if(tab!=="student"&&!step)await syncOtp(String(data.phone||""))}finally{setBusy(false)}
  }

  function chooseTab(value:string){setTab(value);setStep(false);setError("");setRecovery(false)}

  if(!ready)return <main id="main-content" className="route-loading"><PencilLoader/></main>;
  return <main id="main-content" className="login-page">
    <section className="login-story"><img className="login-story-image" src="/school-reading-scene.webp" width="1536" height="1024" alt=""/><Brand/><div className="login-story-copy"><span className="eyebrow">فضای یادگیری مدرسه نمونه</span><h1>یک مدرسه،<br/>هزار فرصت<br/><em>برای رشد.</em></h1><LoginIllustration/><p>کلاس، تکلیف و همراهی مدرسه؛<br/>همه در یک فضای ساده و امن.</p></div><small>سامانه هوشمند </small></section>
    <section className="login-form-area"><Link className="back-link" href="/">بازگشت به سایت <ArrowLeft size={18}/></Link><div className="login-form">
      <span className="eyebrow">سامانه داخلی مدرسه</span><h2>{learnerPortalsEnabled?"ورود به پنل کاربری":"ورود کارکنان"}</h2><p className="muted">{recovery?"بازیابی امن دسترسی دانش‌آموز":learnerPortalsEnabled?"برای ادامه، نوع حساب خود را انتخاب کنید.":"مدیر، معاون، معلم و سایر اعضای کادر از این بخش وارد می‌شوند."}</p>
      {recovery?<PasswordRecovery onBack={()=>{setRecovery(false);setError("");setCap(Date.now())}}/>:<>
        {learnerPortalsEnabled&&<div className="tabs">{[["student","دانش‌آموز"],["family","خانواده"],["staff","کارکنان"]].map(([key,label])=><button type="button" key={key} className={tab===key?"active":""} onClick={()=>chooseTab(key)}>{label}</button>)}</div>}
        <form onSubmit={submit} key={tab+step} noValidate={step}>
          {tab==="student"?<>
            <label>نام کاربری<input name="username" required autoComplete="username" dir="ltr" placeholder="نام کاربری دریافتی از مدرسه"/></label>
            <label>رمز عبور<input type="password" name="password" required autoComplete="current-password" dir="ltr"/></label>
            <label>کد تصویر<div className="captcha-row"><input name="captcha" required inputMode="numeric" dir="ltr" maxLength={5}/><img src={"/api/v1/auth/captcha/?v="+cap} alt="کد امنیتی"/><button type="button" className="icon-button" onClick={()=>setCap(Date.now())} aria-label="تصویر جدید"><RefreshCw size={18}/></button></div></label>
          </>:!step?<>
            {tab==="staff"&&<label>نقش کاری<select value={role} onChange={event=>setRole(event.target.value)}>{[["teacher","معلم"],["manager","مدیر"],["deputy","معاون"],["staff","سایر کادر"]].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
            <label>شماره موبایل ثبت‌شده<input name="phone" type="tel" dir="ltr" pattern="0?9[0-9]{9}" maxLength={11} required placeholder="09xxxxxxxxx" value={phone} onChange={event=>{statusRequest.current++;setPhone(event.target.value);setRetryAt(0)}} onBlur={()=>{if(/^0?9[0-9]{9}$/.test(phone))void syncOtp(phone)}}/></label>
            <label>کد تصویر<div className="captcha-row"><input name="captcha" required inputMode="numeric" dir="ltr" maxLength={5} minLength={5} autoComplete="off" aria-label="کد امنیتی تصویر"/><img src={"/api/v1/auth/captcha/?v="+cap} alt="کد امنیتی پنج‌رقمی"/><button type="button" className="icon-button" onClick={()=>setCap(Date.now())} aria-label="دریافت کد امنیتی جدید"><RefreshCw size={18}/></button></div></label>
          </>:<OneTimeCode ref={codeInput} disabled={busy} invalid={Boolean(error)} describedBy={error?"login-error":undefined}/>}
          {error&&<div id="login-error" role="alert" className="error">{error}</div>}
          {tab!=="student"&&remaining>0&&<p role="timer" aria-label="زمان باقی‌مانده تا ارسال مجدد" dir="rtl">ارسال مجدد تا {String(Math.floor(remaining/60)).padStart(2,"0")}:{String(remaining%60).padStart(2,"0")} دیگر</p>}
          <button className="button full" disabled={busy||!ready||tab!=="student"&&!step&&remaining>0}>{busy?"لطفاً صبر کنید…":tab==="student"||step?"ورود به پنل":"دریافت کد ورود"}<ArrowLeft size={18}/></button>
          {learnerPortalsEnabled&&tab==="student"&&<button type="button" className="text-link" onClick={()=>{setRecovery(true);setError("")}}>رمز عبورم را فراموش کرده‌ام</button>}
          {step&&<button type="button" className="text-link" onClick={()=>{setStep(false);setCap(Date.now())}}>تغییر شماره یا درخواست کد جدید</button>}
        </form>
        {/* <p className="login-help"><ShieldCheck size={18}/>{tab==="student"?"کد بازیابی به موبایل دانش‌آموز یا ولی ثبت‌شده ارسال می‌شود.":"ورود فقط برای حساب‌های ساخته‌شده توسط مدرسه امکان‌پذیر است."}</p> */}
      </>}
    </div></section>
  </main>;
}
