"use client";
import {PencilLoader} from "@/components/ui/loader-1";
import {useEffect,useState} from "react";
import type {CSSProperties} from "react";
import Link from "next/link";
import {ArrowUpLeft,ArrowLeft,BookOpen,Atom,Pi,GraduationCap} from "lucide-react";
import {PublicNews} from "@/components/public-news";
import {PublicFooter,PublicHeader} from "@/components/public-shell";
import {api} from "@/lib/api";
import {HOMEPAGE_KEY, readHomepage} from "@/lib/homepage";
import {LearningCharacters, SchoolCalendar, SchoolNumbers, TypedHeadline, VirtualTour} from "@/components/homepage-experience";
import {PublicExperience,usePublicMotion} from "@/components/public-experience";
import {LearningTrail} from "@/components/learning-scenes";
import {PublicPhotoSlider} from "@/components/public-photo-slider";
import {SCHOOL_TOUR_URL} from "@/lib/public-links";
import "./homepage-motion.css";
import "./homepage-experience.css";
export default function Home(){
 return <PublicExperience className="homepage"><HomeContent/></PublicExperience>;
}
function HomeContent(){
 const [content,setContent]=useState<Record<string,{title:string,body:string}>>({});
 const [ready,setReady]=useState(false),[contentLoaded,setContentLoaded]=useState(false);
 const {paused}=usePublicMotion();
 const settings=readHomepage(content[HOMEPAGE_KEY]?.body);
 useEffect(()=>{api("/public/").then(setContent).catch(()=>{}).finally(()=>setContentLoaded(true));},[]);
 return <div className={ready?"homepage-content is-ready":"homepage-content"}>
 <SiteEntrance loaded={contentLoaded} onComplete={setReady}/>
 <div className="top-strip">{content["site-notice"]?.title||"سال تحصیلی جدید، فرصتی برای یک شروع تازه"} <span>{content["site-notice"]?.body||"دوره دوم متوسطه"}</span></div>
 <PublicHeader/>
 <main id="main-content">
 <section className="learning-hero" aria-label="دبیرستان دخترانه مدرسه نمونه">
 <img className="learning-backdrop" src="/hero.webp" alt="" width="1536" height="1024" fetchPriority="high"/>
 <div className="container hero-content"><div className="hero-copy"><div className="eyebrow school-identity">دبیرستان دخترانه مدرسه نمونه <span/> کرمان</div><TypedHeadline/><p>{content.hero?.body||"اینجا هر پرسش، شروع یک کشف تازه است؛ کنار هم یاد می‌گیریم، تجربه می‌کنیم و برای فردا آماده می‌شویم."}</p><div className="hero-actions"><a href="#about" className="text-link">مدرسه ما را بشناسید <ArrowLeft size={18}/></a></div><div className="hero-note"><GraduationCap size={21}/><span>همراه شما در پایه‌های دهم، یازدهم و دوازدهم</span></div></div><div className="hero-trail-accent"><LearningTrail/></div></div>
 </section>
 <SchoolNumbers stats={settings.stats} paused={paused}/>
 <PublicPhotoSlider/>
 <section id="majors" className="majors container" data-reveal><div className="section-heading"><div><span className="eyebrow">مسیر خودت را پیدا کن</span><h2>دو مسیر، بی‌نهایت فرصت</h2></div><p>برای علاقه‌های متفاوت، مسیرهای متفاوتی هست.</p></div><div className="major-grid">{[{icon:Pi,title:"ریاضی‌فیزیک",text:"از کشف الگوها تا حل مسئله",class:"lavender"},{icon:Atom,title:"علوم تجربی",text:"برای ذهن‌های پرسشگر و جست‌وجوگر",class:"peach"}].map((m,i)=><article className={"major-card "+m.class} style={{"--card-index":i} as CSSProperties} key={m.title}><span className="major-number">{new Intl.NumberFormat("fa-IR",{minimumIntegerDigits:2}).format(i+1)}</span><m.icon size={35} strokeWidth={1.5}/><h3>{m.title}</h3><p>{m.text}</p><Link href={"/admissions?major="+["math","science"][i]} aria-label={"ثبت درخواست "+m.title}><ArrowUpLeft/></Link></article>)}</div></section>
 <section id="about" className="about container" data-reveal><div className="about-tile learning-vignette"><div className="vignette-copy"><span className="eyebrow">مدرسه ما</span><h2>کنار هم،<br/>بیشتر رشد می‌کنیم.</h2></div><LearningCharacters/></div><div><span className="eyebrow">آشنایی با مدرسه نمونه</span><h2>{content.about?.title||"فضایی برای یادگیری و رشد"}</h2><p>{content.about?.body||"دبیرستان دخترانه مدرسه نمونه دوره دوم در کرمان، همراه دانش‌آموزان در مسیر تحصیل است."}</p><div className="feature-line"><BookOpen/><span>آموزش حضوری، همراه با فضای یادگیری دیجیتال</span></div><div className="feature-line"><GraduationCap/><span>ارتباط نزدیک‌تر مدرسه، دانش‌آموز و خانواده</span></div></div></section>
 <section className="public-directory-links container" data-reveal>{[["/staff","کادر مدرسه","آشنایی با همراهان آموزشی"],["/honors","افتخارات","دستاوردهای دانش‌آموزان و مدرسه"],["/gallery","گالری","تصویرهایی از روزهای مدرسه نمونه"],[SCHOOL_TOUR_URL,"تور مجازی","گشتی در فضاهای مدرسه"]].map(([href,title,text])=><Link href={href} key={href}><span>{title}</span><small>{text}</small><ArrowUpLeft/></Link>)}</section>
 <VirtualTour tour={settings.tour}/>
 <SchoolCalendar events={settings.events}/>
 <section id="life" className="life container" data-reveal><div className="section-heading"><div><span className="eyebrow">از روزهای مدرسه</span><h2>ایام در مدرسه نمونه</h2></div><span className="muted">اخبار، فعالیت‌ها و افتخارات مدرسه</span></div><PublicNews latest/></section>
 </main><PublicFooter/></div>
}

function SiteEntrance({loaded,onComplete}:{loaded:boolean;onComplete:(ready:boolean)=>void}){
 useEffect(()=>{if(loaded)onComplete(true)},[loaded,onComplete]);
 if(loaded)return null;
 return <div className="site-entrance"><PencilLoader label="دبیرستان دخترانه مدرسه نمونه"/></div>;
}
