"use client";
import {useEffect,useState} from "react";
import {BookOpen,Compass,Heart,History} from "lucide-react";
import {api} from "@/lib/api";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";
import {DiscoveryDesk} from "@/components/learning-scenes";

type Content=Record<string,{title:string;body:string}>;
const cards=[
 {key:"mission",fallback:"ماموریت ما",text:"فراهم کردن محیطی امن و پویا برای یادگیری عمیق و رشد همه‌جانبه.",icon:Compass},
 {key:"vision",fallback:"چشم‌انداز",text:"پرورش دانش‌آموزانی آگاه، مسئول و آماده برای ساختن آینده.",icon:BookOpen},
 {key:"values",fallback:"ارزش‌های ما",text:"احترام، مسئولیت‌پذیری، صداقت، همکاری و شوق یادگیری.",icon:Heart},
 {key:"history",fallback:"داستان مدرسه نمونه",text:"سابقه و مسیر شکل‌گیری مدرسه پس از ورود اطلاعات رسمی منتشر می‌شود.",icon:History},
];
export function PublicAbout(){
 const [content,setContent]=useState<Content>({}),[error,setError]=useState("");
 useEffect(()=>{api<Content>("/public/").then(setContent).catch(()=>setError("دریافت اطلاعات مدرسه ممکن نشد."))},[]);
 return <PublicShell><PublicPageIntro title={content.about?.title||"آشنایی با مدرسه نمونه"} kicker="مدرسه ما"><p>{content.about?.body||"دبیرستان دخترانه مدرسه نمونه دوره دوم در کرمان، همراه دانش‌آموزان در مسیر یادگیری و رشد است."}</p></PublicPageIntro><div id="public-page-content" className="container public-page-content">
 {error&&<div className="error" role="alert">{error}</div>}
 <section className="school-story" data-public-reveal><div><span className="eyebrow">از کلاس درس تا دنیای فردا</span><h2>یادگیری، یک مسیر مشترک است.</h2><p>در مدرسه نمونه، مسیر دوره دوم متوسطه را در پایه‌های دهم، یازدهم و دوازدهم همراه دانش‌آموزان طی می‌کنیم؛ با آموزش، تجربه و ارتباط نزدیک‌تر مدرسه و خانواده.</p></div><DiscoveryDesk/></section>
 <section className="about-values" aria-label="هویت و ارزش‌های مدرسه">{cards.map(card=>{const item=content[card.key];return <article key={card.key} data-public-reveal><card.icon aria-hidden="true"/><h2>{item?.title||card.fallback}</h2><p>{item?.body||card.text}</p></article>})}</section>
 <section className="learning-path" data-public-reveal><span className="eyebrow">مسیر آموزشی</span><h2>سه سال برای شناختن، آموختن و ساختن</h2><div>{[["دهم","شناخت علاقه‌ها و ساخت پایه‌ای محکم"],["یازدهم","تعمیق یادگیری و تجربه بیشتر"],["دوازدهم","جمع‌بندی و آمادگی برای قدم بعدی"]].map(([title,text],index)=><article key={title}><span>{new Intl.NumberFormat("fa-IR").format(index+10)}</span><h3>پایه {title}</h3><p>{text}</p></article>)}</div></section>
 </div></PublicShell>;
}
