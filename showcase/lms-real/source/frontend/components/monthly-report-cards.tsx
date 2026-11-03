"use client";
import {ClassContext,classYearMatches} from "@/lib/class-context";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  CheckCheck,
  Check,
  FileDown,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import "@/app/monthly-report-layout.css";
import "@/app/monthly-report-controls.css";
import { api, fa, send } from "@/lib/api";
import {Pagination} from "@/components/ui/pagination";

type Role = "manager" | "deputy" | "teacher";
type Period = {
  id: number;
  year: number;
  year_title: string;
  month: string;
  month_label: string;
  issued: boolean;
  issued_at: string | null;
  issued_by: string | null;
  version: number;
};
type Options = {
  months: { value: string; label: string }[];
  years: { id: number; title: string }[];
  teachings: { id: number; year: number; label: string; classroom_id?:number }[];
};
type ReadinessRow = {
  sheet_id: number | null;
  teaching_id: number;
  classroom: string;
  classroom_id?: number;
  subject: string;
  teacher: string;
  status:
    | "missing"
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "outdated";
  column_count: number;
  version: number;
  review_note: string;
  roster_current: boolean;
  student_count: number;
  record_count: number;
  ready: boolean;
};
type Readiness = {
  total: number;
  approved: number;
  remaining: number;
  all_ready: boolean;
  records: ReadinessRow[];
};
type Sheet = ReadinessRow & {
  issued: boolean;
  students: { id: number; name: string; student_code?:string; scores: Record<string, string | number> }[];
};
type Cards = {
  period: Period;
  cards: {
    student_id: number;
    student: string;
    classroom_id: number;
    classroom: string;
    weighted_average:string|null;
    class_rank:number|null;
    grade_major_rank:number|null;
    subjects: { teaching_id?:number; subject: string; unit_count:number; average:string|null; rank:number|null; scores: (string | null)[] }[];
  }[];
};
type ScoreChange={student:string;field:string;before:string;after:string};
const scoreRecord=(scores:Record<string,string|number>)=>Object.fromEntries(Object.entries(scores).map(([key,value])=>[key,String(value)]));
const scoreLabel=(value:string)=>value===""?"خالی":value==="absent"?"غایب":fa(Number(value));
const normalizeStudentName=(value:string)=>value.replace(/[۰-۹٠-٩]/g,d=>String(d.charCodeAt(0)-(d>="۰"?1776:1632))).replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u064B-\u065F\u0670]/g,"").replace(/\s+/g," ").trim().toLocaleLowerCase("fa");

function StudentSearchPicker({cards,value,query,onQuery,onChange}:{cards:Cards["cards"];value:string;query:string;onQuery:(value:string)=>void;onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null);
  const selected=cards.find(card=>String(card.student_id)===value);
  const matches=cards.filter(card=>normalizeStudentName(card.student).includes(normalizeStudentName(query)));
  useEffect(()=>{if(!open)return;search.current?.focus();const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);root.current?.querySelector<HTMLButtonElement>(".monthly-student-trigger")?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[open]);
  return <div className="monthly-student-picker" ref={root}><span className="monthly-picker-label" id="monthly-student-picker-label">دانش‌آموز</span><button type="button" className="monthly-student-trigger" aria-labelledby="monthly-student-picker-label" aria-label="انتخاب دانش‌آموز" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(current=>!current)}><span>{selected?`${selected.student} · ${selected.classroom}`:"انتخاب کنید"}</span><ChevronDown size={17}/></button>{open&&<div className="monthly-student-menu"><label><span className="sr-only">جستجو در فهرست دانش‌آموزان</span><Search size={16}/><input ref={search} type="search" aria-label="جستجو در فهرست دانش‌آموزان" placeholder="بخشی از نام را بنویسید…" value={query} onChange={event=>onQuery(event.target.value)}/></label><div className="monthly-student-options" role="listbox" aria-labelledby="monthly-student-picker-label">{matches.map(card=><button type="button" role="option" aria-selected={String(card.student_id)===value} key={card.student_id} onClick={()=>{onChange(String(card.student_id));onQuery("");setOpen(false)}}><strong>{card.student}</strong><small>{card.classroom}</small></button>)}{!matches.length&&<p role="status">دانش‌آموزی با این نام پیدا نشد.</p>}</div></div>}</div>
}

const statusLabel = {
  missing: "شروع‌نشده",
  draft: "پیش‌نویس",
  submitted: "منتظر تأیید",
  approved: "تأییدشده",
  rejected: "برگشت‌خورده",
  outdated: "فهرست کلاس تغییر کرده",
};

