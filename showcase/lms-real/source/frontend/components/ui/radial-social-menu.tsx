"use client";

import {useEffect,useRef,useState} from "react";
import type {CSSProperties} from "react";
import {Blocks,Globe,Mail,MapPin,Phone,Send} from "lucide-react";
import {usePublicMotion} from "@/components/public-experience";
import {safePublicUrl} from "@/lib/homepage";
import "@/app/radial-social-menu.css";

type Props={phone?:string;email?:string;eitaa?:string;rubika?:string};
function channel(value:string|undefined,host:string){
 const url=safePublicUrl(value?.trim());
 if(!url.startsWith("https://"))return "";
 return new URL(url).hostname===host?url:"";
}

export function RadialSocialMenu({phone,email,eitaa,rubika}:Props){
 const root=useRef<HTMLDivElement>(null),{paused}=usePublicMotion();
 const [playing,setPlaying]=useState(false);
 useEffect(()=>{
  let visible=false;
  const update=()=>setPlaying(visible&&!document.hidden&&!paused);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()});
  if(root.current)observer.observe(root.current);
  document.addEventListener("visibilitychange",update);
  return()=>{observer.disconnect();document.removeEventListener("visibilitychange",update)};
 },[paused]);
 const items=[
  {label:"ایتا",icon:Send,href:channel(eitaa,"eitaa.com"),tone:"eitaa"},
  {label:"روبیکا",icon:Blocks,href:channel(rubika,"rubika.ir"),tone:"rubika"},
  {label:"وب‌سایت مدرسه",icon:Globe,href:"/",tone:"site"},
  {label:"تماس با مدرسه",icon:Phone,href:phone?`tel:${phone}`:"",tone:"phone"},
  {label:"ایمیل مدرسه",icon:Mail,href:email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?`mailto:${email.trim()}`:"",tone:"mail"},
  {label:"مسیریابی",icon:MapPin,href:"https://maps.app.goo.gl/iCHpVtgRXoPcKC9s9",tone:"map"},
 ];
 return <div className="radial-social-menu" ref={root} data-playing={playing}>
  <div className="radial-guide" aria-hidden="true"/><div className="radial-center" aria-hidden="true"><img src="/logo.png" width="35" height="45" alt=""/></div>
  <div className="radial-ring">{items.map((item,index)=><div className="radial-spoke" style={{"--social-angle":`${index*60}deg`} as CSSProperties} key={item.tone}><div className="radial-counter">
   {item.href?<a className={`radial-link social-${item.tone}`} href={item.href} aria-label={item.label} title={item.label} {...(item.href.startsWith("https://")?{target:"_blank",rel:"noopener noreferrer"}:{})}><item.icon size={22}/><span className="radial-tooltip">{item.label}</span></a>:<button type="button" className={`radial-link social-${item.tone} is-unavailable`} aria-disabled="true" aria-label={`${item.label}؛ نشانی رسمی به‌زودی`} title={`${item.label}؛ نشانی رسمی به‌زودی`}><item.icon size={22}/><span className="radial-tooltip">{item.label} · به‌زودی</span></button>}
  </div></div>)}</div>
 </div>;
}
