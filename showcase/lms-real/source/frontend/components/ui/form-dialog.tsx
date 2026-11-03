"use client";
import {ReactNode,useEffect,useId,useRef} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {focusableElements,lockDocumentScroll} from "@/lib/dialog-behavior";
export function FormDialog({title,busy,close,children}:{title:string;busy:boolean;close:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId(),origin=useRef<HTMLElement|null>(null);
 useEffect(()=>{const dialog=ref.current;origin.current=document.activeElement as HTMLElement;const unlock=lockDocumentScroll();dialog?.showModal();return()=>{dialog?.close();unlock();const target=origin.current;requestAnimationFrame(()=>{if(target?.isConnected&&!target.matches(":disabled")&&!document.querySelector("dialog[open]"))target.focus()})}},[]);
 return createPortal(<dialog ref={ref} className="panel-form-dialog panel-dialog-frame" dir="rtl" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!busy)close()}} onKeyDown={event=>{if(event.key!=="Tab")return;const controls=focusableElements(event.currentTarget),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}><header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" disabled={busy} aria-label="بستن فرم" onClick={close}><X size={18}/></button></header><div className="panel-dialog-content">{children}</div></dialog>,document.body);
}
