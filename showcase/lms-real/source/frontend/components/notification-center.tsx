"use client";
import {useEffect,useId,useRef,useState} from "react";
import {Bell,CheckCheck,RefreshCw} from "lucide-react";
import {api,fa,send} from "@/lib/api";
import {NotificationRow,notificationsChanged,notificationTarget} from "@/lib/notifications";
import "@/app/notification-center.css";

export function NotificationItems({rows,busy,onOpen,onRead}:{rows:NotificationRow[];busy:boolean;onOpen:(row:NotificationRow)=>void;onRead:(id:number)=>void}){
 return <div className="notification-items">{rows.map(row=><article className={row.read?"":"unread"} key={row.id}>
  <button type="button" className="notification-open" disabled={!notificationTarget(row)} title={!notificationTarget(row)?"بخش مربوط به این اعلان در دسترس نیست.":undefined} onClick={()=>onOpen(row)}><Bell size={18}/><span><b>{row.title}</b><small>{row.body}</small><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("fa-IR",{timeZone:"Asia/Tehran"})}</time></span></button>
  {!row.read?<button type="button" className="notification-read" disabled={busy} aria-label={`خوانده‌شده: ${row.title}`} title="علامت‌گذاری به‌عنوان خوانده‌شده" onClick={()=>onRead(row.id)}><CheckCheck size={19}/></button>:<CheckCheck className="notification-is-read" size={18} aria-label="خوانده‌شده"/>}
 </article>)}</div>;
}

export function NotificationCenter({onOpen,onAll}:{onOpen:(row:NotificationRow)=>void;onAll:()=>void}){
 const [open,setOpen]=useState(false),[data,setData]=useState<{records:NotificationRow[];unread:number}>(),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),request=useRef(0),id=useId();
 async function load(){const seq=++request.current;setLoading(true);setError("");try{const result=await api("/notifications/in-app/?page=1&status=all",{loading:false});if(seq===request.current)setData(result)}catch(e){if(seq===request.current)setError((e as Error).message)}finally{if(seq===request.current)setLoading(false)}}
 useEffect(()=>{void load();const refresh=()=>{if(!document.hidden)void load()};window.addEventListener("panel-notifications-changed",refresh);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);const timer=setInterval(refresh,60000);return()=>{request.current++;clearInterval(timer);window.removeEventListener("panel-notifications-changed",refresh);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)}},[]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside)},[open]);
 async function read(id:number){if(busy)return;setBusy(true);setError("");try{await send("/notifications/in-app/",{ids:[id]},{confirm:false,feedback:false});notificationsChanged()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="notification-center" ref={root} onKeyDown={event=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus()}}}>
  <button type="button" ref={trigger} className="notification-bell" aria-label="اعلان‌های سریع" title="اعلان‌های سریع" aria-expanded={open} aria-controls={id} onClick={()=>{setOpen(value=>!value);if(!open)void load()}}><Bell size={22}/>{Boolean(data&&data.unread>0)&&<span className="notification-count" aria-live="polite" aria-label="تعداد اعلان‌های خوانده‌نشده">{fa(data!.unread)}</span>}</button>
  {open&&<section id={id} className="notification-popover" aria-label="خلاصه اعلان‌ها"><header><h2>اعلان‌ها</h2><button type="button" className="icon-button" aria-label="تازه‌سازی اعلان‌ها" disabled={loading||busy} onClick={()=>void load()}><RefreshCw size={16}/></button></header>
   {error&&<div className="error" role="alert">{error}<button type="button" className="text-link" onClick={()=>void load()}>تلاش دوباره</button></div>}
   {loading&&!data?<p role="status">در حال دریافت اعلان‌ها…</p>:<NotificationItems rows={data?.records?.slice(0,5)||[]} busy={busy} onRead={read} onOpen={row=>{setOpen(false);onOpen(row)}}/>}
   {!loading&&!error&&!data?.records?.length&&<p role="status">اعلانی وجود ندارد.</p>}
   <button type="button" className="text-link notification-view-all" onClick={()=>{setOpen(false);onAll()}}>همه اعلان‌ها</button>
  </section>}
 </div>;
}
