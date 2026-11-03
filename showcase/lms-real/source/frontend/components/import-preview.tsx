"use client";
import {AlertTriangle,CheckCircle2} from "lucide-react";
import {fa} from "@/lib/api";
import {confirmAction} from "@/lib/panel-feedback";
import {useState} from "react";
import "@/app/import-preview.css";

export type ImportPreviewData={
 fingerprint?:string;
 rows:{row:number;data:Record<string,string|number>;action:string;errors:string[];warnings:string[]}[];
 summary:{rows:number;create?:number;unchanged?:number;errors?:number;warnings?:number};
 can_apply:boolean;
};

export function ImportPreview({preview,busy,onApply,label="اعمال نهایی"}:{preview:ImportPreviewData;busy:boolean;onApply:()=>void;label?:string}){
 const [confirming,setConfirming]=useState(false);
 const valid=preview.rows.filter(row=>!row.errors.length).length,invalid=preview.rows.length-valid;
 async function apply(){if(confirming||busy)return;setConfirming(true);try{if(await confirmAction(`${fa(valid)} مورد از ${fa(preview.rows.length)} مورد صحیح است. فقط اطلاعات صحیح اعمال می‌شود و ${fa(invalid)} ردیف خطادار اصلاً ثبت نمی‌شود. تأیید می‌کنید؟`,"تأیید و اعمال"))onApply()}finally{setConfirming(false)}}
 return <section className="exchange-preview" aria-label="نتیجه پیش‌نمایش فایل" aria-busy={busy}>
  <div className="exchange-summary" role="status">{[["ردیف",preview.summary.rows],["قابل ایجاد",preview.summary.create||0],["بدون تغییر",preview.summary.unchanged||0],["خطا",preview.summary.errors||0],["هشدار",preview.summary.warnings||0]].map(([title,value])=><span key={String(title)}><small>{title}</small><b>{fa(Number(value))}</b></span>)}</div>
  <div className="table-wrap" role="region" aria-label="ردیف‌های فایل" tabIndex={0}><table aria-label="پیش‌نمایش ورود اطلاعات"><thead><tr>{["ردیف","اطلاعات","عملیات","نتیجه بررسی"].map(title=><th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{preview.rows.map(row=><tr key={row.row}><th scope="row">{fa(row.row)}</th><td>{Object.entries(row.data).map(([key,value])=><small className="exchange-field" key={key}><b>{key}:</b> {value===""?"—":value}</small>)}</td><td><span className="badge">{row.action}</span></td><td>{row.errors.map((message,index)=><p className="exchange-error" key={'error-'+index}><AlertTriangle size={13}/>{message}</p>)}{row.warnings.map((message,index)=><p className="exchange-warning" key={'warning-'+index}><AlertTriangle size={13}/>{message}</p>)}{!row.errors.length&&!row.warnings.length&&<p className="exchange-ok"><CheckCircle2 size={14}/>معتبر</p>}</td></tr>)}</tbody></table></div>
  <div className="exchange-confirm"><p>{preview.can_apply?`${fa(valid)} ردیف صحیح از ${fa(preview.rows.length)}؛ ${fa(invalid)} ردیف خطادار ثبت نخواهد شد.`:"هیچ ردیف معتبری برای ثبت وجود ندارد."}</p><button type="button" className="button" disabled={busy||confirming||!preview.can_apply} onClick={()=>void apply()}><CheckCircle2 size={16}/>{label}</button></div>
 </section>;
}
