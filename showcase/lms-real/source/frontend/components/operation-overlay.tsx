"use client";
import {useEffect,useRef,useSyncExternalStore} from "react";
import {operationProgress} from "@/lib/operation-progress";
import {lockDocumentScroll} from "@/lib/dialog-behavior";
import {PencilLoader} from "@/components/ui/loader-1";

export function OperationOverlay(){
 const count=useSyncExternalStore(operationProgress.subscribe,operationProgress.snapshot,operationProgress.serverSnapshot);
 const dialog=useRef<HTMLDialogElement>(null);
 const busy=count>0;
 useEffect(()=>{
  if(!busy)return;
  const origin=document.activeElement as HTMLElement|null;
  const form=origin?.closest("form");
  let unlock:(()=>void)|undefined;
  const timer=setTimeout(()=>{if(dialog.current&&!dialog.current.open){dialog.current.showModal();unlock=lockDocumentScroll()}},180);
  return()=>{clearTimeout(timer);dialog.current?.close();unlock?.();
   const invalid=form?.querySelector<HTMLElement>('[aria-invalid="true"]:not([type="hidden"])');
   if(invalid)requestAnimationFrame(()=>{if(invalid.isConnected&&operationProgress.snapshot()===0)invalid.focus()});
  };
 },[busy]);
 return <dialog ref={dialog} className="operation-overlay" aria-label="در حال انجام عملیات" aria-busy={busy} onCancel={event=>event.preventDefault()} onKeyDown={event=>{if(event.key==="Tab")event.preventDefault()}}>
  <PencilLoader label="در حال انجام عملیات…"/>
 </dialog>;
}
