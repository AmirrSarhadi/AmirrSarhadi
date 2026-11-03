"use client";
import {KeyboardEvent,useEffect,useId,useRef,useState} from "react";
import {Popover} from "antd";
import {Check,ChevronDown,Search,X} from "lucide-react";
import {fa} from "@/lib/api";
import {clearFieldError} from "@/lib/form-errors";
import "@/app/searchable-dropdown.css";

type Option={value:string;label:string;detail?:string};
type Props={label:string;name?:string;options:Option[];values:string[];onChange:(values:string[])=>void;multiple?:boolean;disabled?:boolean;placeholder?:string};
const normalize=(value:string)=>value.normalize("NFKC").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[۰-۹]/g,digit=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g,digit=>String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).trim().toLocaleLowerCase("fa");

export function SearchableDropdown({label,name,options,values,onChange,multiple=false,disabled=false,placeholder="انتخاب کنید"}:Props){
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[active,setActive]=useState(0),[width,setWidth]=useState(320);
 const input=useRef<HTMLInputElement>(null),selectionKey=JSON.stringify(values);
 useEffect(()=>{if(input.current)clearFieldError(input.current)},[selectionKey]);
 const words=normalize(query).split(/\s+/).filter(Boolean),matches=options.filter(option=>words.every(word=>normalize(option.label+" "+(option.detail||"")).includes(word)));
 const selected=options.filter(option=>values.includes(option.value)),activeIndex=Math.min(active,Math.max(0,matches.length-1));
 useEffect(()=>{if(!trigger.current)return;const resize=()=>setWidth(Math.max(220,Math.min(trigger.current!.getBoundingClientRect().width,window.innerWidth-32)));const observer=new ResizeObserver(resize);observer.observe(trigger.current);resize();return()=>observer.disconnect()},[]);
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>search.current?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame)},[open]);
 useEffect(()=>{const region=list.current,option=region?.querySelector<HTMLElement>('[data-active="true"]');if(!open||!region||!option)return;const bounds=region.getBoundingClientRect(),item=option.getBoundingClientRect();if(item.top<bounds.top)region.scrollTop+=item.top-bounds.top;else if(item.bottom>bounds.bottom)region.scrollTop+=item.bottom-bounds.bottom},[activeIndex,open,query]);
 function close(restore=false){setOpen(false);if(restore)trigger.current?.focus()}
 function choose(option:Option){onChange(multiple?(values.includes(option.value)?values.filter(value=>value!==option.value):[...values,option.value]):[option.value]);if(!multiple)close(true);else search.current?.focus()}
 function keyboard(event:KeyboardEvent){
  if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close(true)}
  else if(event.key==="Tab"){close(true)}
  else if(event.target===search.current&&event.key==="ArrowDown"){event.preventDefault();setActive(value=>Math.min(value+1,Math.max(0,matches.length-1)))}
  else if(event.target===search.current&&event.key==="ArrowUp"){event.preventDefault();setActive(value=>Math.max(0,value-1))}
  else if(event.target===search.current&&event.key==="Enter"){event.preventDefault();if(matches[activeIndex])choose(matches[activeIndex])}
 }
 const content=<div className="searchable-dropdown-menu" dir="rtl" style={{width}} onKeyDown={keyboard}>
  <div className="searchable-dropdown-search"><Search size={17} aria-hidden="true"/><input ref={search} type="search" aria-label={`جستجوی ${label}`} aria-controls={id+"-options"} aria-activedescendant={matches.length?id+"-option-"+activeIndex:undefined} placeholder={`جستجوی ${label}…`} autoComplete="off" maxLength={120} value={query} onChange={event=>{setQuery(event.target.value);setActive(0)}}/>{query&&<button type="button" className="icon-button" title="پاک کردن جستجو" aria-label={`پاک کردن جستجوی ${label}`} onClick={()=>{setQuery("");setActive(0);search.current?.focus()}}><X size={15}/></button>}</div>
  <div ref={list} id={id+"-options"} role="listbox" aria-label={label} aria-multiselectable={multiple||undefined} className="searchable-dropdown-options">
   {matches.map((option,index)=><button type="button" role="option" tabIndex={-1} aria-selected={values.includes(option.value)} data-active={index===activeIndex} id={id+"-option-"+index} key={option.value} onMouseDown={event=>event.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(option)}><span className="searchable-dropdown-check" aria-hidden="true">{values.includes(option.value)&&<Check size={15}/>}</span><span><b>{option.label}</b>{option.detail&&<small>{option.detail}</small>}</span></button>)}
  </div>
  {!matches.length&&<p className="searchable-dropdown-empty" role="status">نتیجه‌ای پیدا نشد.</p>}
  <div className="searchable-dropdown-footer"><span role="status">{fa(matches.length)} نتیجه{multiple&&` · ${fa(values.length)} انتخاب‌شده`}</span>{multiple&&<button type="button" onClick={()=>close(true)}>تأیید انتخاب‌ها</button>}</div>
 </div>;
 return <div className="searchable-dropdown" data-validation-field={name}><label id={id+"-label"} htmlFor={id+"-trigger"}>{label}</label>{name&&<input ref={input} type="hidden" name={name} value={selectionKey}/>}
  <Popover trigger="click" placement="bottomRight" arrow={false} open={open&&!disabled} onOpenChange={value=>{setOpen(value);if(value){setQuery("");setActive(0)}}} content={content} autoAdjustOverflow getPopupContainer={node=>node.closest("dialog")||document.body} classNames={{root:"searchable-dropdown-popup"}} styles={{container:{padding:0}}}>
   <button ref={trigger} data-validation-trigger id={id+"-trigger"} type="button" role="combobox" aria-labelledby={id+"-label"} aria-describedby={id+"-value"} aria-haspopup="listbox" aria-expanded={open&&!disabled} aria-controls={open?id+"-options":undefined} disabled={disabled} className="searchable-dropdown-trigger" onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setQuery("");setActive(0);setOpen(true)}}}><span id={id+"-value"} className={!selected.length?"is-placeholder":""}>{selected.length?(multiple?`${fa(selected.length)} کلاس انتخاب‌شده`:selected[0].label):placeholder}</span><ChevronDown size={17} aria-hidden="true"/></button>
  </Popover>
 </div>;
}
