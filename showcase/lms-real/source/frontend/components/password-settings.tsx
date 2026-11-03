"use client";
import {useState} from "react";
import {send} from "@/lib/api";
export function PasswordSettings({onChanged}:{onChanged?:()=>Promise<void>}={}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(false);
 return <section className="card content-editor"><h2>تغییر رمز عبور</h2><p>رمز جدید حداقل ۸ نویسه داشته باشد و شبیه نام کاربری یا رمزهای رایج نباشد. پس از تغییر، ورودهای دیگر حساب بسته می‌شوند؛ ورود فعلی شما باقی می‌ماند.</p>
 {error&&<div className="error" role="alert">{error}</div>}{success&&<div className="success" role="status">رمز عبور تغییر کرد.</div>}
 <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,d=Object.fromEntries(new FormData(form));setError("");setSuccess(false);if(d.new_password!==d.confirm_password){setError("تکرار رمز جدید یکسان نیست.");return}setBusy(true);try{await send("/auth/password/change/",d);form.reset();setSuccess(true);if(onChanged)await onChanged()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
 <label>رمز فعلی<input name="current_password" type="password" autoComplete="current-password" maxLength={256} required disabled={busy}/></label>
 <label>رمز جدید<input name="new_password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required disabled={busy}/></label>
 <label>تکرار رمز جدید<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required disabled={busy}/></label>
 <button className="button" disabled={busy}>{busy?"در حال تغییر رمز…":"ذخیره رمز جدید"}</button>
 </form></section>
}
