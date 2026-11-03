"use client";
import dynamic from "next/dynamic";
import {PencilLoader} from "@/components/ui/loader-1";
const PanelHelp=dynamic(()=>import("@/components/panel-help").then(module=>module.PanelHelp),{loading:()=> <PencilLoader label="در حال آماده‌سازی راهنما…"/>});
const PasswordSettings=dynamic(()=>import("@/components/password-settings").then(module=>module.PasswordSettings),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const NewsEditor=dynamic(()=>import("@/components/news-editor").then(module=>module.NewsEditor),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const ContentEditor=dynamic(()=>import("@/components/content-editor").then(module=>module.ContentEditor),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
import {useEffect,useState} from "react";
import {usePanelNavigation} from "@/lib/panel-navigation";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Home,BookOpen,ClipboardCheck,FileText,FileQuestion,Users,UserCog,Globe,LogOut,ArrowUpLeft,ArrowLeft,CalendarDays,GraduationCap,Plus,Check,Menu,Bell,HelpCircle,Inbox,School,MessageCircle,MessageSquareText,Database,NotebookTabs,Archive,BarChart3} from "lucide-react";
const AdmissionsInbox=dynamic(()=>import("@/components/admissions-inbox").then(module=>module.AdmissionsInbox),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const TimetablePanel=dynamic(()=>import("@/components/timetable").then(module=>module.TimetablePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const AnnouncementsPanel=dynamic(()=>import("@/components/announcements").then(module=>module.AnnouncementsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const AttendanceReportPanel=dynamic(()=>import("@/components/attendance-report").then(module=>module.AttendanceReportPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const MonthlyReportCardsPanel=dynamic(()=>import("@/components/monthly-report-cards").then(module=>module.MonthlyReportCardsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const GradeEntryPanel=dynamic(()=>import("@/components/grade-entry").then(module=>module.GradeEntryPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی ثبت نمره…"/>});
const GradeListPanel=dynamic(()=>import("@/components/grade-list").then(module=>module.GradeListPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const AssignmentsPanel=dynamic(()=>import("@/components/assignments").then(module=>module.AssignmentsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const StaffAttendancePanel=dynamic(()=>import("@/components/staff-attendance").then(module=>module.StaffAttendancePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
import {PersianDatePicker} from "@/components/persian-date-picker";
import {Brand} from "@/components/brand";
import {hasCapability,presentationRole} from "@/lib/access-control";
import {NotificationCenter} from "@/components/notification-center";
import {SessionIdle} from "@/components/session-idle";
import {PanelNavigationDrawer} from "@/components/panel-navigation-drawer";
import "@/app/panel-polish.css";
import {NotificationRow,notificationsChanged,notificationTarget} from "@/lib/notifications";
import {PanelFeedback} from "@/components/panel-feedback";
import {MyClasses,ClassRoster,Classroom} from "@/components/my-classes";
const UserManagement=dynamic(()=>import("@/components/user-management").then(module=>module.UserManagement),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const SchoolStructure=dynamic(()=>import("@/components/school-structure").then(module=>module.SchoolStructure),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const StructureArchive=dynamic(()=>import("@/components/structure-archive").then(module=>module.StructureArchive),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const ExamsPanel=dynamic(()=>import("@/components/exams").then(module=>module.ExamsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const CommunicationsPanel=dynamic(()=>import("@/components/communications").then(module=>module.CommunicationsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const SmsManagementPanel=dynamic(()=>import("@/components/sms-management").then(module=>module.SmsManagementPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const DisciplinePanel=dynamic(()=>import("@/components/attendance-workflow").then(module=>module.DisciplinePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const NotificationsPanel=dynamic(()=>import("@/components/attendance-workflow").then(module=>module.NotificationsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const DailyAbsenceReviewPanel=dynamic(()=>import("@/components/daily-absence-review").then(module=>module.DailyAbsenceReviewPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const StudentCaseFilePanel=dynamic(()=>import("@/components/student-case-file").then(module=>module.StudentCaseFilePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
const TeacherCaseFilePanel=dynamic(()=>import("@/components/teacher-case-file").then(module=>module.TeacherCaseFilePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی پرونده معلم…"/>});
const DataExchangePanel=dynamic(()=>import("@/components/data-exchange").then(module=>module.DataExchangePanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
import {DashboardHome} from "@/components/dashboard-home";
const AcademicReportsPanel=dynamic(()=>import("@/components/academic-reports").then(module=>module.AcademicReportsPanel),{loading:()=> <PencilLoader label="در حال آماده‌سازی بخش…"/>});
import {api,send,fa,dateFa} from "@/lib/api";
import {isStaffPortalRole, learnerPortalsEnabled} from "@/lib/features";
type ClassRow=Classroom;
type Person={id:number,name:string,role:string,role_label:string,roles?:string[],role_labels?:string[],must_change_password?:boolean};
const panelNavigationOrder=new Map(["home","attendance-report","structure","classes","student-files","attendance","staff-attendance","absences","monthly-reports","grade-corrections","timetable","archive","data-exchange","academic-reports","users","teacher-files","discipline","notifications","assignments","exams","grade-entry","communications","sms","admissions","news","content","announcements","password","help"].map((id,index)=>[id,index]));
function panelNavigation(data:any){
const user:Person=data.user,staff=["manager","deputy","teacher"].includes(user.role),admin=["manager","deputy"].includes(user.role),learningRole=["manager","deputy","teacher","student","family"].includes(user.role);
const nav=user.must_change_password?[{id:"password",label:"تغییر رمز عبور",icon:Users}]:[
 ...(user.role==="manager"?[{id:"home",label:"خانه",icon:Home}]:[]),
 ...(["manager","deputy","student","family"].includes(user.role)?[{id:"attendance-report",label:"گزارش حضور",icon:ClipboardCheck}]:[]),
 ...(user.role!=="manager"?[{id:"home",label:"خانه",icon:Home}]:[]),...(learningRole?[{id:"classes",label:"کلاس‌های من",icon:BookOpen}]:[]),
 ...(admin?[{id:"structure",label:"ساختار مدرسه",icon:School}]:[]),
 ...(admin?[{id:"archive",label:"بایگانی",icon:Archive}]:[]),
 ...(admin?[{id:"data-exchange",label:"داده و گزارش‌ها",icon:Database}]:[]),
 ...(staff?[{id:"academic-reports",label:"گزارش‌های آموزشی",icon:BarChart3}]:[]),
 ...(admin?[{id:"users",label:"کاربران و نقش‌ها",icon:UserCog}]:[]),
 ...(admin?[{id:"student-files",label:"پرونده دانش‌آموزان",icon:GraduationCap}]:[]),
 ...(staff?[{id:"teacher-files",label:user.role==="teacher"?"پرونده من":"پرونده معلمان",icon:Users}]:[]),
 ...(staff?[{id:"attendance",label:"حضور و غیاب",icon:ClipboardCheck},{id:"staff-attendance",label:user.role==="teacher"?"حضور من":"حضور معلمان",icon:CalendarDays}]:[]),
 ...(admin?[{id:"absences",label:"لیست غایبین",icon:ClipboardCheck}]:[]),
 ...(staff?[{id:"discipline",label:"موارد انضباطی",icon:FileText},{id:"notifications",label:"اعلان‌ها",icon:Bell}]:[]),
 ...(learningRole?[{id:"assignments",label:"تکلیف‌ها",icon:FileText}]:[]),
 ...(["manager","deputy","teacher","student","family"].includes(user.role)?[{id:"exams",label:"آزمون آنلاین",icon:FileQuestion}]:[]),
 ...(["teacher","deputy"].includes(user.role)?[{id:"grade-entry",label:"ثبت نمره",icon:GraduationCap}]:[]),
 ...(["manager","deputy","teacher"].includes(user.role)?[{id:"monthly-reports",label:"کارنامه ماهیانه",icon:NotebookTabs}]:[]),
 ...(["manager","deputy","teacher","student","family"].includes(user.role)?[{id:"communications",label:"پیام‌ها",icon:MessageCircle}]:[]),
 ...(admin?[{id:"sms",label:"پنل پیامکی",icon:MessageSquareText}]:[]),
 ...(["manager","deputy","teacher"].includes(user.role)?[{id:"grade-corrections",label:"لیست نمره",icon:ClipboardCheck}]:[]),
 ...(admin?[{id:"admissions",label:"درخواست‌های ثبت‌نام",icon:Inbox}]:[]),
 ...(data.can_edit_news?[{id:"news",label:"اخبار سایت",icon:Globe}]:[]),...(data.can_edit_content?[{id:"content",label:"محتوای سایت",icon:Globe}]:[]),
 ...(["manager","deputy","teacher","student","family"].includes(user.role)?[{id:"timetable",label:"برنامه هفتگی",icon:CalendarDays}]:[]),
 {id:"announcements",label:"اطلاعیه‌ها",icon:Bell},...(user.role==="student"?[{id:"password",label:"تغییر رمز عبور",icon:Users}]:[]),{id:"help",label:"راهنمای سامانه",icon:HelpCircle}
];
const delegated:{[key:string]:{label:string;icon:any}}={
"classes":{label:"کلاس‌های من",icon:BookOpen},"attendance-report":{label:"گزارش حضور",icon:ClipboardCheck},"structure":{label:"ساختار مدرسه",icon:School},"archive":{label:"بایگانی",icon:Archive},"data-exchange":{label:"داده و گزارش‌ها",icon:Database},"academic-reports":{label:"گزارش‌های آموزشی",icon:BarChart3},"users":{label:"کاربران و نقش‌ها",icon:UserCog},"teacher-files":{label:"پرونده معلمان",icon:Users},"student-files":{label:"پرونده دانش‌آموزان",icon:GraduationCap},"attendance":{label:"حضور و غیاب",icon:ClipboardCheck},"staff-attendance":{label:"حضور معلمان",icon:CalendarDays},"absences":{label:"لیست غایبین",icon:ClipboardCheck},"discipline":{label:"موارد انضباطی",icon:FileText},"notifications":{label:"اعلان‌ها",icon:Bell},"assignments":{label:"تکلیف‌ها",icon:FileText},"exams":{label:"آزمون آنلاین",icon:FileQuestion},"grade-entry":{label:"ثبت نمره",icon:GraduationCap},"monthly-reports":{label:"کارنامه ماهیانه",icon:NotebookTabs},"grade-corrections":{label:"لیست نمره",icon:ClipboardCheck},"communications":{label:"پیام‌ها",icon:MessageCircle},"sms":{label:"پنل پیامکی",icon:MessageSquareText},"admissions":{label:"درخواست‌های ثبت‌نام",icon:Inbox},"news":{label:"اخبار سایت",icon:Globe},"content":{label:"محتوای سایت",icon:Globe},"timetable":{label:"برنامه هفتگی",icon:CalendarDays},"announcements":{label:"اطلاعیه‌ها",icon:Bell}};
if(!user.must_change_password)for(const id of new Set([...(data.access?.capabilities||[]),...Object.keys(data.access?.presentation||{})]))if(delegated[id]&&!nav.some(item=>item.id===id))nav.push({id,...delegated[id]});

return nav.filter(item=>item.id==="password"||hasCapability(data.access,item.id,true)).sort((a,b)=>(panelNavigationOrder.get(a.id)??panelNavigationOrder.size)-(panelNavigationOrder.get(b.id)??panelNavigationOrder.size));
}
export default function Panel(){
const router=useRouter();const [data,setData]=useState<any>(null),[error,setError]=useState(""),[success,setSuccess]=useState(""),[mobile,setMobile]=useState(false);
const {route,navigate}=usePanelNavigation(Boolean(data));
const nav=data?panelNavigation(data):[],allowedTabs=nav.map(item=>item.id).join(",");
const tab=data?.user.must_change_password?"password":route.tab,profileStudentId=route.studentId,classYear=route.year;
const classTarget:Classroom|undefined=data?.classes.find((row:Classroom)=>row.id===route.classId);
function setClassYear(year:string){navigate({year},true)}
function setTab(id:string){navigate({tab:id,classId:undefined,studentId:null,teacherId:undefined,reportPeriod:undefined,reportTeaching:undefined,absenceClassId:undefined,absenceDate:undefined,attendanceDate:undefined});setMobile(false)}
function openStudent(studentId:number){navigate({tab:"student-files",classId:undefined,studentId,reportPeriod:undefined,reportTeaching:undefined});setMobile(false)}
const [selected,setSelected]=useState(""),[students,setStudents]=useState<Person[]>([]),[teachings,setTeachings]=useState<any[]>([]),[teaching,setTeaching]=useState(""),[day,setDay]=useState(()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())),[period,setPeriod]=useState("1"),[records,setRecords]=useState<Record<number,string>>({}),[sheetVersion,setSheetVersion]=useState<number|null>(null),[finalized,setFinalized]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[reason,setReason]=useState("");

async function refresh(){const d=await api("/dashboard/",{loading:false});setData(d);if(!selected&&d.classes.length)setSelected(String(d.classes[0].id));}
async function switchRole(role:string){await action(async()=>{await send("/auth/active-role/",{role});navigate({tab:"home",classId:undefined,year:"",studentId:null,reportPeriod:undefined,reportTeaching:undefined},true);setSelected("");setStudents([]);setTeachings([]);setTeaching("");await refresh();setSuccess("فضای کاری تغییر کرد.")})}
useEffect(()=>{api("/auth/bootstrap/").then(async x=>{if(!x.user){router.replace("/portal/login");return}if(!learnerPortalsEnabled&&!isStaffPortalRole(x.user.role)){const staffRole=x.user.roles?.find((item:string)=>isStaffPortalRole(item));if(staffRole){await send("/auth/active-role/",{role:staffRole})}else{await send("/auth/logout/",{}).catch(()=>undefined);router.replace("/portal/login");return}}refresh().catch(e=>setError(e.message))}).catch(()=>setError("ارتباط با سرور برقرار نشد."))},[]);
useEffect(()=>{if(!data?.access?.stamp||data.user.must_change_password)return;let live=true;const check=()=>{if(document.hidden)return;api<{stamp:string}>("/auth/access-status/").then(value=>{if(live&&value.stamp!==data.access.stamp)void refresh()}).catch(()=>{})};const timer=setInterval(check,5000);window.addEventListener("focus",check);return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",check)}},[data?.access?.stamp,data?.user.id]);
useEffect(()=>{setError("");setSuccess("");setMobile(false)},[tab,route.classId,profileStudentId]);
useEffect(()=>{document.title=(tab==="roster"?"دانش‌آموزان کلاس":nav.find(item=>item.id===tab)?.label||"پنل")+" | مدرسه نمونه"},[tab,allowedTabs]);
useEffect(()=>{
 if(!data)return;
 const roster=tab==="roster"&&classTarget&&hasCapability(data.access,"classes",true)&&["manager","deputy","teacher"].includes(presentationRole(data.access,"classes",data.user.role))&&!data.user.must_change_password;
 if(route.classId&&!classTarget){navigate({tab:"classes",classId:undefined,studentId:null,reportPeriod:undefined,reportTeaching:undefined},true);return}
 if(!nav.some(item=>item.id===tab)&&!roster){const fallback=nav[0]?.id||"unavailable";if(tab!==fallback)navigate({tab:fallback,classId:undefined,studentId:null,reportPeriod:undefined,reportTeaching:undefined},true);return}
 if(classTarget)setSelected(String(classTarget.id));
},[allowedTabs,route.tab,route.classId,data?.user.role,Boolean(data),classTarget?.id]);
useEffect(()=>{setLoaded(false);setRecords({});setSheetVersion(null);setFinalized(false);setStudents([]);if(tab!=="attendance"||!selected||!hasCapability(data?.access,"attendance",["manager","deputy","teacher"].includes(data?.user.role)))return;let live=true;api("/classes/"+selected+"/roster/").then(x=>{if(live){setStudents(x.students);setTeachings(x.teachings);setTeaching(current=>String(x.teachings.some((item:any)=>String(item.id)===current)?current:x.teachings[0]?.id||""))}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[tab,selected,data?.user.role,data?.access?.stamp]);
useEffect(()=>{setLoaded(false);setRecords({});setSheetVersion(null);setFinalized(false)},[day,period]);
if(!data)return <div className="loading">{error?<div className="error">{error}<br/><Link href="/portal/login">بازگشت به ورود کارکنان</Link></div> :<PencilLoader label="در حال دریافت اطلاعات…"/>}</div>;
const user:Person={...data.user,role:presentationRole(data.access,tab==="roster"?"classes":tab,data.user.role)};const staff=["manager","deputy","teacher"].includes(user.role);const admin=["manager","deputy"].includes(user.role);
const learningRole=["manager","deputy","teacher","student","family"].includes(user.role);

const title=tab==="roster"?"دانش‌آموزان کلاس":nav.find(n=>n.id===tab)?.label||"خانه";
async function action(fn:()=>Promise<void>){setBusy(true);setError("");setSuccess("");try{await fn()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
async function loadSheet(){await action(async()=>{const x=await api("/classes/"+selected+"/attendance/?date="+day+"&period="+period);setRecords(Object.fromEntries(students.map(s=>[s.id,x.records.find((r:any)=>r.student_id===s.id)?.status||"present"])));setSheetVersion(x.version);setFinalized(x.finalized);setLoaded(true)})}
async function saveAttendance(finalize:boolean){await action(async()=>{const x=await send("/classes/"+selected+"/attendance/",{date:day,period:Number(period),teaching:teaching?Number(teaching):null,records:Object.entries(records).map(([student,status])=>({student:Number(student),status})),finalize,reason,expected_version:sheetVersion});setSheetVersion(x.version);setFinalized(x.finalized);setSuccess(x.finalized&&period==="0"?`حضور و غیاب نهایی شد و ${fa(x.absence_sms_queued||0)} پیامک غیبت در صف ارسال قرار گرفت.`:x.finalized?"حضور و غیاب نهایی شد.":"پیش‌نویس ذخیره شد.")})}
function switchTab(id:string){setTab(id)}
function openNotification(row:NotificationRow){const target=notificationTarget(row);if(!target||!nav.some(item=>item.id===target.section)){setError("بخش مرتبط با این اعلان برای نقش فعلی در دسترس نیست.");return}navigate({tab:target.section,classId:target.classroom_id,studentId:null,reportPeriod:target.period_id,reportTeaching:target.teaching_id});setMobile(false)}
function openClass(classroom:Classroom,id:string){setSelected(String(classroom.id));navigate({tab:id,classId:classroom.id,studentId:null,reportPeriod:undefined,reportTeaching:undefined});setMobile(false)}
return <div className="panel panel-feedback-ready"><SessionIdle userId={data.user.id}/><PanelFeedback onChanged={()=>{notificationsChanged();refresh().catch(e=>setError(e.message))}}/><PanelNavigationDrawer open={mobile} close={()=>setMobile(false)}><Brand/><span className="badge">سال تحصیلی {data.classes[0]?.year||"—"}</span><div className="nav-label">فضای کاری شما</div><nav>{nav.map(n=><button className={tab===n.id?"active":""} key={n.id} data-panel-section={n.id} aria-current={tab===n.id?"page":undefined} onClick={()=>switchTab(n.id)}><n.icon/>{n.label}{n.id==="communications"&&data.unread_messages>0&&<span className="nav-count" aria-hidden="true">{fa(data.unread_messages)}</span>}</button>)}</nav><div className="sidebar-bottom"><Link href="/"><Globe size={17}/>مشاهده سایت مدرسه</Link><button onClick={()=>action(async()=>{await send("/auth/logout/",{});router.replace("/portal/login")})}><LogOut size={17}/>خروج از حساب</button></div></PanelNavigationDrawer><div className="panel-main"><header className="panel-header"><button className="icon-button mobile-panel-menu" onClick={()=>setMobile(!mobile)} aria-label="باز کردن منو" aria-controls="panel-sidebar" aria-expanded={mobile}><Menu/></button><span className="breadcrumb">سامانه کارکنان مدرسه نمونه / {title}</span><div className="account">{hasCapability(data.access,"notifications",staff)&&!user.must_change_password&&<NotificationCenter key={user.id+"-"+data.user.role} onOpen={openNotification} onAll={()=>switchTab("notifications")}/>}<span className="avatar">{user.name[0]}</span><div><b>{user.name}</b>{(user.roles?.filter(role=>learnerPortalsEnabled||isStaffPortalRole(role)).length||0)>1?<select aria-label="نقش فعال" value={data.user.role} onChange={e=>switchRole(e.target.value)} disabled={busy}>{user.roles!.map((role,i)=>({role,label:user.role_labels?.[i]||role})).filter(item=>learnerPortalsEnabled||isStaffPortalRole(item.role)).map(item=><option key={item.role} value={item.role}>{item.label}</option>)}</select>:<small>{user.role_label}</small>}</div></div></header><main className="panel-content"><div className="page-title"><div><h1>{title==="خانه"?"روزتان بخیر، "+user.name:title}</h1></div><span className="date-pill"><CalendarDays size={15}/>{dateFa(data.date)}</span></div>{user.must_change_password&&<div className="notice">برای ادامه استفاده از سامانه، رمز اولیه خود را تغییر دهید.</div>}{error&&<div role="alert" className="error">{error}</div>}{success&&<div role="status" className="success">{success}</div>}
{classTarget&&<div className="class-context"><strong>{classTarget.title}</strong><span>{classTarget.year}</span><button type="button" className="text-link" onClick={()=>switchTab("classes")}>بازگشت به کلاس‌ها</button></div>}
{tab==="roster"&&classTarget&&staff&&hasCapability(data.access,"classes",true)&&<ClassRoster key={classTarget.id} classroom={classTarget} openStudent={admin&&hasCapability(data.access,"student-files",admin)?openStudent:undefined}/>}
{tab==="home"&&<DashboardHome data={data} name={user.name} office={admin} onNavigate={switchTab}/>}
{tab==="unavailable"&&<p className="notice" role="status">برای نقش فعلی دسترسی به بخشی فعال نیست. با مدیر سامانه تماس بگیرید.</p>}
{tab==="users"&&admin&&<UserManagement role={data.user.role} userId={user.id} onAccessChanged={refresh}/>}
{tab==="student-files"&&admin&&<StudentCaseFilePanel initialStudentId={profileStudentId} role={data.user.role}/>}
{tab==="teacher-files"&&["manager","deputy","teacher"].includes(data.user.role)&&<TeacherCaseFilePanel key={data.user.id+data.user.role} role={data.user.role} userId={data.user.id} teacherId={route.teacherId} onSelect={teacherId=>navigate({tab:'teacher-files',teacherId})}/>}
{tab==="structure"&&admin&&<SchoolStructure/>}
{tab==="archive"&&admin&&<StructureArchive/>}
{tab==="data-exchange"&&admin&&<DataExchangePanel canPrint={hasCapability(data.access,"reports.print",admin)} role={user.role}/>}
{tab==="academic-reports"&&staff&&<AcademicReportsPanel canPrint={hasCapability(data.access,"reports.print",admin)} key={classTarget?.id||"all"} classContext={classTarget} role={user.role} onOpenStudent={admin?openStudent:undefined}/>}
{tab==="staff-attendance"&&staff&&<StaffAttendancePanel role={user.role as "teacher"|"manager"|"deputy"} userId={user.id}/>}
{tab==="classes"&&learningRole&&<MyClasses allowedSections={nav.map(item=>item.id)} classes={data.classes} role={user.role} year={classYear} setYear={setClassYear} open={openClass} created={refresh}/>}
{tab==="attendance"&&staff&&<section className="card"><div className="toolbar attendance-entry-toolbar"><label>کلاس<select aria-label="کلاس" value={selected} onChange={e=>setSelected(e.target.value)}>{data.classes.map((c:ClassRow)=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><PersianDatePicker label="تاریخ حضور" value={day} onChange={setDay}/><label>زنگ<select aria-label="زنگ" value={period} onChange={e=>setPeriod(e.target.value)}>{admin&&<option value="0">حضور روزانه</option>}{[1,2,3,4,5,6].map(i=><option key={i} value={i}>زنگ {fa(i)}</option>)}</select></label>{period!=="0"&&<label>درس<select aria-label="درس" value={teaching} onChange={e=>setTeaching(e.target.value)}>{teachings.map(t=><option key={t.id} value={t.id}>{t.subject}</option>)}</select></label>}<button className="button" disabled={busy||!selected} onClick={loadSheet}>دریافت فهرست</button></div>{admin&&period==="0"&&<div className="notice">پیامک فقط پس از ثبت نهایی حضور روزانه، برای دانش‌آموزان غایب و به شماره ولی اصلی در صف ارسال قرار می‌گیرد. پیش‌نویس، تأخیر و حضور زنگ درسی پیامک ندارند.</div>}{loaded?<><div className="section-title"><span className={"badge "+(finalized?"green":"orange")}>{finalized?"ثبت نهایی شده":"پیش‌نویس"}</span><button className="text-link" disabled={finalized&&!admin} onClick={()=>setRecords(Object.fromEntries(students.map(s=>[s.id,"present"])))}><Check size={17}/>همه حاضرند</button></div><div className="table-wrap"><table><thead><tr><th>ردیف</th><th>دانش‌آموز</th><th>وضعیت حضور</th></tr></thead><tbody>{students.map((s,i)=><tr key={s.id}><td>{fa(i+1)}</td><td>{s.name}</td><td><div className="attendance-choice">{[["present","حاضر"],["absent","غایب"],["late","تأخیر"],["early","خروج زودهنگام"]].map(([v,l])=><button key={v} disabled={finalized&&!admin} className={records[s.id]===v?"selected "+v:""} onClick={()=>setRecords({...records,[s.id]:v})}>{l}</button>)}</div></td></tr>)}</tbody></table></div>{finalized&&admin&&<label style={{marginTop:20}}>دلیل اصلاح<input value={reason} onChange={e=>setReason(e.target.value)} required/></label>}<div className="attendance-footer"><span className="muted">ثبت‌شده: {fa(Object.keys(records).length)} از {fa(students.length)}</span>{(!finalized||admin)&&<div><button className="button outline small" disabled={busy} onClick={()=>saveAttendance(false)}>ذخیره پیش‌نویس</button><button className="button small" disabled={busy||Object.keys(records).length!==students.length} onClick={()=>saveAttendance(true)}>ثبت نهایی</button></div>}</div></>:<Empty text="کلاس، تاریخ و زنگ را انتخاب و فهرست را دریافت کنید."/>}</section>}
{tab==="grade-corrections"&&["teacher","manager","deputy"].includes(user.role)&&<GradeListPanel key={classTarget?.id||"all"} role={user.role} classContext={classTarget}/>}
{tab==="attendance-report"&&["manager","deputy","student","family"].includes(user.role)&&<AttendanceReportPanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role} initialDate={route.attendanceDate} onDateChange={attendanceDate=>navigate({attendanceDate},true)} onOpenAbsences={["manager","deputy"].includes(data.user.role)&&hasCapability(data.access,'absences',admin)?row=>{navigate({tab:'absences',classId:undefined,studentId:null,teacherId:undefined,absenceClassId:row.classroom_id,absenceDate:row.date});setMobile(false)}:undefined}/>}
{tab==="absences"&&admin&&<DailyAbsenceReviewPanel key={[route.absenceClassId||classTarget?.id,route.absenceDate].join('-')} initialClassId={route.absenceClassId||classTarget?.id} initialDate={route.absenceDate}/>}
{tab==="discipline"&&staff&&<DisciplinePanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role}/>}
{tab==="notifications"&&staff&&<NotificationsPanel onOpen={openNotification}/>}
{tab==="timetable"&&learningRole&&<TimetablePanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role}/>}
{tab==="announcements"&&<AnnouncementsPanel role={user.role} onChanged={refresh}/>}
{tab==="communications"&&learningRole&&<CommunicationsPanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role} userId={user.id} onRead={refresh}/>}
{tab==="sms"&&admin&&<SmsManagementPanel/>}
{tab==="grade-entry"&&hasCapability(data.access,"grade-entry",["teacher","deputy"].includes(user.role))&&<GradeEntryPanel key={classTarget?.id||"all"} classContext={classTarget}/>}
{tab==="monthly-reports"&&["manager","deputy","teacher"].includes(user.role)&&<MonthlyReportCardsPanel canPrint={hasCapability(data.access,"reports.print",admin)} key={[classTarget?.id||"all",route.reportPeriod,route.reportTeaching].join("-")} classContext={classTarget} initialPeriodId={route.reportPeriod} initialTeachingId={route.reportTeaching} role={user.role}/>}
{tab==="assignments"&&learningRole&&<AssignmentsPanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role} classes={data.classes}/>}
{tab==="exams"&&learningRole&&<ExamsPanel key={classTarget?.id||"all"} classContext={classTarget} role={user.role}/>}
{tab==="admissions"&&admin&&<AdmissionsInbox role={user.role}/>}
{tab==="content"&&data.can_edit_content&&<ContentEditor/>}
{tab==="password"&&user.role==="student"&&<PasswordSettings onChanged={refresh}/>}
{tab==="news"&&data.can_edit_news&&<NewsEditor/>}
{tab==="help"&&<PanelHelp sections={nav} roleLabel={user.role_label} onOpen={switchTab}/>}
</main></div></div>
}
function Empty({text}:{text:string}){return <div className="empty-state"><Inbox size={35}/><h3>{text}</h3></div>}
