"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import "@/app/panel-workflows.css";
import {CalendarDays,ChevronLeft,ChevronRight} from "lucide-react";
import {dateFa,fa} from "@/lib/api";
import {clearFieldError} from "@/lib/form-errors";

const DAY=86400000;
function parse(value:string){return new Date(value+"T12:00:00Z")}
function iso(date:Date){return date.toISOString().slice(0,10)}
function monthStart(date:Date){
  const parts=new Intl.DateTimeFormat("en-US-u-ca-persian",{day:"numeric",timeZone:"UTC"}).formatToParts(date);
  const day=Number(parts.find(p=>p.type==="day")?.value||1);
  return new Date(date.getTime()-(day-1)*DAY);
}
export function tehranToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
export function PersianDatePicker({value:controlledValue,defaultValue="",onChange,label,name,max,min,disabled=false,required=false,clearable=false}:{value?:string,defaultValue?:string,onChange?:(v:string)=>void,label:string,name?:string,max?:string,min?:string,disabled?:boolean,required?:boolean,clearable?:boolean}){
  const [internalValue,setInternalValue]=useState(defaultValue);
  const value=controlledValue??internalValue;
  const change=(next:string)=>{const input=root.current?.querySelector<HTMLInputElement>(".date-value-input");if(input)clearFieldError(input);setInternalValue(next);onChange?.(next)};
  const [open,setOpen]=useState(false),[month,setMonth]=useState(()=>monthStart(parse(value||tehranToday())));
  const root=useRef<HTMLDivElement>(null),popup=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState({left:12,top:12,width:280});
  useLayoutEffect(()=>{if(!open)return;let frame=0;const place=()=>{const rect=root.current?.querySelector(".date-trigger")?.getBoundingClientRect();if(!rect)return;const width=Math.min(280,window.innerWidth-24),height=Math.min(popup.current?.offsetHeight||350,window.innerHeight-24);setPosition({width,left:Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12)),top:Math.max(12,Math.min(rect.bottom+8+height<=window.innerHeight?rect.bottom+8:rect.top-height-8,window.innerHeight-height-12))})};const move=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place)};place();window.addEventListener("resize",move);window.addEventListener("scroll",move,true);return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",move);window.removeEventListener("scroll",move,true)}},[open,month]);
  useEffect(()=>{const form=root.current?.closest("form");const reset=()=>{setInternalValue(defaultValue);setOpen(false)};form?.addEventListener("reset",reset);return()=>form?.removeEventListener("reset",reset)},[defaultValue]);
  useEffect(()=>{if(value)setMonth(monthStart(parse(value)))},[value]);
  useEffect(()=>{if(!open)return;function close(e:MouseEvent){if(!root.current?.contains(e.target as Node)&&!popup.current?.contains(e.target as Node))setOpen(false)}
    document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[open]);
  const next=monthStart(new Date(month.getTime()+32*DAY));
  const count=Math.round((next.getTime()-month.getTime())/DAY);
  const offset=(month.getUTCDay()+1)%7;
  return <div className="persian-date" ref={root} onKeyDown={e=>{if(e.key==="Escape"&&open){e.preventDefault();e.stopPropagation();setOpen(false);root.current?.querySelector<HTMLButtonElement>(".date-trigger")?.focus()}}}>
    <span className="field-label">{label}</span>
    {name&&<input className="date-value-input" aria-label={label+" (مقدار)"} tabIndex={-1} name={name} value={value} onChange={()=>{}} required={required} disabled={disabled} onInvalid={event=>{event.preventDefault();setOpen(true);root.current?.querySelector("button")?.focus()}}/>}
    <button type="button" className="date-trigger" disabled={disabled} aria-label={label} aria-expanded={open} onClick={()=>setOpen(!open)}><span>{value?dateFa(value):"انتخاب تاریخ"}</span><CalendarDays size={17}/></button>
    {open&&!disabled&&root.current&&createPortal(<div ref={popup} className="calendar-popup responsive-calendar" dir="rtl" style={{left:position.left,top:position.top,width:position.width}} role="dialog" aria-label={"تقویم "+label}>
      <div className="calendar-heading"><button type="button" aria-label="ماه قبل" onClick={()=>setMonth(monthStart(new Date(month.getTime()-DAY)))}><ChevronRight size={18}/></button><b>{new Intl.DateTimeFormat("fa-IR",{month:"long",year:"numeric",timeZone:"UTC"}).format(month)}</b><button type="button" aria-label="ماه بعد" onClick={()=>setMonth(next)}><ChevronLeft size={18}/></button></div>
      <div className="calendar-grid">{["ش","ی","د","س","چ","پ","ج"].map((x,i)=><span className="weekday" key={"day"+i}>{x}</span>)}{Array.from({length:offset},(_,i)=><span key={"blank"+i}/>)}{Array.from({length:count},(_,i)=>{const key=iso(new Date(month.getTime()+i*DAY));return <button type="button" key={key} data-date={key} disabled={(!!max&&key>max)||(!!min&&key<min)} className={(key===value?"selected ":"")+(key===tehranToday()?"today":"")} aria-label={dateFa(key)} onClick={()=>{change(key);setOpen(false);root.current?.querySelector<HTMLButtonElement>(".date-trigger")?.focus()}}>{fa(i+1)}</button>})}</div>
      <button type="button" className="calendar-today" disabled={(!!max&&tehranToday()>max)||(!!min&&tehranToday()<min)} onClick={()=>{change(tehranToday());setMonth(monthStart(parse(tehranToday())));setOpen(false)}}>امروز</button>
      {clearable&&<button type="button" className="calendar-today" onClick={()=>{change("");setOpen(false)}}>پاک کردن تاریخ</button>}
    </div>,root.current.closest("dialog")||document.body)}
  </div>
}
export function PersianDateTimePicker({name,label,disabled=false}:{name:string;label:string;disabled?:boolean}){
  const [day,setDay]=useState(""),[time,setTime]=useState("");const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{const input=root.current?.querySelector<HTMLInputElement>('input[type="hidden"]');if(input)clearFieldError(input)},[day,time]);
  useEffect(()=>{const form=root.current?.closest("form"),reset=()=>{setDay("");setTime("")};form?.addEventListener("reset",reset);return()=>form?.removeEventListener("reset",reset)},[]);
  return <div className="persian-datetime" data-validation-field={name} ref={root}><PersianDatePicker label={label} value={day} onChange={setDay} disabled={disabled} clearable/><label>ساعت ارسال<input type="time" value={time} onChange={event=>setTime(event.target.value)} required={!!day} disabled={disabled||!day}/></label><input type="hidden" name={name} value={day&&time?`${day}T${time}:00+03:30`:""}/></div>
}
