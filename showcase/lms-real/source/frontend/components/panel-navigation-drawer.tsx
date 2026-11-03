"use client";
import {ReactNode,useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {focusableElements,lockDocumentScroll} from '@/lib/dialog-behavior';

export function PanelNavigationDrawer({open,close,children}:{open:boolean;close:()=>void;children:ReactNode}){
 const sidebar=useRef<HTMLElement>(null),onClose=useRef(close);onClose.current=close;
 useEffect(()=>{
  if(!open)return;
  const origin=document.activeElement as HTMLElement|null,main=document.querySelector<HTMLElement>('.panel-main'),previousInert=main?.inert;
  const unlock=lockDocumentScroll();if(main)main.inert=true;
  sidebar.current?.querySelector<HTMLButtonElement>('.mobile-panel-close')?.focus();
  const keyboard=(event:KeyboardEvent)=>{
   if(document.querySelector('dialog[open]'))return;
   if(event.key==='Escape'){event.preventDefault();onClose.current();return}
   if(event.key!=='Tab'||!sidebar.current)return;
   const controls=focusableElements(sidebar.current),first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  };
  const media=matchMedia('(max-width:760px)'),resize=()=>{if(!media.matches)onClose.current()};
  document.addEventListener('keydown',keyboard,true);media.addEventListener('change',resize);
  return()=>{document.removeEventListener('keydown',keyboard,true);media.removeEventListener('change',resize);unlock();if(main)main.inert=previousInert||false;requestAnimationFrame(()=>{if(origin?.isConnected&&origin.getClientRects().length&&!document.querySelector('dialog[open]'))origin.focus()})};
 },[open]);
 return <>{open&&<button type="button" tabIndex={-1} className="panel-navigation-backdrop" aria-label="بستن منوی پیمایش" onClick={close}/>}<aside ref={sidebar} id="panel-sidebar" className={'sidebar '+(open?'mobile-open':'')} role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label="پیمایش پنل"><button type="button" className="icon-button mobile-panel-close" aria-label="بستن منو" title="بستن منو" onClick={close}><X size={20}/></button>{children}</aside></>;
}
