"use client";
import {AlertCircle,ArrowLeft,Bell,BookOpen,CalendarClock,CheckCircle2,ClipboardList,FileQuestion,FileText,GraduationCap,Users} from "lucide-react";
import {dateFa,fa} from "@/lib/api";

type ClassRow={id:number;title:string;year:string;major:string;count:number};
type Person={id:number;name:string};
type Action={key:string;title:string;detail:string;count:number;tab:string;tone:"default"|"warning"|"urgent"};
type Schedule={id:number;period:number;subject:string;classroom:string;teacher:string;kind:"regular"|"makeup"};
type Deadline={key:string;kind:"assignment"|"exam";title:string;detail:string;at:string;tab:string;state:string};
type Notice={id:number;title:string;body:string;date:string};
type DashboardData={
 classes:ClassRow[];children:Person[];unread_announcements:number;
 announcements:Notice[];stats:{classes:number;students:number;assignments:number;admissions:number|null};
 operations:{actions:Action[];schedule:Schedule[];deadlines:Deadline[]};
};

const dateTimeFa=(value:string)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(value));
const actionIcon=(tone:string)=>tone==="urgent"?<AlertCircle/>:tone==="warning"?<CalendarClock/>:<CheckCircle2/>;

export function DashboardHome({data,name,office,onNavigate}:{data:DashboardData;name:string;office:boolean;onNavigate:(tab:string)=>void}){
 const operations=data.operations||{actions:[],schedule:[],deadlines:[]};
 const stats=[
  {title:"کلاس‌های در دسترس",value:data.stats.classes,icon:BookOpen},
  {title:"دانش‌آموزان مرتبط",value:data.stats.students,icon:Users},
  {title:"تکلیف‌های منتشرشده",value:data.stats.assignments,icon:FileText},
  {title:office?"درخواست‌های پذیرش":"اطلاعیه‌های خوانده‌نشده",value:office?(data.stats.admissions||0):data.unread_announcements,icon:Bell},
 ];
 return <>
  <div className="dashboard-welcome"><div><h2>{office?'وضعیت امروز مدرسه':'فعالیت‌های امروز'}</h2></div><GraduationCap aria-hidden="true"/></div>
  {data.children.length>0&&<div className="children">{data.children.map(child=><span key={child.id}>فرزند شما: <b>{child.name}</b></span>)}</div>}
  <div className="stats-grid">{stats.map(item=><div className="stat" key={item.title}><div className="stat-top"><span>{item.title}</span><item.icon/></div><strong>{fa(item.value||0)}</strong></div>)}</div>
  <div className="operations-grid">
   <section className="card operational-card"><div className="section-title"><div><h2>نیازمند اقدام</h2><p>مواردی که بهتر است زودتر بررسی شوند</p></div><ClipboardList/></div>
    {!operations.actions.length?<div className="operational-empty"><CheckCircle2/><span>کار فوری ثبت نشده است.</span></div>:<div className="action-list">{operations.actions.map(item=><button key={item.key} className={"action-row "+item.tone} onClick={()=>onNavigate(item.tab)}><span className="action-icon">{actionIcon(item.tone)}</span><span><b>{item.title}</b><small>{item.detail}</small></span><strong>{fa(item.count)}</strong><ArrowLeft/></button>)}</div>}
   </section>
   <section className="card operational-card"><div className="section-title"><div><h2>برنامه امروز</h2><p>{dateFa(new Date().toISOString())}</p></div><CalendarClock/></div>
    {!operations.schedule.length?<div className="operational-empty"><CalendarClock/><span>جلسه‌ای برای امروز ثبت نشده است.</span></div>:<div className="today-schedule">{operations.schedule.map(row=><article key={row.id}><span className="period-number">{fa(row.period)}</span><div><b>{row.subject}</b><small>{row.classroom} · {row.teacher}</small></div>{row.kind==="makeup"&&<em>جبرانی</em>}</article>)}</div>}
   </section>
  </div>
  {operations.deadlines.length>0&&<section className="card deadline-card"><div className="section-title"><div><h2>مهلت‌های نزدیک</h2><p>تکلیف‌های بدون پاسخ و آزمون‌های دو هفته آینده</p></div><CalendarClock/></div><div className="deadline-list">{operations.deadlines.map(row=><button key={row.key} onClick={()=>onNavigate(row.tab)}><span className={"deadline-kind "+row.kind}>{row.kind==="exam"?<FileQuestion/>:<FileText/>}</span><span><b>{row.title}</b><small>{row.detail}</small></span><time dateTime={row.at}>{dateTimeFa(row.at)}</time><ArrowLeft/></button>)}</div></section>}
  <div className="dashboard-grid"><section className="card"><div className="section-title"><h2>کلاس‌های شما</h2><button className="text-link" onClick={()=>onNavigate("classes")}>مشاهده همه <ArrowLeft size={15}/></button></div>{data.classes.length?data.classes.map(row=><div className="class-row" key={row.id}><span className="class-icon"><BookOpen size={21}/></span><div><h3>{row.title}</h3><p>{row.major} · {row.year}</p></div><span className="row-end">{fa(row.count)} دانش‌آموز</span></div>):<div className="operational-empty"><BookOpen/><span>کلاسی به حساب شما اختصاص داده نشده است.</span></div>}</section>
   <section className="card"><div className="section-title"><h2>تابلوی اطلاعیه‌ها</h2><button className="text-link" onClick={()=>onNavigate("announcements")}>همه اطلاعیه‌ها <ArrowLeft size={15}/></button></div>{data.announcements.length?data.announcements.map(row=><div className="announcement" key={row.id}><span className="badge">{dateFa(row.date)}</span><h3>{row.title}</h3><p>{row.body}</p></div>):<div className="operational-empty"><Bell/><span>اطلاعیه‌ای برای نمایش وجود ندارد.</span></div>}</section>
  </div>
 </>;
}
