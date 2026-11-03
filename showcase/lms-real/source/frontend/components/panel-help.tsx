"use client";
import {useRef,useState} from "react";
import {ArrowLeft,BookOpen,CheckCircle2,ChevronDown,Search,ShieldCheck,X,type LucideIcon} from "lucide-react";
import {panelHelpGuides,type HelpGroup,type HelpGuide} from "@/lib/panel-help";
import {panelHelpDetails,helpCommonControls,helpCommonQuestions,type HelpDetails} from "@/lib/panel-help-details";
import {fa} from "@/lib/api";
import "@/app/panel-help.css";

type HelpSection={id:string;label:string;icon:LucideIcon};
const groups:{id:HelpGroup;label:string}[]=[{id:"daily",label:"حضور و پیگیری"},{id:"learning",label:"آموزش و کلاس"},{id:"management",label:"مدیریت مدرسه"},{id:"communication",label:"پیام و اطلاع‌رسانی"},{id:"website",label:"سایت عمومی"}];
const normalize=(value:string)=>value.replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/\u200c/g," ").replace(/\s+/g," ").trim().toLocaleLowerCase("fa");

function HelpDetail({detail,searching}:{detail:HelpDetails;searching:boolean}){
 return <div className="help-detail">
  <section><h4>پیش از شروع</h4>{detail.before.map(text=><p key={text}>{text}</p>)}</section>
  <section><h4>دکمه‌ها و فیلترها</h4><dl>{detail.controls.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.description}</dd></div>)}</dl></section>
  <section><h4>انجام کار، قدم‌به‌قدم</h4>{detail.workflows.map(item=><details key={item.title} open={searching?true:undefined}><summary>{item.title}<ChevronDown size={16}/></summary><ol>{item.steps.map((step,index)=><li key={step}><span aria-hidden="true">{fa(index+1)}</span><p>{step}</p></li>)}</ol></details>)}</section>
  <section><h4>اگر کار انجام نشد</h4><dl>{detail.problems.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.description}</dd></div>)}</dl></section>
 </div>;
}

export function PanelHelp({sections,roleLabel,onOpen}:{sections:HelpSection[];roleLabel:string;onOpen:(section:string)=>void}){
 const [query,setQuery]=useState(""),[group,setGroup]=useState<HelpGroup|"all">("all");
 const search=useRef<HTMLInputElement>(null);
 const available=sections.filter(section=>section.id!=="help").map(section=>({...section,guide:panelHelpGuides[section.id]||{group:"management",description:`اطلاعات و عملیات بخش ${section.label}.`,steps:["بخش را باز و گزینه‌های مجاز حساب خود را بررسی کنید."]} as HelpGuide}));
 const tokens=normalize(query).split(" ").filter(Boolean);
 const results=available.filter(section=>{
  const detail=panelHelpDetails[section.id];
  const text=[section.label,section.guide.description,...section.guide.steps,section.guide.note||"",...(detail?[...detail.before,...detail.controls.flatMap(item=>[item.label,item.description]),...detail.workflows.flatMap(item=>[item.title,...item.steps]),...detail.problems.flatMap(item=>[item.label,item.description])]:[])].join(" ");
  return (group==="all"||section.guide.group===group)&&tokens.every(token=>normalize(text).includes(token));
 });
 function clear(){setQuery("");search.current?.focus()}
 return <div className="help-copy panel-help">
  <header className="help-heading"><div className="help-heading-icon"><BookOpen size={30}/></div><div><span className="help-eyebrow">همراه کارهای روزانه مدرسه</span><h2>راهنمای بخش‌های پنل</h2><p>از پیدا کردن کلاس تا ثبت نمره؛ مسیر هر کار را اینجا ببینید.</p></div><span className="help-role"><ShieldCheck size={16}/>{roleLabel}<small>{fa(available.length)} بخش در دسترس</small></span></header>
  <section className="help-tools" aria-label="پیدا کردن راهنما"><label htmlFor="panel-help-search">چه کاری می‌خواهید انجام دهید؟</label><div className="help-search"><Search size={19}/><input id="panel-help-search" ref={search} type="search" placeholder="نام بخش، ثبت درس، تکلیف، کارنامه…" maxLength={120} value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" className="icon-button" title="پاک کردن جستجوی راهنما" aria-label="پاک کردن جستجوی راهنما" onClick={clear}><X size={17}/></button>}</div><div className="help-categories" aria-label="دسته‌بندی راهنما"><button type="button" aria-pressed={group==="all"} onClick={()=>setGroup("all")}>همه بخش‌ها</button>{groups.filter(item=>available.some(section=>section.guide.group===item.id)).map(item=><button type="button" key={item.id} aria-pressed={group===item.id} onClick={()=>setGroup(item.id)}>{item.label}</button>)}</div></section>
  <div className="help-result-heading"><h3>مسیر کار شما</h3><span role="status">{fa(results.length)} راهنما</span></div>
  {!results.length?<div className="help-empty"><Search size={28}/><h3>راهنمایی با این عبارت پیدا نشد.</h3><button type="button" className="button outline small" onClick={()=>{setGroup("all");clear()}}>پاک کردن فیلترها</button></div>:<div className="help-grid">{results.map(section=>{const Icon=section.icon;return <article className={`help-section help-tone-${section.guide.group}`} key={section.id} data-section={section.id}><header><span className="help-section-icon"><Icon size={22}/></span><div><small>{groups.find(item=>item.id===section.guide.group)?.label}</small><h3><button type="button" onClick={()=>onOpen(section.id)} aria-label={`ورود به ${section.label}`}>{section.label}<ArrowLeft size={18}/></button></h3></div></header><p>{section.guide.description}</p><details className="help-overview" open={tokens.length?true:undefined}><summary>مراحل انجام کار و نکته‌ها<ChevronDown size={16}/></summary><ol className="help-main-steps">{section.guide.steps.map((step,index)=><li key={step}><span aria-hidden="true">{fa(index+1)}</span><p>{step}</p></li>)}</ol>{section.guide.note&&<div className="help-note"><CheckCircle2 size={17}/><p>{section.guide.note}</p></div>}{panelHelpDetails[section.id]&&<HelpDetail detail={panelHelpDetails[section.id]} searching={tokens.length>0}/>}</details></article>})}</div>}
  <section className="help-common" aria-labelledby="help-controls-title"><div><BookOpen size={23}/><h3 id="help-controls-title">دکمه‌ها و رفتارهای مشترک</h3></div>{helpCommonControls.map(item=><details key={item.label}><summary>{item.label}<ChevronDown size={16}/></summary><p>{item.description}</p></details>)}</section>
  <section className="help-common" aria-labelledby="help-common-title"><div><ShieldCheck size={23}/><h3 id="help-common-title">حساب، دسترسی و ثبت اطلاعات</h3></div>{helpCommonQuestions.map(item=><details key={item.label}><summary>{item.label}<ChevronDown size={16}/></summary><p>{item.description}</p></details>)}{available.some(section=>section.id==="sms")&&<details><summary>پیامک‌ها را از کجا پیگیری کنم؟<ChevronDown size={16}/></summary><p>گزارش ارسال و خطاهای پیامک در پنل پیامکی قرار دارد؛ پیام‌ها برای گفت‌وگوی داخل سامانه است.</p><button type="button" className="text-link" onClick={()=>onOpen("sms")}>ورود به پنل پیامکی<ArrowLeft size={16}/></button></details>}</section>
 </div>;
}
