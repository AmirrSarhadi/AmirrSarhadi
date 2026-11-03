"use client";
import {useEffect,useState} from "react";
import {RefreshCw} from "lucide-react";
import {api,send} from "@/lib/api";
import {confirmAction} from "@/lib/panel-feedback";
import {FormDialog} from "@/components/ui/form-dialog";
import "@/app/user-access.css";

type Policy={catalog:{key:string;label:string}[];pages:string[];version:number;role_version:number};
export function UserAccessEditor({user,close,saved}:{user:{id:number;name:string;roles:string[];role_labels:string[]};close:()=>void;saved:()=>void|Promise<void>}){
 const [scope,setScope]=useState("user"),[role,setRole]=useState(user.roles[0]),[data,setData]=useState<Policy|null>(null),[pages,setPages]=useState<string[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError("");setData(null);api<Policy>(`/users/${user.id}/access/?`+new URLSearchParams({scope,role})).then(value=>{if(live){setData(value);setPages(value.pages)}}).catch(reason=>{if(live)setError(reason.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[scope,role,retry,user.id]);
 const roleLabel=user.role_labels[user.roles.indexOf(role)]||role;
 async function submit(){
  if(!data||busy)return;
  const added=data.catalog.filter(item=>pages.includes(item.key)&&!data.pages.includes(item.key));
  const removed=data.catalog.filter(item=>!pages.includes(item.key)&&data.pages.includes(item.key));
  if(!added.length&&!removed.length){close();return}
  setBusy(true);setError("");
  try{
   const summary=[scope==="role"?`تغییر دسترسی برای همه کاربران فعلی و آینده نقش «${roleLabel}»`:`تغییر دسترسی «${user.name}» در نقش «${roleLabel}»`,...(added.length?["افزودن: "+added.map(item=>item.label).join("، ")]:[]),...(removed.length?["حذف: "+removed.map(item=>item.label).join("، ")]:[]),"تغییرات بالا تأیید شود؟"].join("\n\n");
   if(!await confirmAction(summary))return;
   await send(`/users/${user.id}/access/`,{scope,role,pages,expected_version:data.version,expected_role_version:data.role_version},{confirm:false});close();await saved();
  }catch(reason){setError((reason as Error).message)}finally{setBusy(false)}
 }
 return <FormDialog title={`دسترسی · ${user.name}`} busy={busy} close={close}><form onSubmit={event=>{event.preventDefault();void submit()}}><div className="form-grid"><label>اعمال تغییرات برای<select value={scope} disabled={busy} onChange={event=>setScope(event.target.value)}><option value="user">فقط این کاربر</option><option value="role">همه کاربران این نقش</option></select></label><label>نقش<select value={role} disabled={busy} onChange={event=>setRole(event.target.value)}>{user.roles.map((value,index)=><option key={value} value={value}>{user.role_labels[index]||value}</option>)}</select></label></div>
 {error&&<div className="error" role="alert">{error}<button type="button" className="text-link" disabled={busy||loading} onClick={async()=>{if(await confirmAction("انتخاب‌های ذخیره‌نشده کنار گذاشته و نسخه تازه دریافت شود؟"))setRetry(value=>value+1)}}><RefreshCw size={15}/>دریافت نسخه تازه</button></div>}
 {loading?<p role="status">در حال دریافت دسترسی‌ها…</p>:data&&<fieldset className="access-options" disabled={busy}><legend>دسترسی صفحات</legend>{data.catalog.map(item=><label key={item.key}><input type="checkbox" checked={pages.includes(item.key)} onChange={event=>setPages(current=>event.target.checked?[...current,item.key]:current.filter(key=>key!==item.key))}/><span>{item.label}</span></label>)}</fieldset>}
 <footer><button type="button" className="button outline" disabled={busy} onClick={close}>انصراف</button><button className="button" disabled={busy||loading||!data}>تأیید</button></footer></form></FormDialog>;
}
