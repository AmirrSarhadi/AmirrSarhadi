"use client";
import {useEffect} from "react";
import "@/app/field-errors.css";
import {clearFieldError,clearFormErrors,focusInvalid,showFieldError,trackFormSubmission} from "@/lib/form-errors";

export function PersianValidation(){
 useEffect(()=>{
  const field=(target:EventTarget|null)=>target instanceof HTMLInputElement||target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement?target:null;
  const clear=(event:Event)=>{const input=field(event.target);if(input){clearFieldError(input);input.closest("[data-validation-group]")?.querySelectorAll("input,select,textarea").forEach(node=>{const related=field(node);if(related)clearFieldError(related)})}};
  const reset=(event:Event)=>{if(event.target instanceof HTMLFormElement)clearFormErrors(event.target)};
  const invalid=(event:Event)=>{
   const input=field(event.target);if(!input)return;
   event.preventDefault();
   const label=(input.getAttribute("aria-label")||input.labels?.[0]?.childNodes[0]?.textContent?.trim()||"این فیلد").replace(" (مقدار)","");
   if(!input.hasAttribute('aria-label')&&!input.hasAttribute('aria-labelledby'))input.setAttribute('aria-label',label);
   const validity=input.validity;
   const message=validity.valueMissing?`${label} را تکمیل کنید.`:validity.typeMismatch?`${label} را با قالب صحیح وارد کنید.`:validity.rangeUnderflow?`${label} نباید کمتر از ${input.getAttribute("min")} باشد.`:validity.rangeOverflow?`${label} نباید بیشتر از ${input.getAttribute("max")} باشد.`:validity.tooShort?`${label} کوتاه‌تر از حد مجاز است.`:validity.tooLong?`${label} طولانی‌تر از حد مجاز است.`:validity.stepMismatch?`${label} را مطابق گام مجاز وارد کنید.`:`مقدار ${label} معتبر نیست. قالب واردشده را بررسی کنید.`;
   showFieldError(input,message,true);
   const first=input.form?.querySelector(":invalid");if(!first||first===input)focusInvalid(input);
  };
  const managed=new WeakSet<HTMLFormElement>();
  const scan=()=>document.querySelectorAll('form').forEach(form=>{if(!form.noValidate||form.hasAttribute('data-persian-validation')){managed.add(form);form.noValidate=true}});
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();
  const submit=(event:Event)=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;trackFormSubmission(form,event);if(!managed.has(form))return;const invalidFields=Array.from(form.elements).filter(element=>element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement).filter(element=>element.willValidate&&!element.validity.valid);if(invalidFields.length){event.preventDefault();event.stopImmediatePropagation();invalidFields.forEach(element=>element.checkValidity());focusInvalid(invalidFields[0])}};
  document.addEventListener("submit",submit,true);document.addEventListener("reset",reset,true);document.addEventListener("invalid",invalid,true);document.addEventListener("input",clear,true);document.addEventListener("change",clear,true);
  return()=>{observer.disconnect();document.removeEventListener("submit",submit,true);document.removeEventListener("reset",reset,true);document.removeEventListener("invalid",invalid,true);document.removeEventListener("input",clear,true);document.removeEventListener("change",clear,true)};
 },[]);
 return null;
}
