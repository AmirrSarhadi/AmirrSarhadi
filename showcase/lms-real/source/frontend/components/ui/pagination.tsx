"use client";

import {ConfigProvider,Pagination as AntPagination} from "antd";
import faIR from "antd/locale/fa_IR";
import {ChevronLeft,ChevronRight} from "lucide-react";
import {fa} from "@/lib/api";

type Props={page:number;pages:number;count?:number;busy?:boolean;onChange:(page:number)=>void;label?:string;pageSize:number;onPageSizeChange:(size:number)=>void};

export function Pagination({page,pages,count,busy=false,onChange,label="صفحه‌بندی",pageSize,onPageSizeChange}:Props){
 return <nav className="list-pagination" aria-label={label} aria-busy={busy}>
  <span className="list-pagination-summary" aria-live="polite">صفحه {fa(page)} از {fa(Math.max(1,pages))}{count!==undefined&&<> · {fa(count)} مورد</>}</span>
  <label className="pagination-size">تعداد در صفحه<select aria-label="تعداد در صفحه" value={pageSize} disabled={busy} onChange={event=>onPageSizeChange(Number(event.target.value))}>{Array.from(new Set([10,20,50,100,pageSize])).sort((a,b)=>a-b).map(size=><option key={size} value={size}>{fa(size)}</option>)}</select></label>
  <ConfigProvider direction="rtl" locale={faIR} theme={{token:{colorPrimary:"#29245f",fontFamily:"Vazirmatn, Tahoma, sans-serif",borderRadius:6,controlHeight:36}}}>
   <AntPagination current={page} total={Math.max(1,pages)} pageSize={1} showSizeChanger={false} showQuickJumper={false} disabled={busy} responsive showLessItems showTitle={false} onChange={nextPage=>onChange(nextPage)} itemRender={(number,type,original)=>type==="page"?<button type="button" disabled={busy} aria-label={`صفحه ${fa(number)}`} aria-current={number===page?"page":undefined}>{fa(number)}</button>:type==="prev"?<PageArrow busy={busy}/>:type==="next"?<PageArrow busy={busy} next/>:original}/>
  </ConfigProvider>
 </nav>;
}

function PageArrow({busy,disabled,next=false}:{busy:boolean;disabled?:boolean;next?:boolean}){return <button type="button" aria-label={next?"بعدی":"قبلی"} disabled={busy||disabled}>{next?<ChevronLeft size={16}/>:<ChevronRight size={16}/>}</button>}
