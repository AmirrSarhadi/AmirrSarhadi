export type DialogRequest = {title:string; description:string; danger?:boolean; input?:{label:string; value?:string; secret?:boolean}; confirmLabel?:string};
export type Notice = {kind:"success"|"error"|"warning"|"info"; message:string};
type Bridge = {dialog:(request:DialogRequest)=>Promise<string|boolean|null>; notify:(notice:Notice)=>void; changed:()=>void};
let bridge:Bridge|undefined;
export function registerPanelFeedback(value:Bridge){bridge=value;return()=>{if(bridge===value)bridge=undefined}}
export function notifyPanel(notice:Notice){bridge?.notify(notice)}
export function panelChanged(){bridge?.changed()}
export class ActionCancelled extends Error {constructor(){super("");this.name="ActionCancelled"}}
export const isActionCancelled=(error:unknown)=>error instanceof ActionCancelled;
export async function confirmAction(description:string,confirmLabel?:string,danger=false){return bridge?await bridge.dialog({title:"تأیید عملیات",description,confirmLabel,danger})===true:false}
export async function promptAction(label:string,value="",secret=false){
  if(!bridge)return null;
  const result=await bridge.dialog({title:secret?"بازنشانی رمز عبور":"تکمیل اطلاعات",description:"اطلاعات زیر را وارد کنید.",input:{label,value,secret},confirmLabel:"ادامه"});
  return typeof result==="string"?result:null;
}
const domains:[RegExp,string][]=[[/monthly-reports/,"کارنامه ماهیانه"],[/users/,"حساب کاربری"],[/structure/,"ساختار مدرسه"],[/attendance/,"حضور و غیاب"],[/notifications\/sms|\/sms\//,"پیامک"],[/communications|messages/,"پیام‌ها"],[/exams|exam-attempts/,"آزمون"],[/assignments/,"تکلیف"],[/public|news/,"محتوای سایت"],[/discipline/,"مورد انضباطی"],[/admissions/,"پذیرش"],[/data-exchange/,"داده‌های مدرسه"]];
export async function confirmMutation(path:string,method:string,body?:BodyInit|null){
  if(!bridge)return;
  let data:Record<string,unknown>={};
  if(typeof body==="string"){try{data=JSON.parse(body)||{}}catch{/* Non-JSON requests still require confirmation. */}}
  else if(body instanceof FormData)data=Object.fromEntries(body);
  const danger=method==="DELETE"||data.action==="delete"||data.active===false||data.active==="false"||/\/(archive|deactivate)\//.test(path);
  const domain=path.startsWith("/timetable/")?"برنامه هفتگی":domains.find(([pattern])=>pattern.test(path))?.[1]||"اطلاعات";
  const description=danger?`حذف یا غیرفعال‌سازی در بخش ${domain} انجام شود؟ این عملیات ممکن است دسترسی به رکورد را تغییر دهد.`
    :/\/sms\/(send|absence|send-pending|\d+\/retry)\//.test(path)||data.action==="sms"||data.action==="finalize_day"?"این عملیات پیامک را در صف ارسال قرار می‌دهد یا ارسال می‌کند و ممکن است هزینه داشته باشد. ادامه می‌دهید؟"
    :/\/submit\//.test(path)||data.finalize===true?`ثبت نهایی ${domain} انجام شود؟ پس از نهایی‌سازی ممکن است ویرایش مستقیم محدود شود.`
    :`تغییرات بخش ${domain} اعمال شود؟ اطلاعات این بخش پس از موفقیت به‌روز می‌شود.`;
  if(await bridge.dialog({title:danger?"تأیید حذف یا غیرفعال‌سازی":"تأیید اعمال تغییرات",description,danger,confirmLabel:danger?"تأیید عملیات":"تأیید و اعمال"})!==true)throw new ActionCancelled();
}
