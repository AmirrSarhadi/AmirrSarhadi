"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle,CheckCircle2,Eye,EyeOff,Info,ShieldCheck,X} from "lucide-react";
import {DialogRequest,Notice,registerPanelFeedback} from "@/lib/panel-feedback";
import {lockDocumentScroll} from "@/lib/dialog-behavior";
import "@/app/panel-feedback.css";

type Pending={id:number;request:DialogRequest;resolve:(value:string|boolean|null)=>void;origin:HTMLElement|null};
export function PanelFeedback({onChanged}:{onChanged:()=>void}){
  const [pending,setPending]=useState<Pending|null>(null),[notices,setNotices]=useState<(Notice&{id:number})[]>([]);
  const [showSecret,setShowSecret]=useState(false),[promptError,setPromptError]=useState("");
  const queue=useRef<Pending[]>([]),active=useRef<Pending|null>(null),changed=useRef(onChanged),dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
  const sequence=useRef(0),recent=useRef(new Map<string,number>()),timers=useRef(new Map<number,ReturnType<typeof setTimeout>>());
  changed.current=onChanged;
  function next(){const item=queue.current.shift()||null;active.current=item;setPending(item)}
  function finish(value:string|boolean|null){const item=active.current;if(!item)return;dialog.current?.close();active.current=null;item.resolve(value);next();requestAnimationFrame(()=>{if(!active.current&&item.origin?.isConnected)item.origin.focus()})}
  function pause(id:number){const timer=timers.current.get(id);if(timer)clearTimeout(timer);timers.current.delete(id)}
  function expire(id:number){pause(id);timers.current.set(id,setTimeout(()=>{setNotices(rows=>rows.filter(row=>row.id!==id));timers.current.delete(id)},6000))}
  function resume(id:number,node:HTMLElement){if(!node.matches(":hover")&&!node.contains(document.activeElement))expire(id)}
  function dismiss(id:number){pause(id);setNotices(rows=>{const notice=rows.find(row=>row.id===id);if(notice)recent.current.delete(notice.kind+notice.message);return rows.filter(row=>row.id!==id)})}
  useEffect(()=>{
    const show=(notice:Notice)=>{
      if(!notice.message.trim())return;
      if(notice.kind==="error"&&!notice.message.startsWith("بخش ")){const section=document.querySelector('.panel-header .breadcrumb')?.textContent?.split('/').at(-1)?.trim()||"سامانه";notice={...notice,message:`بخش ${section}: ${notice.message}`}}
      const key=notice.kind+notice.message,now=Date.now();if(notice.kind==="error"&&now-(recent.current.get(key)||0)<1500)return;
      recent.current.set(key,now);if(recent.current.size>100)recent.current.delete(recent.current.keys().next().value!);
      const id=++sequence.current;setNotices(rows=>[...rows.filter(row=>!(notice.kind==="success"&&row.message==="عملیات با موفقیت انجام شد.")).slice(-3),{...notice,id}]);
      expire(id);
    };
    const unregister=registerPanelFeedback({dialog:request=>new Promise(resolve=>{queue.current.push({id:++sequence.current,request,resolve,origin:document.activeElement as HTMLElement});if(!active.current)next()}),notify:show,changed:()=>changed.current()});
    // Bridge legacy inline feedback as modules migrate to the shared notification owner.
    const seen=new WeakMap<Element,string>();
    const scanElement=(element:Element)=>{
      if(element.closest("[data-field-error]"))return;
      const copy=element.cloneNode(true) as Element;copy.querySelectorAll("button,a").forEach(node=>node.remove());
      const message=copy.textContent?.trim()||"";if(seen.get(element)===message)return;seen.set(element,message);
      if(element.classList.contains("success"))element.setAttribute("aria-hidden","true");
      if(message)show({kind:element.classList.contains("success")?"success":"error",message});
    };
    const selector=".error,.success,[role=alert]";
    const scan=(node:Node)=>{const element=node instanceof Element?node:node.parentElement;if(!element)return;const owner=element.closest(selector);if(owner)scanElement(owner);element.querySelectorAll(selector).forEach(scanElement)};
    const observer=new MutationObserver(records=>records.forEach(record=>{if(record.type==="characterData")scan(record.target);else{const owner=(record.target as Element).closest?.(selector);if(owner)scanElement(owner);record.addedNodes.forEach(scan)}}));
    const root=document.querySelector(".panel");if(root){observer.observe(root,{childList:true,subtree:true,characterData:true});scan(root)}
    return()=>{unregister();observer.disconnect();timers.current.forEach(clearTimeout);timers.current.clear();active.current?.resolve(null);queue.current.forEach(item=>item.resolve(null));queue.current=[];active.current=null};
  },[]);
  useEffect(()=>{setShowSecret(false);setPromptError("");if(pending){const unlock=lockDocumentScroll();dialog.current?.showModal();if(pending.request.input)input.current?.focus();return unlock}},[pending]);
  return createPortal(<>
    <div className="panel-notices" dir="rtl" aria-label="اعلان‌های سامانه">{notices.map(notice=>{const Icon=notice.kind==="success"?CheckCircle2:notice.kind==="info"?Info:AlertTriangle;return <div key={notice.id} className={`panel-notice ${notice.kind}`} onMouseEnter={()=>pause(notice.id)} onMouseLeave={event=>resume(notice.id,event.currentTarget)} onFocusCapture={()=>pause(notice.id)} onBlurCapture={event=>resume(notice.id,event.currentTarget)} role={notice.kind==="error"?"alert":"status"}><Icon size={21}/><p>{notice.message}</p><button type="button" aria-label="بستن اعلان" onClick={()=>dismiss(notice.id)}><X size={17}/></button></div>})}</div>
    <dialog ref={dialog} className="panel-confirm" dir="rtl" aria-labelledby="panel-confirm-title" aria-describedby="panel-confirm-description" onCancel={event=>{event.preventDefault();finish(null)}} onKeyDown={event=>{if(event.key!=="Tab")return;const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),[tabindex='0']")),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}>
      {pending&&<form noValidate key={pending.id} onSubmit={event=>{event.preventDefault();if(pending.request.input&&!input.current?.value.trim()){setPromptError("این فیلد را تکمیل کنید.");input.current?.focus();return}finish(pending.request.input?input.current?.value||"":true)}}>
        <div className={"panel-confirm-symbol "+(pending.request.danger?"danger":"")} >{pending.request.danger?<AlertTriangle/>:<ShieldCheck/>}</div>
        <h2 id="panel-confirm-title">{pending.request.title}</h2><p id="panel-confirm-description">{pending.request.description}</p>
        {pending.request.input&&<><label htmlFor="panel-prompt-input">{pending.request.input.label}</label><div className="panel-prompt-field"><input id="panel-prompt-input" ref={input} type={pending.request.input.secret&&!showSecret?"password":"text"} autoComplete={pending.request.input.secret?"new-password":"off"} defaultValue={pending.request.input.value} required aria-invalid={!!promptError} aria-describedby={promptError?"panel-prompt-error":undefined}/>{pending.request.input.secret&&<button type="button" className="icon-button" aria-label={showSecret?"پنهان کردن رمز":"نمایش رمز"} onClick={()=>setShowSecret(value=>!value)}>{showSecret?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</div>{promptError&&<p id="panel-prompt-error" role="alert">{promptError}</p>}</>}
        <div className="panel-confirm-actions"><button type="button" autoFocus={!pending.request.input} className="button outline" onClick={()=>finish(null)}>انصراف</button><button className={"button "+(pending.request.danger?"danger":"")}>{pending.request.confirmLabel||"تأیید"}</button></div>
      </form>}
    </dialog>
  </>,document.body);
}
