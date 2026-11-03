"use client";
import {useEffect,useRef} from "react";
import type {AnimationItem} from "lottie-web";

export function LoginIllustration(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const container=root.current;if(!container)return;
  let live=true,animation:AnimationItem|undefined,visible=false;
  const preference=matchMedia("(prefers-reduced-motion: reduce)");
  const update=()=>{if(!animation)return;if(preference.matches)animation.goToAndStop(0,true);else if(visible&&!document.hidden)animation.play();else animation.pause()};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()});observer.observe(container);
  preference.addEventListener("change",update);document.addEventListener("visibilitychange",update);
  import("lottie-web").then(({default:lottie})=>{
   if(!live)return;
   animation=lottie.loadAnimation({container,renderer:"svg",loop:true,autoplay:false,path:"/login-hr-portal.json"});
   animation.addEventListener("DOMLoaded",update);
  }).catch(()=>{});
  return()=>{live=false;observer.disconnect();preference.removeEventListener("change",update);document.removeEventListener("visibilitychange",update);animation?.destroy()};
 },[]);
 return <div ref={root} className="login-illustration" aria-hidden="true"/>;
}
