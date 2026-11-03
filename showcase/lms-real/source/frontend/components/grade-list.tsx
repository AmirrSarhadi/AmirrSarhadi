"use client";
import {useState} from "react";
import {MonthlyReportCardsPanel} from "./monthly-report-cards";
import {GradeCorrectionsPanel} from "./grade-corrections";
import {ClassContext} from "@/lib/class-context";

export function GradeListPanel({role,classContext}:{role:string;classContext?:ClassContext}){
 const [requestsOpen,setRequestsOpen]=useState(false);
 return <><MonthlyReportCardsPanel gradeList role={role} classContext={classContext}/>{(role==="teacher"||role==="manager")&&<details onToggle={event=>setRequestsOpen(event.currentTarget.open)}><summary>درخواست‌های اصلاح نمره تکلیف و ارزیابی</summary>{requestsOpen&&<GradeCorrectionsPanel role={role}/>}</details>}</>;
}
