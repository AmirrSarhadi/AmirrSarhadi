"use client";
import {withPageSize} from "@/lib/pagination";
import {FileUpload} from "@/components/ui/file-upload-04";
import {useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {Archive,BookOpen,Download,FileSpreadsheet,GraduationCap,Link2,Pencil,Plus,RefreshCw,School,Upload,Users,X} from "lucide-react";
import {api,send,fa} from "@/lib/api";
import {FormDialog} from "@/components/ui/form-dialog";
import "@/app/school-structure.css";
import {SearchablePersonSelect} from "@/components/ui/searchable-person-select";
import {Pagination} from "@/components/ui/pagination";
import {ImportPreview,ImportPreviewData} from "@/components/import-preview";

type StatusRow={id:number;active:boolean;version:number};
type Year=StatusRow&{title:string};
type Classroom=StatusRow&{title:string;year_id:number;year:string;grade:number;major:string;major_label:string;expected_student_count:number|null;student_count?:number|null};
type Teaching=StatusRow&{teacher_id:number;teacher:string;classroom_id:number;classroom:string;subject:string;unit_count:number};
type Enrollment=StatusRow&{student_id:number;student:string;classroom_id:number;classroom:string};
type FamilyLink=StatusRow&{family_id:number;family:string;student_id:number;student:string};
type Person={id:number;name:string;username:string};
type Structure={years:Year[];classes:Classroom[];teachings:Teaching[];enrollments:Enrollment[];family_links:FamilyLink[];options:{teachers:Person[];students:Person[];families:Person[]}};
type Kind="years"|"classes"|"teachings"|"enrollments"|"family-links";
type EditorState=EditState|{kind:Kind;row?:never};
type Section="classes"|"teachings"|"enrollments"|"families";
type EditState={kind:"years";row:Year}|{kind:"classes";row:Classroom}|{kind:"teachings";row:Teaching}|{kind:"enrollments";row:Enrollment}|{kind:"family-links";row:FamilyLink};

const sectionLabels:{id:Section;label:string;icon:typeof School}[]=[
 {id:"classes",label:"سال و کلاس",icon:School},{id:"teachings",label:"درس و معلم",icon:BookOpen},
 {id:"enrollments",label:"ثبت‌نام کلاس",icon:GraduationCap},{id:"families",label:"ارتباط خانواده",icon:Link2},
];

const createLabels:Record<Kind,string>={years:"ایجاد سال",classes:"ایجاد کلاس",teachings:"ثبت تخصیص",enrollments:"ثبت در کلاس","family-links":"ثبت ارتباط"};
const formLabels:Record<Kind,string>={years:"ایجاد سال تحصیلی",classes:"ایجاد کلاس",teachings:"تخصیص درس",enrollments:"ثبت‌نام دانش‌آموز","family-links":"ارتباط خانواده"};

export function TeachingRegistration({onChanged,onBusyChange}:{onChanged?:()=>Promise<void>;onBusyChange?:(busy:boolean)=>void}){
 const [data,setData]=useState<Structure|null>(null),[mode,setMode]=useState<"manual"|"excel">("manual"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[classId,setClassId]=useState(""),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;api<Structure>("/structure/?scope=current&compact=1").then(result=>{if(live)setData(result)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[revision]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false)},[busy,onBusyChange]);
 const classes=data?.classes.filter(row=>row.active&&data.years.some(year=>year.id===row.year_id&&year.active))||[];
 const classroom=classes.find(row=>String(row.id)===classId)||classes[0];
 async function save(payload:Record<string,unknown>){if(busy)return;setBusy(true);setError("");setSuccess("");try{await send("/structure/teachings/",payload);setRevision(value=>value+1);setSuccess("درس به معلم تخصیص یافت.");await onChanged?.()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function changeMode(value:"manual"|"excel"){setMode(value);setError("");setSuccess("")}
 return <div className="teaching-registration">
 {error&&<div className="error" role="alert">{error}{!data&&<button type="button" className="text-link" onClick={()=>setRevision(value=>value+1)}>تلاش دوباره</button>}</div>}{success&&<div className="success" role="status">{success}</div>}
 <div className="section-title teaching-entry-toolbar"><div className="exchange-mode" role="tablist" aria-label="روش ورود اطلاعات"><button type="button" role="tab" disabled={busy} aria-selected={mode==="manual"} className={mode==="manual"?"active":""} onClick={()=>changeMode("manual")}><Plus size={16}/>ورود دستی</button><button type="button" role="tab" disabled={busy} aria-selected={mode==="excel"} className={mode==="excel"?"active":""} onClick={()=>changeMode("excel")}><FileSpreadsheet size={16}/>ورود با Excel</button></div>{classroom&&<a className="button outline small" href={`/api/v1/structure/classes/${classroom.id}/teachings/template/`} download><Download size={15}/>دانلود Excel نمونه</a>}</div>
 {!data?!error&&<p role="status">در حال دریافت درس‌ها…</p>:!classes.length||!data.options.teachers.length?<p className="notice">ابتدا کلاس و معلم را ثبت کنید.</p>:mode==="manual"?<div onChangeCapture={event=>{const target=event.target;if(target instanceof HTMLSelectElement&&target.name==="classroom_id")setClassId(target.value)}}><StructureEditForm key={revision} inline defaultClassId={classroom?.id} editing={{kind:"teachings"}} data={data} activeClasses={classes} busy={busy} onCancel={()=>{setRevision(value=>value+1);setError("")}} onSave={save}/></div>:classroom&&<><label>کلاس فایل<select aria-label="کلاس فایل" value={classroom.id} disabled={busy} onChange={event=>{setClassId(event.target.value);setError("");setSuccess("")}}>{classes.map(row=><option key={row.id} value={row.id}>{row.title} · {row.year}</option>)}</select></label><ClassTeachingImport key={classroom.id} exchange classroom={classroom} onBusyChange={setBusy} onApplied={async()=>{setSuccess("درس‌ها با موفقیت ثبت شدند.");await onChanged?.()}}/></>}
 </div>;
}

export function SchoolStructure({teachingEntry=false,onChanged}:{teachingEntry?:boolean;onChanged?:()=>Promise<void>}={}){
 const [reload,setReload]=useState(0);
 const [data,setData]=useState<Structure|null>(null),[section,setSection]=useState<Section>("classes"),[editing,setEditing]=useState<EditorState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [importing,setImporting]=useState(false),[importClass,setImportClass]=useState("");
 async function load(){setBusy(true);setError("");try{setData(await api("/structure/?scope=current&compact=1"));setReload(value=>value+1)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 async function save(payload:Record<string,unknown>){
  if(!editing||busy)return;setBusy(true);setError("");setSuccess("");
  try{
   const {kind,row}=editing;
   await send(row?`/structure/${kind}/${row.id}/`:`/structure/${kind}/`,row?{...payload,expected_version:row.version,reason:"ویرایش اطلاعات از پنل ساختار مدرسه"}:payload);
   setEditing(null);setSuccess(row?"اطلاعات با موفقیت ویرایش شد.":({years:"سال تحصیلی ایجاد شد.",classes:"کلاس ایجاد شد.",teachings:"درس به معلم تخصیص یافت.",enrollments:"دانش‌آموز در کلاس ثبت شد.","family-links":"ارتباط خانواده ثبت شد."})[kind]);await load();if(teachingEntry)await onChanged?.();
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function change(kind:string,row:StatusRow,label:string){const active=!row.active;setBusy(true);setError("");setSuccess("");try{await send(`/structure/${kind}/${row.id}/status/`,{active,expected_version:row.version,reason:active?`فعال‌سازی ${label}`:`حذف ${label} از ساختار فعال`});setSuccess(active?"مورد انتخاب‌شده دوباره فعال شد.":"مورد انتخاب‌شده حذف شد؛ سوابق قبلی آن همچنان حفظ می‌شود.");await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function open(kind:Kind){setError("");setSuccess("");setEditing({kind})}
 if(!data)return <div className="card">{error?<div className="error" role="alert">{error}<button className="text-link" onClick={load} disabled={busy}>تلاش دوباره</button></div>:"در حال دریافت ساختار مدرسه…"}</div>;
 const years=data.years.filter(row=>row.active),classes=data.classes.filter(row=>row.active&&years.some(year=>year.id===row.year_id));
 return <section className="structure-module">
  {!teachingEntry&&<header className="structure-heading"><div><span className="badge">ساختار آموزشی</span><h2>سال، کلاس و ارتباط‌های آموزشی</h2><p>بایگانی، سوابق حضور، تکلیف و نمره را حذف نمی‌کند.</p></div><School size={30}/></header>}
  {error&&!editing&&<div className="error" role="alert">{error}<button type="button" className="text-link" disabled={busy} onClick={load}>تلاش دوباره</button></div>}{success&&<div className="success" role="status">{success}</div>}
  {!teachingEntry&&<div className="structure-tabs" role="tablist" aria-label="بخش‌های ساختار مدرسه">{sectionLabels.map(item=><button key={item.id} role="tab" aria-selected={section===item.id} disabled={busy} onClick={()=>setSection(item.id)}><item.icon size={17}/>{item.label}</button>)}<button className="text-link" onClick={load} disabled={busy}><RefreshCw size={15}/>تازه‌سازی</button></div>}
  {!teachingEntry&&section==="classes"&&<>
   <StructureSection title="سال‌های تحصیلی" action={<CreateButton busy={busy} onClick={()=>open("years")}>ایجاد سال</CreateButton>}>
    <StructureTable title="سال‌های تحصیلی" columns={["سال تحصیلی"]} empty="سال تحصیلی ثبت نشده است.">{years.map((row,index)=><StructureRow key={row.id} index={index+1} cells={[row.title]} row={row} busy={busy} onEdit={()=>setEditing({kind:"years",row})} onStatus={()=>change("years",row,row.title)}/>)}</StructureTable>
   </StructureSection>
   <StructureSection title="کلاس‌ها" action={<CreateButton busy={busy||!years.length} onClick={()=>open("classes")}>ایجاد کلاس</CreateButton>}>
    <StructureTable title="کلاس‌ها" columns={["نام کلاس","سال تحصیلی","پایه","رشته","تعداد دانش‌آموز"]} empty="کلاسی ثبت نشده است.">{classes.map((row,index)=><StructureRow key={row.id} index={index+1} cells={[row.title,row.year,fa(row.grade),row.major_label,(row.student_count??row.expected_student_count)!=null?fa((row.student_count??row.expected_student_count)!):"—"]} row={row} busy={busy} onEdit={()=>setEditing({kind:"classes",row})} onStatus={()=>change("classes",row,row.title)}/>)}</StructureTable>
   </StructureSection>
  </>}
  {(teachingEntry||section==="teachings")&&<StructureSection title={teachingEntry?"ثبت درس و تخصیص معلم":"درس‌ها و معلمان"} action={teachingEntry?<><CreateButton busy={busy||!data.options.teachers.length||!classes.length} onClick={()=>open("teachings")}>ثبت تخصیص</CreateButton><button type="button" className="button outline small" disabled={busy||!classes.length} onClick={()=>{setImportClass(String(classes[0].id));setImporting(true)}}><Upload size={16}/>ورود گروهی درس‌ها</button></>:null}>
   {!teachingEntry&&<CurrentStructureList key="teachings" kind="teachings" classes={classes} teachers={data.options.teachers} reload={reload} busy={busy} onEdit={setEditing} onStatus={row=>change("teachings",row,"subject" in row?row.subject:row.student)}/>}
  </StructureSection>}
  {!teachingEntry&&section==="enrollments"&&<StructureSection title="ثبت‌نام دانش‌آموزان در کلاس" action={<CreateButton busy={busy||!data.options.students.length||!classes.length} onClick={()=>open("enrollments")}>ثبت در کلاس</CreateButton>}>
   <CurrentStructureList key="enrollments" kind="enrollments" classes={classes} reload={reload} busy={busy} onEdit={setEditing} onStatus={row=>change("enrollments",row,"student" in row?row.student:row.subject)}/>
  </StructureSection>}
  {!teachingEntry&&section==="families"&&<StructureSection title="ارتباط خانواده و دانش‌آموز" action={<CreateButton busy={busy||!data.options.families.length||!data.options.students.length} onClick={()=>open("family-links")}>ثبت ارتباط</CreateButton>}>
   <CurrentStructureList key="family-links" kind="family-links" classes={classes} reload={reload} busy={busy} onEdit={setEditing} onStatus={row=>change("family-links",row,"student" in row?row.student:row.subject)}/>
  </StructureSection>}
  {editing&&<FormDialog title={editing.row?"اصلاح اطلاعات":formLabels[editing.kind]} busy={busy} close={()=>{setEditing(null);setError("")}}>
   {error&&<div className="error" role="alert">{error}</div>}<StructureEditForm editing={editing} data={data} activeClasses={classes} busy={busy} onCancel={()=>{setEditing(null);setError("")}} onSave={save}/>
  </FormDialog>}
  {importing&&<FormDialog title="ورود گروهی درس‌ها" busy={busy} close={()=>setImporting(false)}><label>کلاس فایل<select aria-label="کلاس فایل" value={importClass} disabled={busy} onChange={event=>setImportClass(event.target.value)}>{classes.map(row=><option key={row.id} value={row.id}>{row.title} · {row.year}</option>)}</select></label>{classes.filter(row=>String(row.id)===importClass).map(classroom=><ClassTeachingImport key={classroom.id} classroom={classroom} onBusyChange={setBusy} onApplied={async()=>{setImporting(false);await load();await onChanged?.()}}/>)}</FormDialog>}
 </section>
}

type CurrentPage={records:(Enrollment|FamilyLink|Teaching)[];count:number;page:number;pages:number};
function CurrentStructureList({kind,classes,teachers=[],reload,busy,onEdit,onStatus}:{kind:"teachings"|"enrollments"|"family-links";classes:Classroom[];teachers?:Person[];reload:number;busy:boolean;onEdit:(editing:EditState)=>void;onStatus:(row:Enrollment|FamilyLink|Teaching)=>void}){
 const [pageSize,setPageSize]=useState(20);

 const [filters,setFilters]=useState({page:1,q:"",classId:"",teacherId:""}),[search,setSearch]=useState(""),[data,setData]=useState<CurrentPage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const requestId=useRef(0),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(search===filters.q)return;const timer=setTimeout(()=>setFilters(value=>({...value,q:search,page:1})),search?300:0);return()=>clearTimeout(timer)},[search,filters.q]);
 useEffect(()=>{
  if(search!==filters.q)return;
  const controller=new AbortController();
  const id=++requestId.current;setLoading(true);setError("");
  const params=new URLSearchParams({scope:"current",kind,page:String(filters.page)});
  if(filters.q.trim())params.set("q",filters.q.trim());
  if(filters.classId)params.set("class_id",filters.classId);
  if(kind==="teachings"&&filters.teacherId)params.set("teacher_id",filters.teacherId);
  api<CurrentPage>(withPageSize("/structure/?"+params,pageSize),{signal:controller.signal}).then(result=>{if(id!==requestId.current)return;setData(result);if(result.page!==filters.page)setFilters(value=>({...value,page:result.page}))})
   .catch(e=>{if(id===requestId.current)setError((e as Error).message)})
   .finally(()=>{if(id===requestId.current)setLoading(false)});
  return()=>{requestId.current++;controller.abort()};
 },[kind,filters,search,reload,retry,pageSize]);
 function find(value:string){requestId.current++;setLoading(true);setSearch(value)}
 const label=kind==="teachings"?"تخصیص درس به معلم":kind==="enrollments"?"ثبت‌نام‌های جاری":"ارتباط‌های خانواده جاری";
 return <div>
  <div className="flow-toolbar">
   {kind==="teachings"&&<label>معلم فهرست<select aria-label="معلم فهرست" value={filters.teacherId} disabled={busy} onChange={event=>{requestId.current++;setLoading(true);setFilters(value=>({...value,teacherId:event.target.value,page:1}))}}><option value="">همه معلمان</option>{teachers.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
   <label>کلاس فهرست<select aria-label="کلاس فهرست" value={filters.classId} onChange={e=>{requestId.current++;setLoading(true);setFilters(value=>({...value,classId:e.target.value,page:1}))}}><option value="">همه کلاس‌ها</option>{classes.map(row=><option key={row.id} value={row.id}>{row.title} · {row.year}</option>)}</select></label>
   <label>جستجوی فهرست<span style={{display:"flex",alignItems:"center",gap:8}}><input ref={input} type="search" aria-label="جستجوی فهرست" maxLength={120} value={search} onChange={e=>find(e.target.value)} style={{minWidth:0,flex:1}}/>{search&&<button type="button" className="icon-button" aria-label="پاک کردن جستجوی فهرست" title="پاک کردن جستجوی فهرست" onClick={()=>{find("");input.current?.focus()}}><X size={16}/></button>}</span></label>
  </div>
  {error&&<div className="error" role="alert">{error}<button className="text-link" disabled={loading||busy} onClick={()=>setRetry(value=>value+1)}>تلاش دوباره</button></div>}
  <StructureTable title={label} columns={kind==="teachings"?["نام درس","معلم","کلاس","سال تحصیلی","تعداد واحد"]:kind==="enrollments"?["دانش‌آموز","کلاس","سال تحصیلی"]:["دانش‌آموز","خانواده"]} empty="موردی با این فیلترها یافت نشد." loading={loading} failed={Boolean(error)}>{data?.records.map((row,index)=><StructureRow key={row.id} index={(filters.page-1)*20+index+1} cells={"subject" in row?[row.subject,row.teacher,row.classroom,classes.find(classroom=>classroom.id===row.classroom_id)?.year||"—",fa(row.unit_count)]:"family" in row?[row.student,row.family]:[row.student,row.classroom,classes.find(classroom=>classroom.id===row.classroom_id)?.year||"—"]} row={row} busy={busy||loading} onEdit={()=>onEdit("subject" in row?{kind:"teachings",row}:"family" in row?{kind:"family-links",row}:{kind:"enrollments",row})} onStatus={()=>onStatus(row)}/>)}</StructureTable>
  <Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);requestId.current++;setLoading(true);setFilters(current=>({...current,page:1}));}} page={filters.page} pages={data?.pages||1} count={data?.count||0} busy={busy||loading||!!error} label={label} onChange={page=>{requestId.current++;setLoading(true);setFilters(value=>({...value,page}))}}/>
 </div>;
}

function StructureEditForm({editing,data,activeClasses,busy,onCancel,onSave,inline=false,defaultClassId}:{editing:EditorState;data:Structure;activeClasses:Classroom[];busy:boolean;onCancel:()=>void;onSave:(payload:Record<string,unknown>)=>void;inline?:boolean;defaultClassId?:number}){
 const row:Partial<Year&Classroom&Teaching&Enrollment&FamilyLink>=editing.row||{classroom_id:defaultClassId};
 function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;if(!form.checkValidity())return;const d=new FormData(form);if(editing.kind==="years")onSave({title:d.get("title")});else if(editing.kind==="classes"){const count=String(d.get("expected_student_count")||"");onSave({title:d.get("title"),year_id:Number(d.get("year_id")),grade:Number(d.get("grade")),major:d.get("major"),expected_student_count:count?Number(count):null})}else if(editing.kind==="teachings")onSave({teacher_id:Number(d.get("teacher_id")),classroom_id:Number(d.get("classroom_id")),subject:d.get("subject"),unit_count:Number(d.get("unit_count"))});else if(editing.kind==="enrollments")onSave({student_id:Number(d.get("student_id")),classroom_id:Number(d.get("classroom_id"))});else onSave({family_id:Number(d.get("family_id")),student_id:Number(d.get("student_id"))})}
 return <form className={inline?"structure-edit exchange-manual teaching-entry-form":"structure-edit"} noValidate data-persian-validation aria-label={editing.row?"اصلاح اطلاعات":formLabels[editing.kind]} onSubmit={submit} key={`${editing.kind}-${editing.row?.id||"new"}`}>
  <fieldset disabled={busy} className="structure-fields">
  {editing.kind==="years"&&<label>عنوان سال تحصیلی<input name="title" defaultValue={row.title} required maxLength={30}/></label>}
  {editing.kind==="classes"&&<><label>نام کلاس<input name="title" defaultValue={row.title} required maxLength={100}/></label><div className="form-grid"><label>سال تحصیلی<select aria-label="سال تحصیلی" name="year_id" defaultValue={row.year_id} required>{data.years.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label>پایه<select aria-label="پایه" name="grade" defaultValue={row.grade}><option value="10">دهم</option><option value="11">یازدهم</option><option value="12">دوازدهم</option></select></label></div><div className="form-grid"><label>رشته<select aria-label="رشته" name="major" required defaultValue={["math","science"].includes(row.major||"")?row.major:""}><option value="" disabled>انتخاب رشته</option><option value="science">تجربی</option><option value="math">ریاضی‌فیزیک</option></select></label><label>تعداد مورد انتظار<input name="expected_student_count" type="number" min="1" max="100" defaultValue={row.expected_student_count||""}/></label></div></>}
  {editing.kind==="teachings"&&<><label>نام درس<input name="subject" defaultValue={row.subject} required maxLength={100}/></label><div className="form-grid"><label>معلم<select aria-label="معلم" name="teacher_id" defaultValue={row.teacher_id} required>{data.options.teachers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>کلاس<select aria-label="کلاس" name="classroom_id" defaultValue={row.classroom_id} required>{activeClasses.map(x=><option key={x.id} value={x.id}>{x.title} · {x.year}</option>)}</select></label><label>تعداد واحد<input name="unit_count" type="number" min="1" max="10" defaultValue={row.unit_count??1} required/></label></div></>}
  {editing.kind==="enrollments"&&<div className="form-grid"><SearchablePersonSelect label="دانش‌آموز" name="student_id" options={data.options.students} defaultValue={row.student_id} disabled={busy}/><label>کلاس<select aria-label="کلاس" name="classroom_id" defaultValue={row.classroom_id} required>{activeClasses.map(x=><option key={x.id} value={x.id}>{x.title} · {x.year}</option>)}</select></label></div>}
  {editing.kind==="family-links"&&<div className="form-grid"><SearchablePersonSelect label="حساب خانواده" name="family_id" options={data.options.families} defaultValue={row.family_id} disabled={busy}/><SearchablePersonSelect label="دانش‌آموز" name="student_id" options={data.options.students} defaultValue={row.student_id} disabled={busy}/></div>}
  </fieldset><div className="structure-edit-actions"><button className="button small" disabled={busy}>{inline?"ثبت اطلاعات":editing.row?"ذخیره تغییرات":createLabels[editing.kind]}</button>{!inline&&<button type="button" className="button outline small" onClick={onCancel} disabled={busy}>انصراف</button>}</div>
 </form>
}

function CreateButton({busy,onClick,children}:{busy:boolean;onClick:()=>void;children:ReactNode}){return <button type="button" className="button small" disabled={busy} onClick={onClick}><Plus size={16}/>{children}</button>}
function StructureSection({title,action,children}:{title:string;action:ReactNode;children:ReactNode}){return <section className="structure-section" aria-label={title}><header><h3>{title}</h3><div className="structure-section-actions">{action}</div></header>{children}</section>}
function StructureTable({title,columns,empty,loading=false,failed=false,children}:{title:string;columns:string[];empty:string;loading?:boolean;failed?:boolean;children:ReactNode}){
 const rows=Array.isArray(children)?children.filter(Boolean):children;
 return <div className="table-wrap structure-table-wrap" role="region" aria-label={title} tabIndex={0} aria-busy={loading}><table className="structure-table" aria-label={title}><thead><tr>{["ردیف",...columns,"وضعیت","عملیات"].map(column=><th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{loading||failed||!rows||(Array.isArray(rows)&&!rows.length)?<tr><td colSpan={columns.length+3} className="structure-empty"><span role="status">{loading?"در حال دریافت…":failed?"دریافت اطلاعات ناموفق بود.":empty}</span></td></tr>:rows}</tbody></table></div>
}
function StructureRow({index,cells,row,busy,onEdit,onStatus}:{index:number;cells:ReactNode[];row:StatusRow;busy:boolean;onEdit:()=>void;onStatus:()=>void}){return <tr className={!row.active?"is-archived":""}><td>{fa(index)}</td>{cells.map((cell,index)=>index===0?<th scope="row" key={index}>{cell}</th>:<td key={index}>{cell}</td>)}<td><span className={row.active?"badge green":"badge orange"}>{row.active?"فعال":"بایگانی"}</span></td><td><div className="structure-row-actions"><button type="button" className="button outline small" disabled={busy} onClick={onEdit}><Pencil size={14}/>ویرایش</button><button type="button" className="button outline small" disabled={busy} onClick={onStatus}>{row.active?<><Archive size={14}/>حذف</>:<><RefreshCw size={14}/>فعال‌سازی</>}</button></div></td></tr>}

function ClassTeachingImport({classroom,onApplied,onBusyChange,exchange=false}:{classroom:Classroom;onApplied:()=>Promise<void>;onBusyChange:(busy:boolean)=>void;exchange?:boolean}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<ImportPreviewData|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const form=useRef<HTMLFormElement>(null);
 async function run(confirm=false){if(!file||busy||(confirm&&!preview?.can_apply))return;setBusy(true);onBusyChange(true);setMessage("");setError("");if(!confirm)setPreview(null);try{const body=new FormData();body.append("file",file);body.append("confirm",String(confirm));if(confirm){body.append("confirmed_valid_rows",JSON.stringify(preview!.rows.filter(row=>!row.errors.length).map(row=>row.row)));body.append("confirmed_fingerprint",preview!.fingerprint||"");const result=await api<{created:number;skipped?:number}>(`/structure/classes/${classroom.id}/teachings/import/`,{method:"POST",body,form:form.current,confirm:false});setPreview(null);setFile(null);setMessage(`${fa(result.created)} تخصیص جدید ثبت شد؛ ${fa(result.skipped||0)} ردیف خطادار ثبت نشد.`);await onApplied()}else setPreview(await api<ImportPreviewData>(`/structure/classes/${classroom.id}/teachings/import/`,{method:"POST",body,form:form.current,confirm:false,feedback:false}))}catch(e){setError((e as Error).message)}finally{setBusy(false);onBusyChange(false)}}
 return <form ref={form} aria-label="ورود فایل درس‌ها" noValidate data-persian-validation onSubmit={event=>{event.preventDefault();void run(false)}}><div className="structure-import"><div><h4>{classroom.title}</h4><p>{classroom.year} · ستون‌ها: نام درس، تعداد واحد، نام معلم، کد ملی معلم</p></div>{message&&<p role="status" className="success">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}<div>{!exchange&&<a className="button outline small" href={`/api/v1/structure/classes/${classroom.id}/teachings/template/`} download><Download size={14}/>نمونه Excel</a>}<FileUpload name="file" title="فایل تدریس‌ها" accept=".xlsx" hint="Excel تا ۲ مگابایت" maxSize={2*1024*1024} files={file?[file]:[]} disabled={busy} onFilesChange={files=>{setFile(files[0]||null);setPreview(null);setError("");setMessage("")}}/><button type="submit" className="button outline small" disabled={!file||busy}><Upload size={14}/>{exchange?"پیش‌نمایش امن":"بررسی"}</button></div></div>{preview&&<ImportPreview preview={preview} busy={busy} onApply={()=>run(true)} label={exchange?"اعمال نهایی":"ثبت نهایی"}/>}</form>;
}
