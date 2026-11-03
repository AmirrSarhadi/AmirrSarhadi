"use client";
import {useEffect} from "react";
import {api,send} from "@/lib/api";

export function SessionIdle({userId}:{userId:number}){
 useEffect(()=>{
  let deadline=Date.now()+3600000,closed=false,lastSent=0,pending:ReturnType<typeof setTimeout>|undefined;
  const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel(`panel-idle-${userId}`):null;
  function leave(){if(closed)return;closed=true;channel?.postMessage({logout:true});void send("/auth/logout/",{},{confirm:false,feedback:false}).catch(()=>{});window.location.replace("/portal/login")}
  function sync(){if(closed)return;lastSent=Date.now();void send("/auth/activity/",{},{confirm:false,feedback:false}).catch(()=>{})}
  function activity(event:Event){if(!event.isTrusted||document.hidden||closed)return;if(Date.now()>=deadline){leave();return}deadline=Date.now()+3600000;channel?.postMessage({deadline});clearTimeout(pending);if(Date.now()-lastSent>=30000)sync();else pending=setTimeout(sync,1000)}
  function check(){if(Date.now()>=deadline)leave()}
  if(channel)channel.onmessage=event=>{if(event.data?.logout){closed=true;window.location.replace("/portal/login")}else if(typeof event.data?.deadline==="number")deadline=Math.max(deadline,event.data.deadline)};
  const initial=deadline;
  void api<{remaining:number}>("/auth/activity/").then(value=>{if(!closed&&deadline===initial&&Number.isFinite(value.remaining))deadline=Date.now()+value.remaining*1000}).catch(()=>{});
  const events=["pointerdown","pointermove","keydown","wheel","touchstart"];
  events.forEach(name=>window.addEventListener(name,activity,{passive:true}));window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
  const timer=setInterval(check,1000);
  return()=>{closed=true;clearInterval(timer);clearTimeout(pending);channel?.close();events.forEach(name=>window.removeEventListener(name,activity));window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check)};
 },[userId]);
 return null;
}