export function MonthlyReportCardsPanel({ role,classContext,initialPeriodId,initialTeachingId,gradeList=false,canPrint=role==="manager"||role==="deputy" }: { role: string;classContext?:ClassContext;initialPeriodId?:number;initialTeachingId?:number;gradeList?:boolean;canPrint?:boolean }) {
 const [pageSize,setPageSize]=useState(20);

  const office = role === "manager" || role === "deputy",
    teacher = role === "teacher",
    student = false;
  const [options, setOptions] = useState<Options>({
      months: [],
      years: [],
      teachings: [],
    }),
    [periods, setPeriods] = useState<Period[]>([]),
    [selected, setSelected] = useState(""),
    [teaching, setTeaching] = useState(""),
    [readiness, setReadiness] = useState<Readiness | null>(null),
    [sheet, setSheet] = useState<Sheet | null>(null),
    [cards, setCards] = useState<Cards | null>(null),
    [scores, setScores] = useState<Record<number, Record<string, string>>>({}),
    [columns, setColumns] = useState(2),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [printMode, setPrintMode] = useState<"student" | "teaching" | "classroom">(classContext?"classroom":"student"),
    [printFilter, setPrintFilter] = useState(classContext?String(classContext.id):""),
    [cardSort,setCardSort]=useState<"rank"|"name">("rank"),
    [teacherEditing,setTeacherEditing]=useState(false),
    [officeEditing,setOfficeEditing]=useState(false),
    [editSnapshot,setEditSnapshot]=useState<{columns:number;scores:Record<number,Record<string,string>>}|null>(null),
    [pendingChanges,setPendingChanges]=useState<ScoreChange[]|null>(null),
    [revision, setRevision] = useState(0);
  const period = useMemo(
    () => periods.find((item) => String(item.id) === selected),
    [periods, selected],
  );
  const [cardSearch,setCardSearch]=useState("");
  const [classFilter,setClassFilter]=useState(classContext?String(classContext.id):""),[studentQuery,setStudentQuery]=useState(""),[studentPage,setStudentPage]=useState(1),[editingStudent,setEditingStudent]=useState<number|null>(null);
  const matchingStudents=(sheet?.students||[]).filter(row=>normalizeStudentName(row.name+" "+(row.student_code||"")).includes(normalizeStudentName(studentQuery)));
  const studentPages=Math.max(1,Math.ceil(matchingStudents.length/pageSize));
  useEffect(()=>{setStudentPage(1)},[studentQuery,teaching,selected]);
  useEffect(()=>{setStudentPage(value=>Math.min(value,studentPages))},[studentPages]);
  const displayedCards=useMemo(()=>(cards?.cards||[]).filter(card=>!printFilter||printMode==="teaching"||(printMode==="student"?String(card.student_id):String(card.classroom_id))===printFilter).map(card=>printMode==="teaching"&&printFilter?{...card,subjects:card.subjects.filter(subject=>subject.teaching_id===Number(printFilter)||(!subject.teaching_id&&readiness?.records.some(row=>String(row.teaching_id)===printFilter&&row.subject===subject.subject&&row.classroom===card.classroom)))}:card).filter(card=>card.subjects.length).sort((a,b)=>cardSort==="rank"?(a.classroom.localeCompare(b.classroom,"fa")||(a.class_rank??9999)-(b.class_rank??9999)):a.student.localeCompare(b.student,"fa")),[cards,cardSort,printFilter,printMode,readiness]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      api<Options>("/monthly-reports/options/"),
      api<Period[]>("/monthly-reports/periods/"),
    ])
      .then(([o, p]) => {
        if (!live) return;
        setOptions({...o,teachings:classContext?o.teachings.filter(row=>row.classroom_id===classContext.id):o.teachings});
        const eligible=p.filter(row=>classYearMatches(row,classContext));
        setPeriods(eligible);
        setSelected((current) => current || String((initialPeriodId?eligible.find(row=>row.id===initialPeriodId)?.id:eligible[0]?.id) || ""));
        if(initialPeriodId&&!eligible.some(row=>row.id===initialPeriodId))setError("دوره مرتبط با اعلان در دسترس نیست.");
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  useEffect(() => {
    setTeaching(initialTeachingId?String(initialTeachingId):"");
    setPrintFilter(classContext?String(classContext.id):"");setCardSearch("");
    setSheet(null);
    setClassFilter(classContext?String(classContext.id):"");
    setReadiness(null);
    setCards(null);
    setTeacherEditing(false);
    setOfficeEditing(false);setEditSnapshot(null);setPendingChanges(null);
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    let live = true;
    setLoading(true);
    const requests: Promise<unknown>[] = [];
    if (office || teacher)
      requests.push(
        api<Readiness>(
          "/monthly-reports/periods/" + selected + "/readiness/",
        ).then((x) => {
          if (live) setReadiness(x);
        }),
      );
    if (!gradeList && (office || teacher))
      requests.push(
        api<Cards>("/monthly-reports/periods/" + selected + "/cards/"+(classContext?"?classroom="+classContext.id:"")).then(
          (x) => {
            if (live) setCards(classContext?{...x,cards:x.cards.filter(row=>row.classroom_id===classContext.id)}:x);
          },
        ),
      );
    Promise.all(requests)
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selected, revision, office, teacher]);
  useEffect(() => {
    if (
      !selected ||
      !teaching ||
      (teacher &&
        !options.teachings.some((item) => String(item.id) === teaching))
    )
      return;
    let live = true;
    setLoading(true);
    api<Sheet>(
      "/monthly-reports/periods/" + selected + "/teachings/" + teaching + "/",
    )
      .then((x) => {
        if (!live) return;
        setSheet(x);
        setTeacherEditing(false);
        setColumns(x.column_count);
        setScores(
          Object.fromEntries(x.students.map((row) => [row.id, scoreRecord(row.scores)])),
        );
        setOfficeEditing(false);setEditSnapshot(null);setPendingChanges(null);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selected, teaching, revision, teacher, options.teachings]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(submit: boolean) {
    if (!sheet) return;
    await act(async () => {
      const result = await send<Sheet>(
        "/monthly-reports/periods/" + selected + "/teachings/" + teaching + "/",
        {
          expected_version: sheet.version,
          column_count: columns,
          submit,
          records: sheet.students.map((row) => ({
            student: row.id,
            scores: scores[row.id] || {},
          })),
        },
      );
      setSheet(result);
      setTeacherEditing(false);
      setScores(
        Object.fromEntries(result.students.map((row) => [row.id, scoreRecord(row.scores)])),
      );
      setSuccess(
        submit
          ? "نمره‌ها برای تأیید مدیر یا معاون آموزشی ارسال شد."
          : "پیش‌نویس ذخیره شد.",
      );
      setRevision((x) => x + 1);
    });
  }
  function beginOfficeEdit(){
    if(!sheet)return;
    setEditSnapshot({columns:sheet.column_count,scores:Object.fromEntries(sheet.students.map(row=>[row.id,{...(scores[row.id]||scoreRecord(row.scores))}]))});
    setOfficeEditing(true);setPendingChanges(null);setError("");setSuccess("");
  }
  function cancelOfficeEdit(){
    if(editSnapshot){setColumns(editSnapshot.columns);setScores(Object.fromEntries(Object.entries(editSnapshot.scores).map(([id,row])=>[Number(id),{...row}])))}
    setOfficeEditing(false);setEditSnapshot(null);setPendingChanges(null);setError("");
  }
  function previewOfficeEdit(){
    if(!sheet||!editSnapshot)return;
    for(const row of sheet.students)for(let index=0;index<columns;index++){
      const value=String(scores[row.id]?.[String(index)]??"").trim();
      if(value!==""&&value!=="absent"&&(!/^\d+(?:\.\d{1,2})?$/.test(value)||Number(value)<0||Number(value)>20)){setError(`نمره ${row.name} در ستون ${fa(index+1)} باید بین صفر تا ۲۰ و حداکثر دو رقم اعشار باشد.`);return}
    }
    const changes:ScoreChange[]=[];
    if(columns!==editSnapshot.columns)changes.push({student:"ساختار دفتر نمره",field:"تعداد جای نمره",before:fa(editSnapshot.columns),after:fa(columns)});
    for(const row of sheet.students)for(let index=0;index<Math.max(columns,editSnapshot.columns);index++){
      const before=String(editSnapshot.scores[row.id]?.[String(index)]??""),after=String(scores[row.id]?.[String(index)]??"");
      if(before!==after)changes.push({student:row.name,field:`نمره ${fa(index+1)}`,before:scoreLabel(before),after:scoreLabel(after)});
    }
    if(!changes.length){setError("تغییری برای ثبت انجام نشده است.");return}
    setError("");setPendingChanges(changes);
  }
  async function confirmOfficeEdit(){
    if(!sheet?.sheet_id)return;
    await act(async()=>{
      const result=await send<Sheet>(`/monthly-reports/sheets/${sheet.sheet_id}/office-edit/`,{expected_version:sheet.version,column_count:columns,records:sheet.students.map(row=>({student:row.id,scores:scores[row.id]||{}}))},{confirm:false});
      setSheet(result);setScores(Object.fromEntries(result.students.map(row=>[row.id,scoreRecord(row.scores)])));setColumns(result.column_count);
      setOfficeEditing(false);setEditSnapshot(null);setPendingChanges(null);setSuccess("ویرایش نمره‌ها با موفقیت ثبت و در سابقه تغییرات ذخیره شد.");setRevision(value=>value+1);
    });
  }
  async function review(
    row: ReadinessRow,
    decision: "approved" | "rejected",
    form: HTMLFormElement,
  ) {
    const note = String(new FormData(form).get("note") || "");
    await act(async () => {
      await send("/monthly-reports/sheets/" + row.sheet_id + "/review/", {
        decision,
        note,
        expected_version: row.version,
      });
      setSuccess(
        decision === "approved"
          ? "دفتر نمره تأیید شد."
          : "دفتر با ذکر دلیل به معلم برگشت داده شد.",
      );
      setRevision((x) => x + 1);
    });
  }
  const teacherCanEdit=Boolean(gradeList&&teacher&&sheet&&sheet.sheet_id&&sheet.status!=="submitted");
  const scoreInputsEditable=(teacher&&teacherEditing)||(office&&officeEditing);
  if (!office && !teacher) return null;
  const sheetEditor = (teacher || office) && sheet && (
        <section className="monthly-sheet-editor">
          <div className="section-title">
            <div>
              <h2>
                {sheet.subject} · {sheet.classroom}
              </h2>
              <p className="muted">
                {gradeList?"هر نمره از ۲۰ و حداکثر با دو رقم اعشار است. غیبت با عنوان غایب نمایش داده می‌شود.":"نمرات ثبت‌شده این درس؛ ویرایش در بخش لیست نمره انجام می‌شود."}
              </p>
            </div>
            <span
              className={
                "badge " +
                (sheet.status === "approved"
                  ? "green"
                  : sheet.status === "rejected"
                    ? "orange"
                    : "")
              }
            >
              {statusLabel[sheet.status]}
            </span>
          </div>
          {sheet.review_note && (
            <div className="notice">
              <strong>نظر بررسی:</strong> {sheet.review_note}
            </div>
          )}
          {gradeList&&<div className="monthly-column-actions">
            <span>تعداد جای نمره: {fa(columns)}</span>
            <div className="monthly-column-buttons">{teacher&&teacherEditing&&<button type="button" className="button outline small" disabled={busy} onClick={()=>{setTeacherEditing(false);setScores(Object.fromEntries(sheet.students.map(row=>[row.id,scoreRecord(row.scores)])))}}><X size={16}/>انصراف</button>}{office&&officeEditing&&<><button type="button" className="icon-button monthly-edit-confirm" disabled={busy} onClick={previewOfficeEdit} aria-label="بررسی و تأیید تغییرات" title="بررسی تغییرات"><Check size={19}/></button><button type="button" className="icon-button monthly-edit-cancel" disabled={busy} onClick={cancelOfficeEdit} aria-label="انصراف از ویرایش" title="انصراف"><X size={19}/></button></>}</div>
          </div>}
          <div className="table-wrap">
            <table className="monthly-score-table">
              <caption>دفتر نمره دوره {period?.month_label || ""}</caption>
              <thead>
                <tr>
                  <th>دانش‌آموز</th>
                  {gradeList&&<th>کد دانش‌آموزی</th>}
                  {Array.from({ length: columns }, (_, index) => (
                    <th key={index}>نمره {fa(index + 1)}</th>
                  ))}
                  {gradeList&&<th>عملیات</th>}
                </tr>
              </thead>
              <tbody>
                {(gradeList?matchingStudents.slice((studentPage-1)*pageSize,studentPage*pageSize):sheet.students).map((studentRow) => (
                  <tr key={studentRow.id}>
                    <th>{studentRow.name}</th>
                    {gradeList&&<td>{studentRow.student_code||"—"}</td>}
                    {Array.from({ length: columns }, (_, index) => (
                      <td key={index}>
                        {gradeList&&scoreInputsEditable&&editingStudent===studentRow.id?<input
                          aria-label={
                            studentRow.name + "، نمره " + fa(index + 1)
                          }
                          type="number"
                          min="0"
                          max="20"
                          step=".01"
                          inputMode="decimal"
                          value={(scores[studentRow.id]?.[String(index)] ?? "")==="absent"?"":scores[studentRow.id]?.[String(index)] ?? ""}
                          placeholder={(scores[studentRow.id]?.[String(index)] ?? "")==="absent"?"غایب":""}
                          disabled={!gradeList || !scoreInputsEditable || editingStudent!==studentRow.id || busy}
                          onChange={(e) =>
                            setScores((current) => ({
                              ...current,
                              [studentRow.id]: {
                                ...current[studentRow.id],
                                [String(index)]: e.target.value,
                              },
                            }))
                          }
                        />:<span>{scoreLabel(String(scores[studentRow.id]?.[String(index)]??"")).replace("خالی","—")}</span>}
                      </td>
                    ))}
                    {gradeList&&<td><button type="button" className="icon-button" aria-label={`ویرایش نمرات ${studentRow.name}`} title="ویرایش نمرات" disabled={busy||loading||officeEditing||teacherEditing||(!office&&!teacherCanEdit)||!sheet.sheet_id} onClick={()=>{setEditingStudent(studentRow.id);if(office)beginOfficeEdit();else setTeacherEditing(true)}}><Pencil size={17}/></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gradeList&&<><Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setStudentPage(1);}} page={studentPage} pages={studentPages} count={matchingStudents.length} busy={busy||officeEditing||teacherEditing} onChange={setStudentPage} label="صفحه‌بندی لیست نمره"/>{!matchingStudents.length&&<p className="empty-state" role="status">دانش‌آموزی مطابق جستجو پیدا نشد.</p>}</>}
          {!sheet.students.length && (
            <div className="notice">
              دانش‌آموز فعالی برای این کلاس وجود ندارد.
            </div>
          )}
          {teacherEditing && (
            <div className="monthly-actions">
              <button
                className="button small"
                disabled={busy || !sheet.students.length}
                onClick={() => save(true)}
              >
                <Send size={16} />
                ثبت و ارسال مجدد برای تأیید
              </button>
            </div>
          )}
          {pendingChanges&&<div className="monthly-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="monthly-edit-review-title"><section className="monthly-edit-review"><div className="section-title"><div><h2 id="monthly-edit-review-title">بررسی تغییرات نمره‌ها</h2><p className="muted">پیش از ثبت نهایی، ریز تغییرات را کنترل کنید.</p></div><button type="button" className="icon-button" onClick={()=>setPendingChanges(null)} aria-label="بستن بررسی تغییرات"><X size={19}/></button></div><div className="table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>فیلد</th><th>مقدار قبلی</th><th>مقدار جدید</th></tr></thead><tbody>{pendingChanges.map((change,index)=><tr key={`${change.student}-${change.field}-${index}`}><th>{change.student}</th><td>{change.field}</td><td>{change.before}</td><td><strong>{change.after}</strong></td></tr>)}</tbody></table></div><div className="monthly-edit-review-actions"><button type="button" className="button outline" onClick={()=>setPendingChanges(null)} disabled={busy}>بازگشت و اصلاح</button><button type="button" className="button" onClick={confirmOfficeEdit} disabled={busy}><Check size={18}/>{busy?"در حال ثبت…":"تأیید نهایی و ثبت تغییرات"}</button></div></section></div>}
        </section>
      );
  return (
    <div className="monthly-report-module">
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="success" role="status">
          {success}
        </div>
      )}
      <section className="card monthly-report-hero">
        <div className="monthly-report-mark">
          <ShieldCheck />
        </div>
        <div>
          <h2>{gradeList?"لیست نمره":"کارنامه ماهیانه"}</h2>
          <p>
            {gradeList?"مشاهده و ویرایش نمرات دانش‌آموزان":"مشاهده، تأیید و صدور کارنامه‌های دوره تحصیلی"}
          </p>
        </div>
      </section>
      {!gradeList && office && (
        <section className="card">
          <details>
            <summary>ایجاد دوره ارزیابی جدید</summary>
            <form
              className="monthly-period-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const form=event.currentTarget;
                const data = Object.fromEntries(
                  new FormData(form),
                );
                act(async () => {
                  const created=await send<Period>("/monthly-reports/periods/", {
                    year: Number(data.year),
                    month: data.month,
                  });
                  setSuccess("دوره ارزیابی ایجاد شد.");
                  setPeriods(current=>[created,...current]);setSelected(String(created.id));
                  setRevision((x) => x + 1);
                  form.reset();form.closest("details")?.removeAttribute("open");
                });
              }}
            >
              <label>
                سال تحصیلی
                <select name="year" required>
                  {options.years.filter(year=>classYearMatches({year:year.id,year_title:year.title},classContext)).map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                عنوان دوره
                <select name="month" required>
                  {options.months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button small"
                disabled={busy || !options.years.length}
              >
                ایجاد دوره
              </button>
            </form>
          </details>
        </section>
      )}
      <section className="card">
        <div className="monthly-toolbar">
          <label>
            دوره ارزیابی
            <select
              aria-label="دوره ارزیابی"
              value={selected}
              disabled={busy||officeEditing||teacherEditing}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">انتخاب دوره</option>
              {periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.month_label} · {item.year_title}
                </option>
              ))}
            </select>
          </label>
          {gradeList&&<><label>کلاس<select aria-label="کلاس نمرات" value={classFilter} disabled={busy||officeEditing||teacherEditing} onChange={event=>{setClassFilter(event.target.value);setTeaching("");setSheet(null)}}><option value="">انتخاب کلاس</option>{Array.from(new Map((readiness?.records||[]).map(row=>[row.classroom_id,row.classroom])).entries()).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label><label>درس<select aria-label="درس نمرات" value={teaching} disabled={!classFilter||busy||officeEditing||teacherEditing} onChange={event=>{setTeaching(event.target.value);setSheet(null)}}><option value="">انتخاب درس</option>{readiness?.records.filter(row=>String(row.classroom_id)===classFilter).map(row=><option key={row.teaching_id} value={row.teaching_id}>{row.subject} · {row.teacher}</option>)}</select></label><label>نام یا کد دانش‌آموز<input type="search" value={studentQuery} maxLength={120} disabled={officeEditing||teacherEditing} onChange={event=>setStudentQuery(event.target.value)}/></label>{studentQuery&&<button className="icon-button" aria-label="پاک کردن جستجوی نمرات" title="پاک کردن جستجو" disabled={officeEditing||teacherEditing} onClick={()=>setStudentQuery("")}><X size={17}/></button>}</>}
          <button
            className="button outline small"
            disabled={busy || loading || officeEditing || teacherEditing}
            onClick={() => setRevision((x) => x + 1)}
          >
            <RefreshCw size={16} />
            تازه‌سازی
          </button>
        </div>
        {period && (
          <div className="monthly-period-state">
            <span className={"badge " + (period.issued ? "green" : "orange")}>
              {period.issued ? "صادر شده" : "در حال تکمیل"}
            </span>
            {period.issued && <span>تأیید نهایی: {period.issued_by}</span>}
          </div>
        )}
      </section>
      {gradeList&&period&&<section className="card">{loading?<p role="status">در حال دریافت نمرات…</p>:sheet?sheetEditor:<p className="empty-state">کلاس و درس را انتخاب کنید.</p>}</section>}
      {!gradeList && (office || teacher) && period && readiness && (
        <section className="card">
          <div className="section-title">
            <div>
              <h2>{office ? "بررسی و صدور" : "وضعیت دفترهای من"}</h2>
              <p className="muted">
                {fa(readiness.approved)} از {fa(readiness.total)} درس تأیید شده
                است.
              </p>
            </div>
            {office && !period.issued && (
              <span className="badge orange">
                {fa(readiness.remaining)} دفتر باقی‌مانده
              </span>
            )}
          </div>
          <div className="monthly-readiness">
            {readiness.records.filter(row=>!classContext||(row.classroom_id!==undefined?row.classroom_id===classContext.id:row.classroom===classContext.title)).map((row) => (
              <article key={row.teaching_id} className={teaching===String(row.teaching_id)?"monthly-lesson is-expanded":"monthly-lesson"}>
                <div>
                  <strong>{row.subject}</strong>
                  <small>
                    {row.classroom}
                    {office ? " · " + row.teacher : ""}
                  </small>
                  {row.review_note && (
                    <small className="monthly-review-note">
                      {row.review_note}
                    </small>
                  )}
                </div>
                <span
                  className={
                    "badge " +
                    (row.status === "approved"
                      ? "green"
                      : row.status === "submitted" ||
                          row.status === "rejected" ||
                          row.status === "outdated"
                        ? "orange"
                        : "")
                  }
                >
                  {statusLabel[row.status]}
                </span>
                {office &&
                  (row.status === "submitted" || row.status === "outdated") && (
                  <form noValidate onSubmit={(event) => event.preventDefault()}>
                    <label>
                      یادداشت بررسی
                      <input
                        name="note"
                        maxLength={1000}
                        placeholder="برای رد کردن، دلیل الزامی است"
                      />
                    </label>
                    <div>
                      {row.status === "submitted" && (
                        <button
                          type="button"
                          className="button small"
                          disabled={busy}
                          onClick={(event) =>
                            review(row, "approved", event.currentTarget.form!)
                          }
                        >
                          <CheckCheck size={15} />
                          تأیید
                        </button>
                      )}
                      <button
                        type="button"
                        className="button outline small"
                        disabled={busy}
                        onClick={(event) =>
                          review(row, "rejected", event.currentTarget.form!)
                        }
                      >
                        برگشت به معلم
                      </button>
                    </div>
                  </form>
                )}
                {(office || teacher) && (
                  <button
                    className="text-link"
                    disabled={busy}
                    aria-expanded={teaching===String(row.teaching_id)}
                    aria-controls={`monthly-sheet-${row.teaching_id}`}
                    onClick={() => {if(teaching===String(row.teaching_id))setLoading(false);setSheet(null);setTeaching(current=>current===String(row.teaching_id)?"":String(row.teaching_id))}}
                  >
                    {teaching===String(row.teaching_id)?"بستن فهرست":"نمایش لیست"}
                  </button>
                )}
                {(office||teacher)&&teaching===String(row.teaching_id)&&<div id={`monthly-sheet-${row.teaching_id}`} className="monthly-inline-sheet">{sheet?sheetEditor:<p role="status">در حال دریافت نمرات…</p>}</div>}
              </article>
            ))}
          </div>
          {office && !period.issued && (
            <form
              className="monthly-issue"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const note = String(
                  new FormData(event.currentTarget).get("note") || "",
                );
                act(async () => {
                  const result = await send<{ period: Period }>(
                    "/monthly-reports/periods/" + period.id + "/issue/",
                    { expected_version: period.version, note },
                  );
                  setPeriods((current) =>
                    current.map((item) =>
                      item.id === period.id ? result.period : item,
                    ),
                  );
                  setSuccess(
                    "کارنامه ماهیانه صادر شد و برای چاپ کادر مدرسه آماده است.",
                  );
                  setRevision((x) => x + 1);
                });
              }}
            >
              <label>
                یادداشت صدور
                <input
                  name="note"
                  maxLength={1000}
                  placeholder="مثلاً تأیید نهایی معاون آموزشی"
                />
              </label>
              <button
                className="button"
                disabled={busy || !readiness.all_ready}
              >
                <ShieldCheck size={17} />
                تأیید و صدور کارنامه
              </button>
            </form>
          )}
        </section>
      )}
      {!gradeList && (office || teacher) && period && (
        <section className="card">
          <div className="section-title">
            <div>
              <h2>{office ? "چاپ کارنامه‌های ماهیانه" : "کارنامه‌های ماهیانه"}</h2>
              <p className="muted">
                {office ? "خروجی را برای یک دانش‌آموز، یک درس و کلاس، یا همه درس‌های یک کلاس آماده کنید." : "نمایش نمرات درس‌های شما در کارنامه ماهیانه."}
              </p>
            </div>
          </div>
          {!period.issued ? (
            <div className="empty-state">
              <h3>کارنامه هنوز صادر نشده است.</h3>
              <p>
                پس از تأیید همه درس‌ها، مدیر یا معاون آموزشی آن را صادر می‌کند.
              </p>
            </div>
          ) : !cards?.cards.length ? (
            <div className="empty-state">کارنامه‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <>
            <div className="monthly-toolbar">
              {office&&<label>مرتب‌سازی فهرست<select value={cardSort} onChange={e=>setCardSort(e.target.value as "rank"|"name")}><option value="rank">رتبه کلاس</option><option value="name">نام دانش‌آموز</option></select></label>}
              <label>{office?"نوع چاپ":"نوع نمایش"}<select aria-label={office?"نوع چاپ":"نوع نمایش"} value={printMode} onChange={e=>{setPrintMode(e.target.value as typeof printMode);setPrintFilter("")}}>
                <option value="student">یک دانش‌آموز؛ همه درس‌ها</option>
                <option value="teaching">یک درس و کلاس؛ همه دانش‌آموزان</option>
                <option value="classroom">یک کلاس؛ همه درس‌ها</option>
              </select></label>
              {printMode==="student"?<StudentSearchPicker cards={cards.cards} value={printFilter} query={cardSearch} onQuery={setCardSearch} onChange={setPrintFilter}/>:<label>{printMode==="teaching"?"درس و کلاس":"کلاس"}<select aria-label={printMode==="teaching"?"درس و کلاس":"کلاس"} value={printFilter} onChange={e=>setPrintFilter(e.target.value)}><option value="">انتخاب کنید</option>{printMode==="teaching"&&readiness?.records.filter(row=>!classContext||(row.classroom_id!==undefined?row.classroom_id===classContext.id:row.classroom===classContext.title)).map(row=><option key={row.teaching_id} value={row.teaching_id}>{row.subject} · {row.classroom}</option>)}{printMode==="classroom"&&Array.from(new Map(cards.cards.map(card=>[card.classroom_id,card.classroom])).entries()).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>}
              <div className="download-icon-group" aria-label="دریافت کارنامه انتخاب‌شده">
                <a className="button outline icon-download-button" aria-disabled={!printFilter} onClick={event=>{if(!printFilter)event.preventDefault()}} href={!printFilter?"#":"/api/v1/monthly-reports/periods/"+period.id+"/cards/?export=xlsx&"+(printMode==="student"?"student=":printMode==="teaching"?"teaching=":"classroom=")+printFilter} download title="دریافت Excel" aria-label="دریافت Excel"><FileSpreadsheet size={19}/></a>
                {canPrint && <a className="button outline icon-download-button" aria-disabled={!printFilter} onClick={event=>{if(!printFilter)event.preventDefault()}} href={!printFilter?"#":"/api/v1/monthly-reports/periods/"+period.id+"/cards/?export=pdf&"+(printMode==="student"?"student=":printMode==="teaching"?"teaching=":"classroom=")+printFilter} download title="دریافت PDF" aria-label="دریافت PDF"><FileDown size={19}/></a>}
              </div>
            </div>
            {!displayedCards.length&&<p role="status" className="empty-state">کارنامه‌ای مطابق فیلتر پیدا نشد.</p>}
            <div className="monthly-card-grid">
              {displayedCards.map((card) => (
                <article key={card.student_id}>
                  <div className="monthly-card-head">
                    <div>
                      <h3>{card.student}</h3>
                      <p>{card.classroom}</p>
                      {office&&<div className="monthly-rank-summary"><span>میانگین وزنی: {card.weighted_average===null?"—":fa(Number(card.weighted_average))}</span><span>رتبه کلاس: {card.class_rank?fa(card.class_rank):"—"}</span><span>رتبه پایه و رشته: {card.grade_major_rank?fa(card.grade_major_rank):"—"}</span></div>}
                    </div>
                    {canPrint && <div className="download-icon-group" aria-label={`دریافت کارنامه ${card.student}`}>
                      <a className="button outline icon-download-button" href={`/api/v1/monthly-reports/periods/${period.id}/cards/?export=xlsx&student=${card.student_id}`} download title={`دریافت Excel کارنامه ${card.student}`} aria-label={`دریافت Excel کارنامه ${card.student}`}><FileSpreadsheet size={19}/></a>
                      <a className="button outline icon-download-button" href={`/api/v1/monthly-reports/periods/${period.id}/cards/?export=pdf&student=${card.student_id}`} download title={`دریافت PDF کارنامه ${card.student}`} aria-label={`دریافت PDF کارنامه ${card.student}`}><FileDown size={19}/></a>
                    </div>}
                  </div>
                  <div className="table-wrap"><table className="monthly-report-table"><caption>نمرات {card.student}</caption><thead><tr><th scope="col">درس</th><th scope="col">واحد</th>{Array.from({length:Math.max(2,...card.subjects.map(subject=>subject.scores.length))},(_,i)=><th scope="col" key={i}>نمره {fa(i+1)}</th>)}<th scope="col">میانگین</th><th scope="col">رتبه درس</th></tr></thead><tbody>{card.subjects.map((subject,i)=><tr key={subject.teaching_id||i}><th scope="row">{subject.subject}</th><td>{fa(subject.unit_count)}</td>{Array.from({length:Math.max(2,...card.subjects.map(s=>s.scores.length))},(_,j)=><td key={j}>{subject.scores[j]===null||subject.scores[j]===undefined?"—":subject.scores[j]==="absent"?"غایب":fa(Number(subject.scores[j]))}</td>)}<td>{subject.average===null?"—":fa(Number(subject.average))}</td><td>{subject.rank?fa(subject.rank):"—"}</td></tr>)}</tbody></table></div>
                </article>
              ))}
            </div></>
          )}
        </section>
      )}
      {loading && (
        <div className="empty-state" role="status">
          در حال دریافت اطلاعات…
        </div>
      )}
    </div>
  );
}
