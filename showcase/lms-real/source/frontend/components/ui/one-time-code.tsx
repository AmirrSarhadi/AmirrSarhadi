"use client";

import {forwardRef,useId,useState} from "react";
import {OTPInput} from "input-otp";
import {clearFieldError} from "@/lib/form-errors";
import "@/app/one-time-code.css";

type Props={label?:string;name?:string;disabled?:boolean;invalid?:boolean;describedBy?:string};
function normalize(value:string){return value.replace(/[۰-۹]/g,digit=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g,digit=>String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))}

// One semantic input preserves SMS autofill, paste and native editing; six slots show its caret position.
export const OneTimeCode=forwardRef<HTMLInputElement,Props>(function OneTimeCode({label="کد یک‌بارمصرف",name="code",disabled=false,invalid=false,describedBy},ref){
 const id=useId(),[value,setValue]=useState("");
 return <div className="one-time-code" data-validation-field={name}><label htmlFor={id}>{label}</label><OTPInput ref={ref} id={id} name={name} value={value} onChange={next=>setValue(normalize(next))} maxLength={6} minLength={6} required disabled={disabled} inputMode="numeric" autoComplete="one-time-code" autoFocus dir="ltr" textAlign="left" pattern="^[0-9۰-۹٠-٩]+$" aria-invalid={invalid||undefined} aria-describedby={describedBy} containerClassName="one-time-code-control" pushPasswordManagerStrategy="none" pasteTransformer={text=>normalize(text).replace(/\D/g,"")} onPasteCapture={event=>{clearFieldError(event.currentTarget);const digits=normalize(event.clipboardData.getData("text/plain")).replace(/\D/g,"");if(digits.length>=6){event.preventDefault();event.stopPropagation();setValue(digits.slice(0,6))}}} render={({slots})=><div className="otp-slots" dir="ltr" aria-hidden="true">{slots.map((slot,index)=><div className="otp-slot" data-active={slot.isActive} data-invalid={invalid} key={index}>{slot.char}{slot.hasFakeCaret&&<span className="otp-caret"/>}</div>)}</div>}/></div>;
});
