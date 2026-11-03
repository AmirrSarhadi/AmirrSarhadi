"use client";
import {useEffect,useState} from "react";
import {api} from "@/lib/api";
import type {RegistrationOptions} from "@/lib/registration-options";

export function StudentClassField({currentId,currentLabel}:{currentId?:number|null;currentLabel?:string}){
 const [value,setValue]=useState(String(currentId||""));
 const [options,setOptions]=useState<RegistrationOptions>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setError("");api<RegistrationOptions>("/data-exchange/options/").then(value=>{if(!Array.isArray(value.classes))throw new Error("فهرست کلاس‌ها قابل دریافت نیست.");if(live)setOptions(value)}).catch(reason=>{if(live)setError(reason.message)});return()=>{live=false}},[retry]);
 return <label>کلاس<select aria-label="کلاس" name="classroom_id" value={value} onChange={event=>setValue(event.target.value)} disabled={!options||!!error}><option value="">بدون تغییر کلاس</option>{currentId&&!options?.classes.some(row=>row.id===currentId)&&<option value={currentId} disabled>{currentLabel||"کلاس فعلی"}</option>}{options?.classes.map(row=><option key={row.id} value={row.id}>{row.title} · {row.year}</option>)}</select>{error&&<small className="error" role="alert">{error}<button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>تلاش دوباره</button></small>}</label>;
}
