import {confirmMutation,notifyPanel,panelChanged} from "@/lib/panel-feedback";
import {beginOperation} from "@/lib/operation-progress";
import {applyFormErrors,captureFormContext,clearFormErrors,fieldNames,validationIssues,type FormContext,type ValidationIssue} from "@/lib/form-errors";
export type ApiOptions=RequestInit&{confirm?:boolean;feedback?:boolean;form?:HTMLFormElement|null;loading?:boolean};
const pendingGets=new Map<string,Promise<unknown>>();
const responseCache=new Map<string,{expires:number;value:unknown}>();
const CACHE_TTL=30_000;
let cacheEpoch=0;

const sections:[RegExp,string][]=[
 [/data-exchange\/teaching-allocation/,"تخصیص درس به کلاس"],[/structure\/(classes\/\d+\/teachings|teachings)/,"ثبت درس و معلم"],
 [/monthly-reports\/.*grade-entry/,"ثبت نمره"],[/grade-corrections|course-corrections|course-grades|monthly-reports\/sheets\/\d+\/office-edit/,"لیست نمره"],
 [/teacher-files|teachers\/profiles/,"پرونده معلمان"],[/student-files|students\//,"پرونده دانش‌آموزان"],[/monthly-reports/,"کارنامه ماهیانه و نمرات"],
 [/auth\//,"ورود و حساب کاربری"],[/users\//,"کاربران و نقش‌ها"],[/timetable/,"برنامه هفتگی"],
 [/staff\//,"حضور معلمان"],[/attendance|absences/,"حضور و غیاب"],[/discipline/,"موارد انضباطی"],
 [/data-exchange/,"ثبت و ورود اطلاعات"],[/structure\/\?.*scope=archive/,"بایگانی"],[/structure/,"ساختار مدرسه"],[/classes/,"کلاس‌های من"],
 [/assignments|assignment-files|submissions/,"تکالیف"],[/exams|exam-attempts/,"آزمون‌ها"],[/evaluation|reports/,"گزارش‌های آموزشی"],
 [/notifications\/sms|sms\//,"پیامک"],[/notifications/,"اعلان‌ها"],[/communications|messages/,"پیام‌ها"],
 [/admissions/,"ثبت‌نام و پذیرش"],[/news/,"اخبار سایت"],[/public/,"محتوای سایت"],[/announcements/,"اطلاعیه‌ها"],[/dashboard/,"خانه"],
];
const sectionName=(path:string)=>sections.find(([pattern])=>pattern.test(path))?.[1]||"سامانه";
export class ApiRequestError extends Error {
 constructor(message:string,public status?:number,public fieldErrors:ValidationIssue[]=[]){super(message);this.name="ApiRequestError"}
}

function cacheable(path:string){return !path.includes("manage=1")&&(path==="/public/"||path.startsWith("/public/items/")||path.startsWith("/news/"))}

function errorText(value:unknown,fallback:string):string{
 if(Array.isArray(value))return value.map(item=>errorText(item,fallback)).join("، ");
 if(value&&typeof value==='object')return Object.entries(value).filter(([key])=>!['code','type'].includes(key)).map(([key,item])=>(fieldNames[key]?fieldNames[key]+": ":'')+errorText(item,fallback)).join(" / ");
 const message=String(value||'');return /[\u0600-\u06ff]/.test(message)?message:fallback;
}

async function request<T>(path:string,options:RequestInit,context?:FormContext,loading=true):Promise<T>{
  const section=sectionName(path),prefix=`بخش ${section}: `;
  const finish=loading&&!/^\/auth\/(activity|access-status|otp-status)\//.test(path)?beginOperation():()=>{};
  try{
  const token=document.cookie.split("; ").find(x=>x.startsWith("csrftoken="))?.split("=")[1];
  const res=await fetch("/api/v1"+path,{credentials:"same-origin",cache:"no-store",...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(token?{"X-CSRFToken":decodeURIComponent(token)}:{}),...options.headers}});
  if(res.status===204)return undefined as T;
  if(res.status>=500)throw new ApiRequestError(prefix+"سرور با مشکل مواجه شده است. لطفاً دوباره تلاش کنید.");
  const fallback=res.status===401?"نشست شما معتبر نیست؛ دوباره وارد شوید.":res.status===403?"دسترسی مجاز نیست یا نشست شما نیاز به ورود مجدد دارد.":res.status===404?"اطلاعات درخواستی پیدا نشد؛ فهرست را تازه‌سازی کنید.":res.status===409?"اطلاعات تغییر کرده است؛ صفحه را تازه‌سازی و دوباره تلاش کنید.":res.status===413?"حجم فایل بیش از حد مجاز است.":res.status===429?"تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.":"اطلاعات واردشده معتبر نیست. مقدار فیلد را بررسی کنید.";
  const data=await res.json().catch(()=>{throw new ApiRequestError(prefix+(!res.ok?fallback:"پاسخ سرور قابل خواندن نیست. لطفاً دوباره تلاش کنید."))});
  if(res.status===401&&data?.code==="session_idle_expired")window.location.replace("/portal/login");
  if(!res.ok){
   const issues=res.status===400||res.status===422?validationIssues(data):[];
   const remaining=issues.length?applyFormErrors(context,issues):[];
   const message=issues.length?remaining.map(issue=>(fieldNames[issue.path]?fieldNames[issue.path]+": ":"")+issue.message).join(" / "):errorText(data,fallback)||fallback;
   throw new ApiRequestError(message?prefix+message:"",res.status,issues.filter(issue=>!!issue.path));
  }
  return data;
  }catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw error;const failure=error instanceof ApiRequestError?error:new ApiRequestError(prefix+(error instanceof TypeError?"ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.":"درخواست انجام نشد. لطفاً دوباره تلاش کنید."));if(failure.message&&(options.method||"GET").toUpperCase()!=="GET")notifyPanel({kind:"error",message:failure.message});throw failure}finally{finish()}
}

export async function api<T=any>(path:string, options:ApiOptions={}):Promise<T>{
  const {confirm,feedback,form,loading=true,...requestOptions}=options;
  const method=(options.method||"GET").toUpperCase();
  if(method!=="GET"){
    const context=captureFormContext(form);
    if(confirm!==false)await confirmMutation(path,method,options.body);
    if(context)clearFormErrors(context.form);
    cacheEpoch++;
    responseCache.clear();
    pendingGets.clear();
    const result=await request<T>(path,requestOptions,context,loading);
    cacheEpoch++;responseCache.clear();pendingGets.clear();
    if(feedback!==false){notifyPanel({kind:"success",message:"عملیات با موفقیت انجام شد."});if(!path.startsWith("/auth/"))panelChanged()}
    return result;
  }
  if(options.signal)return request<T>(path,requestOptions,undefined,loading);
  const cached=responseCache.get(path);
  if(cached&&cached.expires>Date.now())return cached.value as T;
  const pending=pendingGets.get(path);
  if(pending)return pending as Promise<T>;
  const epoch=cacheEpoch;
  const operation=request<T>(path,requestOptions,undefined,loading).then(value=>{
    if(epoch===cacheEpoch&&cacheable(path)){
      if(responseCache.size>=50)responseCache.delete(responseCache.keys().next().value!);
      responseCache.set(path,{expires:Date.now()+CACHE_TTL,value});
    }
    return value;
  }).finally(()=>{if(pendingGets.get(path)===operation)pendingGets.delete(path)});
  pendingGets.set(path,operation);
  return operation;
}
export const send=<T=any>(path:string,data:unknown,options:Pick<ApiOptions,"confirm"|"feedback"|"form">={}):Promise<T>=>api<T>(path,{...options,method:"POST",body:JSON.stringify(data)});
export const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n);
export const dateFa=(s:string)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeZone:"Asia/Tehran"}).format(new Date(s));
