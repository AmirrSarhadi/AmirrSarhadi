"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ArrowUp,ArrowUpLeft,Clock3,Mail,MapPin,Menu,Phone,X} from "lucide-react";
import {Brand} from "@/components/brand";
import {api} from "@/lib/api";
import {PublicExperience} from "@/components/public-experience";
import {RadialSocialMenu} from "@/components/ui/radial-social-menu";
import {publicPhones} from "@/lib/public-contact";
import {SchoolMap} from "@/components/school-map";
import {SCHOOL_TOUR_URL} from "@/lib/public-links";

type Content=Record<string,{title:string;body:string}>;
const links=[
 ["/","خانه"],
 ["/about","معرفی مدرسه"],["/staff","کادر مدرسه"],["/honors","افتخارات"],
 ["/gallery","گالری"],[SCHOOL_TOUR_URL,"تور مجازی"],["/news","خبرها"],["/contact","تماس با ما"],
];

export function PublicHeader(){
 const pathname=usePathname(),[open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus()}};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[open]);
 return <header className="public-header"><Brand/><nav id="public-navigation" className={open?"open":""} aria-label="ناوبری اصلی">{links.map(([href,label])=><Link className={pathname===href?"active":""} aria-current={pathname===href?"page":undefined} key={href} href={href}>{label}</Link>)}<Link className="mobile-admission-link" href="/admissions">درخواست ثبت‌نام <ArrowUpLeft size={17}/></Link></nav><div className="public-header-actions"><Link className="button small" href="/admissions">درخواست ثبت‌نام <ArrowUpLeft size={17}/></Link></div><button className="mobile-menu icon-button" aria-label={open?"بستن منو":"باز کردن منو"} aria-expanded={open} aria-controls="public-navigation" onClick={()=>setOpen(x=>!x)}>{open?<X/>:<Menu/>}</button></header>;
}

export function PublicFooter(){
 const [content,setContent]=useState<Content>({});
 useEffect(()=>{api<Content>("/public/").then(setContent).catch(()=>{})},[]);
 const address=content["contact-address"]?.body||"کرمان · نشانی مدرسه پس از تکمیل اطلاعات نمایش داده می‌شود.";
 const phone=content["contact-phone"]?.body||"";
 const email=content["contact-email"]?.body||"";
 const phones=publicPhones(phone);
 return <footer className="public-footer">
  <div className="footer-details footer-book">
  <div className="container footer-main">
   <div className="footer-intro">
   <section className="footer-brand" data-public-reveal><Brand/><p>{content.about?.body||"دبیرستان دخترانه دوره دوم متوسطه نظری مدرسه نمونه در کرمان؛ جایی برای یادگیری، کشف توانایی‌ها و ساختن فردا."}</p></section>
   <div className="footer-navs" data-public-reveal><nav className="footer-links" aria-label="آشنایی با مدرسه"><h2>مدرسه ما</h2><Link href="/about">داستان مدرسه نمونه</Link><Link href="/staff">کادر مدرسه</Link><a href={SCHOOL_TOUR_URL}>تور مجازی</a><Link href="/honors">افتخارات</Link><Link href="/gallery">گالری تصاویر</Link></nav>
   <nav className="footer-links" aria-label="خدمات و راهنما"><h2>همراه خانواده‌ها</h2><Link href="/news">خبرهای مدرسه</Link><Link href="/admissions">ثبت درخواست و پیگیری</Link><Link href="/faq">پرسش‌های متداول</Link><Link href="/privacy">حریم خصوصی</Link><Link href="/portal/login">ورود کارکنان</Link></nav></div>
   </div>
   <section className="footer-contact" data-public-reveal><h2>درباره ما</h2><p><MapPin size={17}/><span>{address}</span></p>{phones.map(item=><a key={item.number} href={`tel:${item.number}`}><Phone size={16}/><span dir="ltr">{item.label}</span></a>)}{email&&<a href={`mailto:${email.trim()}`}><Mail size={16}/><span dir="ltr">{email}</span></a>}{content["contact-hours"]?.body&&<p><Clock3 size={17}/><span>{content["contact-hours"].body}</span></p>}<Link className="footer-contact-link" href="/contact">راه‌های ارتباطی و نشانی <ArrowUpLeft size={16}/></Link></section>
   <section className="footer-map" data-public-reveal><h2>نشانی روی نقشه</h2><SchoolMap/></section>
   <section className="footer-social" aria-label="راه‌های ارتباطی مدرسه" data-public-reveal><h2>همیشه در ارتباط</h2><RadialSocialMenu phone={phones[0]?.number} email={email} eitaa={content["contact-eitaa"]?.body} rubika={content["contact-rubika"]?.body}/></section>
  </div>
  </div>
  <div className="container footer-bottom"><span>دبیرستان دخترانه مدرسه نمونه · تمامی حقوق محفوظ است.</span><span className="footer-location">کرمان، ایران</span><a className="footer-to-top" href="#public-top" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالای صفحه"><ArrowUp size={19}/></a></div>
 </footer>;
}

export function PublicShell({children}:{children:React.ReactNode}){const section=usePathname().split("/")[1]||"home";return <PublicExperience className={`public-inner page-${section}`}><PublicHeader/><main id="main-content">{children}</main><PublicFooter/></PublicExperience>}
