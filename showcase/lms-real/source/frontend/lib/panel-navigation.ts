"use client";
import {useCallback,useEffect,useRef,useState} from "react";

type PanelLocation={tab:string;classId?:number;year:string;studentId:number|null;teacherId?:number;reportPeriod?:number;reportTeaching?:number;absenceClassId?:number;absenceDate?:string;attendanceDate?:string};
const initial:PanelLocation={tab:"home",year:"",studentId:null};
const positiveId=(value:string|null)=>value&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):undefined;
function isoDate(value:string|null){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1)return undefined;const time=Date.parse(value+'T12:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?value:undefined}
function readLocation():PanelLocation{
 const params=new URL(location.href).searchParams;
 return {tab:params.get("section")||"home",classId:positiveId(params.get("classroom")),year:params.get("year")||"",studentId:positiveId(params.get("student"))??null,teacherId:positiveId(params.get("teacher")),reportPeriod:positiveId(params.get("report_period")),reportTeaching:positiveId(params.get("report_teaching")),attendanceDate:isoDate(params.get("attendance_date")),absenceClassId:positiveId(params.get("absence_class")),absenceDate:isoDate(params.get('absence_date'))};
}
function locationUrl(value:PanelLocation){
 const url=new URL(location.href);
 for(const [key,item] of Object.entries({section:value.tab==="home"?undefined:value.tab,classroom:value.classId,year:value.year||undefined,student:value.studentId??undefined,teacher:value.tab==='teacher-files'?value.teacherId:undefined,report_period:value.reportPeriod,report_teaching:value.reportTeaching,absence_class:value.tab==='absences'?value.absenceClassId:undefined,absence_date:value.tab==='absences'?value.absenceDate:undefined,attendance_date:value.tab==='attendance-report'?value.attendanceDate:undefined})){
  if(item===undefined)url.searchParams.delete(key);else url.searchParams.set(key,String(item));
 }
 return url.pathname+url.search+url.hash;
}

// Preserve Next's history fields; keep only navigation identifiers, never form drafts.
export function usePanelNavigation(ready:boolean){
 const [route,setRoute]=useState<PanelLocation>(initial),current=useRef(initial),scroll=useRef<number|null>(null);
 useEffect(()=>{
  const previous=history.scrollRestoration;history.scrollRestoration="manual";
  let frame=0;
  const remember=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(scroll.current===null)history.replaceState({...history.state,panelScroll:window.scrollY},"",location.href)})};
  const restore=()=>{const value=readLocation();scroll.current=Number(history.state?.panelScroll)||0;current.current=value;setRoute(value)};
  restore();window.addEventListener("popstate",restore);window.addEventListener("scroll",remember,{passive:true});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener("popstate",restore);window.removeEventListener("scroll",remember);history.scrollRestoration=previous};
 },[]);
 useEffect(()=>{
  if(!ready||scroll.current===null)return;
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{window.scrollTo({top:scroll.current??0,behavior:"instant"});scroll.current=null})});
  return()=>cancelAnimationFrame(frame);
 },[route,ready]);
 const navigate=useCallback((patch:Partial<PanelLocation>,replace=false)=>{
  const value={...current.current,...patch},url=locationUrl(value);
  if(url!==location.pathname+location.search+location.hash){
   history.replaceState({...history.state,panelScroll:window.scrollY},"",location.href);
   history[replace?"replaceState":"pushState"]({...history.state,panelScroll:replace?window.scrollY:0},"",url);
   if(!replace)scroll.current=0;
  }
  current.current=value;setRoute(value);
 },[]);
 return {route,navigate};
}
