"use client";

import {useEffect,useId,useRef,useState} from "react";
import {Search,X} from "lucide-react";
import {fa} from "@/lib/api";
import "@/app/searchable-person-select.css";

type Person={id:number;name:string;username:string};
type Props={label:string;name:string;options:Person[];defaultValue?:number;disabled?:boolean;required?:boolean;value?:string;onChange?:(value:string)=>void;placeholder?:string};

function normalize(value:string){return value.normalize("NFKC").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[۰-۹]/g,digit=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g,digit=>String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\s+/g," ").trim().toLocaleLowerCase("fa")}

export function SearchablePersonSelect({label,name,options,defaultValue,disabled=false,required=true,value:controlled,onChange,placeholder="انتخاب کنید"}:Props){
 const id=useId(),root=useRef<HTMLDivElement>(null),[query,setQuery]=useState(""),[localValue,setValue]=useState(String(defaultValue||""));
 const value=controlled??localValue;
 useEffect(()=>{const form=root.current?.closest("form");function reset(){setQuery("");setValue(String(defaultValue||""));if(controlled!==undefined)onChange?.(String(defaultValue||""))}form?.addEventListener("reset",reset);return()=>form?.removeEventListener("reset",reset)},[defaultValue,controlled,onChange]);
 const words=normalize(query).split(" ").filter(Boolean),matches=options.filter(person=>words.every(word=>normalize(person.name+" "+person.username).includes(word)));
 const selected=options.find(person=>String(person.id)===value),visible=selected&&!matches.some(person=>person.id===selected.id)?[selected,...matches]:matches;
 return <div className="searchable-person-select" ref={root}>
  <label htmlFor={id+"-search"}>جستجوی {label}</label>
  <div className="person-search-field"><Search size={16} aria-hidden="true"/><input id={id+"-search"} type="search" maxLength={120} value={query} disabled={disabled} autoComplete="off" placeholder="نام یا شناسه" onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" className="icon-button" title="پاک کردن جستجو" aria-label={`پاک کردن جستجوی ${label}`} disabled={disabled} onClick={()=>setQuery("")}><X size={15}/></button>}</div>
  <label htmlFor={id}>{label}</label><select id={id} name={name} required={required} disabled={disabled} value={value} onChange={event=>{setValue(event.target.value);onChange?.(event.target.value)}} aria-describedby={id+"-count"}>
   <option value="">{placeholder}</option>{visible.map(person=><option key={person.id} value={person.id}>{person.name}{person.username?` (${person.username})`:""}</option>)}
  </select><small id={id+"-count"} role="status">{matches.length?`${fa(matches.length)} نتیجه`:"نتیجه‌ای پیدا نشد."}</small>
 </div>;
}
