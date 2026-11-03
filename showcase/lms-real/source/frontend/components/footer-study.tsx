"use client";

import {useEffect,useRef,useState} from "react";
import {usePublicMotion} from "@/components/public-experience";
import {SchoolOrbit} from "@/components/school-orbit";

export function FooterStudy(){
 const ref=useRef<HTMLDivElement>(null);
 const {paused}=usePublicMotion();
 const [playing,setPlaying]=useState(false);
 useEffect(()=>{
  const element=ref.current;
  if(!element)return;
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible=false;
  const update=()=>setPlaying(visible&&!paused&&!preference.matches&&!document.hidden);
  const observer="IntersectionObserver" in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()}):null;
  if(observer)observer.observe(element);else{visible=true;update()}
  preference.addEventListener("change",update);document.addEventListener("visibilitychange",update);
  return()=>{observer?.disconnect();preference.removeEventListener("change",update);document.removeEventListener("visibilitychange",update)};
 },[paused]);
 return <div className="footer-study" ref={ref} aria-hidden="true" data-playing={playing}><SchoolOrbit compact/></div>;
}
