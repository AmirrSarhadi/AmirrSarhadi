"use client";

import {useEffect,useId,useRef,useState,type InputHTMLAttributes} from "react";
import {File as FileIcon,FileSpreadsheet,UploadCloud,X} from "lucide-react";
import {clearFieldError} from "@/lib/form-errors";

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,"type"|"value"|"onChange">&{
 title?:string;hint?:string;files?:File[];maxFiles?:number;maxSize?:number;onFilesChange?:(files:File[])=>void;
};

export function FileUpload({title="انتخاب فایل",hint,files:controlled,maxFiles=1,maxSize,onFilesChange,disabled,...props}:Props){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const [local,setLocal]=useState<File[]>([]),[error,setError]=useState(""),[drag,setDrag]=useState(false);
 const files=controlled??local;
 useEffect(()=>{if(!controlled||!input.current)return;const existing=Array.from(input.current.files||[]);if(existing.length===controlled.length&&existing.every((file,index)=>file===controlled[index]))return;const transfer=new DataTransfer();controlled.forEach(file=>transfer.items.add(file));input.current.files=transfer.files},[controlled]);
 function sync(next:File[]){const node=input.current;if(node){clearFieldError(node);const transfer=new DataTransfer();next.forEach(file=>transfer.items.add(file));node.files=transfer.files;node.setCustomValidity("")}setLocal(next);setError("");onFilesChange?.(next)}
 function select(next:File[]){
  const accepted=(props.accept||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const invalid=next.length>maxFiles?`حداکثر ${new Intl.NumberFormat("fa-IR").format(maxFiles)} فایل انتخاب کنید.`:maxSize&&next.some(file=>file.size>maxSize)?"حجم فایل بیشتر از حد مجاز است.":next.some(file=>accepted.length&&!accepted.some(type=>type.startsWith(".")?file.name.toLowerCase().endsWith(type):type.endsWith("/*")?file.type.startsWith(type.slice(0,-1)):file.type===type))?"نوع فایل مجاز نیست.":"";
  if(invalid){if(input.current){const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.current.files=transfer.files}setError(invalid);return}sync(next);
 }
 useEffect(()=>{const form=input.current?.form;if(!form)return;const reset=()=>{setLocal([]);setError("");onFilesChange?.([])};form.addEventListener("reset",reset);return()=>form.removeEventListener("reset",reset)},[onFilesChange]);
 return <div className="file-upload" data-validation-field={props.name} aria-busy={disabled||undefined}>
  <div className={`file-upload-drop${drag?" is-dragging":""}${disabled?" is-disabled":""}`} onDragOver={event=>{event.preventDefault();if(!disabled)setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={event=>{event.preventDefault();setDrag(false);if(!disabled)select(Array.from(event.dataTransfer.files))}}>
   <UploadCloud size={28} aria-hidden="true"/><label htmlFor={id}>{title}{props.required?" *":""}</label><span>فایل را رها کنید یا انتخاب کنید</span>{hint&&<small id={`${id}-hint`}>{hint}</small>}
   <input {...props} id={id} ref={input} className="file-upload-input" type="file" disabled={disabled} aria-describedby={`${hint?id+"-hint ":""}${error?id+"-error":""}`.trim()||undefined} aria-invalid={!!error} required={props.required&&!files.length} onChange={event=>select(Array.from(event.target.files||[]))}/>
  </div>
  {files.map((file,index)=><div className="file-upload-item" key={`${file.name}-${index}`}>{/\.xlsx?$/i.test(file.name)?<FileSpreadsheet size={24}/>:<FileIcon size={24}/>}<div><b dir="auto">{file.name}</b><small>{new Intl.NumberFormat("fa-IR",{maximumFractionDigits:1}).format(file.size/1024)} کیلوبایت</small></div><button type="button" disabled={disabled} title={`حذف ${file.name}`} aria-label={`حذف ${file.name}`} onClick={()=>sync(files.filter((_,i)=>i!==index))}><X size={18}/></button></div>)}
  {error&&<p id={`${id}-error`} className="field-error" data-field-error role="alert">{error}</p>}
 </div>;
}
