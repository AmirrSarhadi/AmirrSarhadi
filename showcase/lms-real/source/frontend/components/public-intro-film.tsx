"use client";
import {useEffect,useRef,useState} from "react";
import {Pause,Play} from "lucide-react";

export function PublicIntroFilm(){
 const video=useRef<HTMLVideoElement>(null);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const node=video.current;if(!node)return;
  const preference=matchMedia("(prefers-reduced-motion: reduce)");
  let visible=true;
  const update=()=>{
   if(preference.matches){node.pause();node.removeAttribute("src");node.load();return}
   if(paused||!visible||document.hidden){node.pause();return}
   if(!node.getAttribute("src"))node.src="/school-intro.mp4";
   void node.play().catch(()=>{});
  };
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()});observer.observe(node);
  preference.addEventListener("change",update);document.addEventListener("visibilitychange",update);update();
  return()=>{observer.disconnect();preference.removeEventListener("change",update);document.removeEventListener("visibilitychange",update);node.pause()};
 },[paused]);
 return <><video ref={video} className="page-intro-film" muted loop playsInline preload="none" poster="/school-intro-poster.webp" width="1280" height="720" aria-label="نمای مدرسه نمونه"/><button type="button" className="intro-film-toggle" aria-label={paused?"پخش ویدیو":"توقف ویدیو"} title={paused?"پخش ویدیو":"توقف ویدیو"} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={19}/>:<Pause size={19}/>}</button></>;
}
