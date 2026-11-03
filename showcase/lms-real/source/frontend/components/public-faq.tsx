"use client";
import {useEffect,useRef,useState} from "react";
import {Search,X} from "lucide-react";
import {api} from "@/lib/api";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";

type Item={id:number;title:string;body:string};
type Content=Record<string,{title:string;body:string}>;
const schoolQuestions:Item[]=[
 {id:-1,title:"مدرسه مدرسه نمونه برای چه مقطع و پایه‌هایی است؟",body:"مدرسه نمونه، دبیرستان دخترانه دوره دوم متوسطه نظری در کرمان است و در پایه‌های دهم، یازدهم و دوازدهم فعالیت می‌کند."},
 {id:-2,title:"برای درخواست ثبت‌نام از کجا شروع کنیم؟",body:"در صفحه پذیرش، فرم درخواست را با اطلاعات دانش‌آموز و شماره تماس خانواده تکمیل کنید. شرایط پذیرش و مدارک موردنیاز همان‌جا اعلام می‌شود."},
 {id:-3,title:"ثبت فرم اینترنتی به معنی ثبت‌نام قطعی است؟",body:"خیر. فرم اینترنتی برای ثبت درخواست اولیه است. بررسی شرایط و تکمیل مراحل پذیرش با هماهنگی مدرسه انجام می‌شود."},
 {id:-4,title:"چطور وضعیت درخواست پذیرش را پیگیری کنیم؟",body:"کد پیگیری دریافتی پس از ثبت فرم را نگه دارید و از بخش پیگیری درخواست در صفحه پذیرش استفاده کنید. در صورت نیاز، با مدرسه تماس بگیرید."},
 {id:-5,title:"برای پذیرش چه مدارکی لازم است؟",body:"فهرست مدارک و الزامی یا اختیاری بودن آن‌ها در فرم پذیرش مشخص است. مدارک قابل بارگذاری را طبق همان فهرست آماده کنید؛ درباره اصل مدارک و مراحل حضوری از دفتر مدرسه راهنمایی بگیرید."},
 {id:-6,title:"ظرفیت و شرایط پذیرش هر رشته را چطور بدانیم؟",body:"برای اطلاع از ظرفیت جاری هر پایه و رشته، زمان ثبت‌نام و شرایط آموزشی با دفتر مدرسه تماس بگیرید. ظرفیت نهایی بر اساس شرایط همان سال تحصیلی اعلام می‌شود."},
 {id:-7,title:"آیا می‌توان پیش از مراجعه فضای مدرسه را دید؟",body:"بله. از گزینه تور مجازی در منوی سایت می‌توانید فضای مدرسه را ببینید. برای بازدید حضوری، پیش از مراجعه با دفتر مدرسه هماهنگ کنید."},
 {id:-8,title:"چطور با مدرسه تماس بگیریم و نشانی را پیدا کنیم؟",body:"شماره‌های تماس، نشانی و ساعات پاسخ‌گویی در صفحه تماس با ما و پایین سایت قرار دارند. از نقشه و گزینه مسیریابی هم می‌توانید استفاده کنید."},
 {id:-9,title:"آیا مدرسه سرویس رفت‌وآمد یا برنامه فوق‌برنامه دارد؟",body:"برای اطلاع از سرویس، برنامه‌های فوق‌برنامه، شرایط استفاده و هزینه‌های احتمالی با دفتر مدرسه تماس بگیرید؛ این موارد ممکن است در هر سال تحصیلی متفاوت باشند."},
 {id:-10,title:"خبرها و برنامه‌های مدرسه را کجا دنبال کنیم؟",body:"اطلاعیه‌ها و گزارش فعالیت‌ها در بخش خبرها و ایام در مدرسه نمونه منتشر می‌شوند. مناسبت‌های سال تحصیلی نیز در تقویم صفحه اصلی نمایش داده می‌شوند."},
 {id:-11,title:"اگر اطلاعات درخواست را اشتباه وارد کردیم چه کنیم؟",body:"برای راهنمایی درباره اصلاح اطلاعات، با مدرسه تماس بگیرید و کد پیگیری درخواست را در اختیار دفتر قرار دهید. پیش از هماهنگی، درخواست تکراری ثبت نکنید."},
];
export function PublicFaq(){
 const [query,setQuery]=useState(""),[retry,setRetry]=useState(0);const searchInput=useRef<HTMLInputElement>(null);
 const [items,setItems]=useState<Item[]>([]),[content,setContent]=useState<Content>({}),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;setLoading(true);setError("");Promise.all([api<Content>("/public/"),api<Item[]>("/public/items/?category=faq")]).then(([c,i])=>{if(live){setContent(c);setItems(i)}}).catch(()=>{if(live)setError("دریافت پرسش‌ها ممکن نشد.")}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[retry]);
 const allQuestions=[...items,...schoolQuestions.filter(question=>!items.some(item=>item.title.trim()===question.title))];
 const needle=query.trim().toLocaleLowerCase("fa"),questions=allQuestions.filter(item=>!needle||(item.title+" "+item.body).toLocaleLowerCase("fa").includes(needle));
 return <PublicShell><PublicPageIntro title={content.faq?.title||"پرسش‌های متداول"} kicker="پاسخ‌های کوتاه و روشن"><p>{content.faq?.body||"آنچه خانواده‌ها درباره مدرسه، پذیرش و ارتباط با ما می‌پرسند."}</p></PublicPageIntro><div id="public-page-content" className="container public-page-content"><div className="news-search" role="search"><label>جست‌وجوی پرسش‌ها<input ref={searchInput} type="search" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)}/></label><Search size={17}/>{query&&<button type="button" className="icon-button" aria-label="پاک کردن جست‌وجوی پرسش‌ها" title="پاک کردن جست‌وجوی پرسش‌ها" onClick={()=>{setQuery("");searchInput.current?.focus()}}><X size={17}/></button>}</div>{error&&<div className="error" role="alert">{error}<button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>تلاش دوباره</button></div>}{loading?<p role="status">در حال دریافت پرسش‌ها…</p>:!questions.length?<p role="status">پرسشی پیدا نشد.</p>:<section className="faq-list" aria-label="پرسش‌ها و پاسخ‌ها">{questions.map((item,index)=><details key={item.id} open={index===0} data-public-reveal><summary>{item.title}</summary><p>{item.body}</p></details>)}</section>}</div></PublicShell>;
}
