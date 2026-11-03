"use client";

import {FormEvent, useRef, useState} from "react";
import {ArrowLeft, KeyRound} from "lucide-react";
import {send} from "@/lib/api";
import {OneTimeCode} from "@/components/ui/one-time-code";

type Step = "request" | "verify" | "confirm" | "done";

export function PasswordRecovery({onBack}:{onBack:()=>void}){
  const codeInput=useRef<HTMLInputElement>(null);
  const [step,setStep]=useState<Step>("request");
  const [challenge,setChallenge]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setError("");
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form));
    if(step==="verify"&&!/^[0-9]{6}$/.test(String(values.code||""))){setError("کد شش‌رقمی بازیابی را کامل وارد کنید.");codeInput.current?.focus();return}
    setBusy(true);
    try{
      if(step==="request"){
        const result=await send<{challenge:string;detail:string}>("/auth/password/reset/request/",{username:String(values.username||"")});
        setChallenge(result.challenge);setMessage(result.detail);setStep("verify");
      }else if(step==="verify"){
        await send("/auth/password/reset/verify/",{challenge,code:String(values.code||"")});
        setMessage("");setStep("confirm");
      }else if(step==="confirm"){
        const password=String(values.new_password||""),confirmation=String(values.confirm_password||"");
        if(password!==confirmation){setError("تکرار رمز جدید یکسان نیست.");return}
        await send("/auth/password/reset/confirm/",{challenge,new_password:password,confirm_password:confirmation});
        form.reset();setStep("done");
      }
    }catch(reason){setError((reason as Error).message)}finally{setBusy(false)}
  }

  if(step==="done")return <div className="recovery-result" role="status">
    <KeyRound/><h3>رمز عبور تغییر کرد</h3><p>اکنون می‌توانید با رمز جدید وارد حساب دانش‌آموزی شوید.</p>
    <button type="button" className="button full" onClick={onBack}>بازگشت به ورود</button>
  </div>;

  return <div className="password-recovery">
    <div className="recovery-heading"><KeyRound/><div><h3>بازیابی رمز دانش‌آموز</h3><p>{step==="request"?"نام کاربری دانش‌آموز را وارد کنید.":step==="verify"?"کد ارسال‌شده به شماره ثبت‌شده را وارد کنید.":"یک رمز امن جدید انتخاب کنید."}</p></div></div>
    <div className="recovery-steps" aria-label="مراحل بازیابی">
      <span className={step==="request"?"active":"done"}>۱</span><i/><span className={step==="verify"?"active":step==="confirm"?"done":""}>۲</span><i/><span className={step==="confirm"?"active":""}>۳</span>
    </div>
    <form onSubmit={submit} key={step} noValidate={step==="verify"}>
      {step==="request"&&<label>نام کاربری دانش‌آموز<input name="username" required maxLength={150} autoComplete="username" dir="ltr" autoFocus/></label>}
      {step==="verify"&&<OneTimeCode ref={codeInput} label="کد بازیابی" disabled={busy} invalid={Boolean(error)} describedBy={error?"recovery-error":undefined}/>}
      {step==="confirm"&&<><label>رمز جدید<input name="new_password" type="password" required minLength={8} maxLength={256} autoComplete="new-password" dir="ltr" autoFocus/></label><label>تکرار رمز جدید<input name="confirm_password" type="password" required minLength={8} maxLength={256} autoComplete="new-password" dir="ltr"/></label></>}
      {message&&<div className="notice" role="status">{message}</div>}
      {error&&<div id="recovery-error" className="error" role="alert">{error}</div>}
      <button className="button full" disabled={busy}>{busy?"لطفاً صبر کنید…":step==="request"?"ارسال کد بازیابی":step==="verify"?"تأیید کد":"ثبت رمز جدید"}<ArrowLeft size={18}/></button>
      <button type="button" className="text-link" onClick={step==="request"?onBack:()=>{setStep("request");setChallenge("");setMessage("");setError("")}}>{step==="request"?"بازگشت به ورود":"شروع دوباره بازیابی"}</button>
    </form>
  </div>;
}
