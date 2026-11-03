"use client";
import {useEffect,useState} from "react";
import {api} from "@/lib/api";
import {PublicNews} from "@/components/public-news";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";
export function PublicNewsPage(){
 const [intro,setIntro]=useState<{title:string;body:string}|null>(null);
 useEffect(()=>{api<Record<string,{title:string;body:string}>>("/public/").then(x=>setIntro(x.news||null)).catch(()=>{})},[]);
 return <PublicShell><PublicPageIntro title={intro?.title||"خبرهای مدرسه نمونه"} kicker="تازه‌های مدرسه"><p>{intro?.body||"رویدادها، فعالیت‌ها و اطلاعیه‌های منتشرشده مدرسه را اینجا دنبال کنید."}</p></PublicPageIntro><div id="public-page-content" className="container public-page-content"><PublicNews/></div></PublicShell>;
}
