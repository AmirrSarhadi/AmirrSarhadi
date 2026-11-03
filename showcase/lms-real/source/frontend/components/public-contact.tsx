"use client";
import {useEffect,useState} from "react";
import {Clock,Mail,MapPin,Phone} from "lucide-react";
import Link from "next/link";
import {api} from "@/lib/api";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";
import {publicPhones} from "@/lib/public-contact";

type Content=Record<string,{title:string;body:string}>;
export function PublicContact(){
 const [content,setContent]=useState<Content>({}),[error,setError]=useState("");
 useEffect(()=>{api<Content>("/public/").then(setContent).catch(()=>setError("دریافت اطلاعات تماس ممکن نشد."))},[]);
 const phone=content["contact-phone"]?.body||"هنوز وارد نشده",email=content["contact-email"]?.body||"هنوز وارد نشده";
 const cards=[
  {key:"contact-address",title:"نشانی مدرسه",fallback:"کرمان · نشانی دقیق پس از ورود اطلاعات نمایش داده می‌شود.",icon:MapPin},
  {key:"contact-phone",title:"شماره تماس",fallback:phone,icon:Phone},
  {key:"contact-email",title:"پست الکترونیکی",fallback:email,icon:Mail},
  {key:"contact-hours",title:"ساعات پاسخ‌گویی",fallback:"ساعات پاسخ‌گویی پس از ورود اطلاعات نمایش داده می‌شود.",icon:Clock},
 ];
 return <PublicShell><PublicPageIntro title={content.contact?.title||"تماس با مدرسه نمونه"} kicker="با ما در ارتباط باشید"><p>{content.contact?.body||"برای پرسش درباره مدرسه و فرایند پذیرش از راه‌های زیر با ما در ارتباط باشید."}</p></PublicPageIntro><div id="public-page-content" className="container public-page-content">
 {error&&<div className="error" role="alert">{error}</div>}
 <section className="contact-grid" aria-label="اطلاعات ارتباطی مدرسه">{cards.map(card=>{const value=content[card.key]?.body||card.fallback;return <article key={card.key} data-public-reveal><card.icon aria-hidden="true"/><div><h2>{content[card.key]?.title||card.title}</h2>{card.key==="contact-phone"&&publicPhones(phone).length?publicPhones(phone).map(item=><a key={item.number} href={`tel:${item.number}`} dir="ltr">{item.label}</a>):card.key==="contact-email"&&email!=="هنوز وارد نشده"?<a href={`mailto:${email.trim()}`} dir="ltr">{email}</a>:<p>{value}</p>}</div></article>})}</section>
 {content["contact-map"]?.body&&<section className="map-note" data-public-reveal><MapPin/><div><h2>{content["contact-map"].title||"راهنمای مسیر"}</h2><p>{content["contact-map"].body}</p></div></section>}
 <section className="contact-tail" data-public-reveal><div><h2>پرسشی درباره پذیرش دارید؟</h2><p>پاسخ پرسش‌های متداول و فرم درخواست در دسترس شماست.</p></div><Link className="button outline" href="/faq">پرسش‌های متداول</Link></section>
 </div></PublicShell>;
}
