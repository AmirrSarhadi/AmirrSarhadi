export type ValidationIssue={path:string;message:string};
type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
type ErrorState={node:HTMLElement;targets:HTMLElement[];native:boolean;previousInvalid:(string|null)[];assignedLabel?:string};
export type FormContext={form:HTMLFormElement;values:Map<Control,string>};
const errors=new WeakMap<Control,ErrorState>();
let sequence=0,submitting:{form:HTMLFormElement;event:Event}|null=null;

export const fieldNames:Record<string,string>={
 first_name:"نام",last_name:"نام خانوادگی",phone:"شماره همراه",email:"ایمیل",username:"کد ملی",
 personnel_code:"کد پرسنلی",password:"رمز عبور",date:"تاریخ",title:"عنوان",classroom:"کلاس",
 teacher:"معلم",student:"دانش‌آموز",records:"ردیف‌ها",scores:"نمرات",file:"فایل",role:"نقش",roles:"نقش‌ها",
 teaching:"درس",period:"زنگ یا دوره",page:"صفحه",page_size:"تعداد نمایش",expected_version:"نسخه اطلاعات",
 major:"رشته",year:"سال تحصیلی",year_id:"سال تحصیلی",classroom_id:"کلاس",classroom_ids:"کلاس‌های انتخاب‌شده",
 teacher_id:"معلم",student_id:"دانش‌آموز",source_id:"درس و معلم انتخاب‌شده",subject:"نام درس",
 unit_count:"تعداد واحد",expected_student_count:"تعداد دانش‌آموزان",grade:"پایه یا نمره",
 student_code:"کد دانش‌آموزی",student_phone:"شماره دانش‌آموز",father_name:"نام پدر",father_phone:"شماره پدر",
 mother_first_name:"نام مادر",mother_last_name:"نام خانوادگی مادر",mother_phone:"شماره مادر",
 primary_guardian:"ولی اصلی",primary_guardian_national_id:"کد ملی ولی اصلی",position:"سمت",
 summary:"خلاصه",body:"متن",image:"تصویر",image_alt:"متن جایگزین تصویر",code:"کد ورود",captcha:"کد تصویر",
 reason:"دلیل",arrival_time:"ساعت ورود",non_field_errors:"اطلاعات فرم",
};
const aliases:Record<string,string[]>={
 phone:["شماره موبایل","شماره تماس"],username:["کد ملی دانش‌آموز","نام کاربری"],position:["سمت سازمانی"],
 mother_name:["mother_first_name","نام مادر"],classroom_id:["classroom","کلاس"],year_id:["year","سال تحصیلی"],
 teacher_id:["teacher","معلم"],student_id:["student","دانش‌آموز"],teaching:["teaching_id","درس"],
 title:["عنوان خبر"],summary:["خلاصه خبر"],body:["متن خبر","توضیح آیتم"],
};
const normalized=(value:string)=>value.replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\s]+/g," ").replace(/[：:*]/g,"").trim();
const controlValue=(input:Control)=>input instanceof HTMLInputElement&&["checkbox","radio"].includes(input.type)?String(input.checked):input instanceof HTMLInputElement&&input.type==="file"?Array.from(input.files||[]).map(file=>file.name+":"+file.size+":"+file.lastModified).join("|"):input.value;
function controls(form:HTMLFormElement){return Array.from(form.elements).filter((node):node is Control=>node instanceof HTMLInputElement||node instanceof HTMLSelectElement||node instanceof HTMLTextAreaElement)}
export function trackFormSubmission(form:HTMLFormElement,event:Event){
 const owner={form,event};submitting=owner;
 // React's delegated submit runs after document capture; microtasks can run between them.
 setTimeout(()=>{if(submitting===owner)submitting=null},0);
}
export function captureFormContext(explicit?:HTMLFormElement|null):FormContext|undefined{
 if(typeof HTMLFormElement==="undefined")return;
 const form=explicit===null?null:explicit||(submitting?.event.eventPhase?submitting.form:null);
 if(!(form instanceof HTMLFormElement)||form.closest(".panel-confirm"))return;
 return {form,values:new Map(controls(form).map(input=>[input,controlValue(input)]))};
}
export function clearFieldError(input:Control){
 const state=errors.get(input);if(!state)return;
 if(state.native)input.setCustomValidity("");
 if(state.assignedLabel&&input.getAttribute("aria-label")===state.assignedLabel)input.removeAttribute("aria-label");
 state.targets.forEach((target,index)=>{
  const ids=(target.getAttribute("aria-describedby")||"").split(" ").filter(id=>id&&id!==state.node.id).join(" ");
  if(ids)target.setAttribute("aria-describedby",ids);else target.removeAttribute("aria-describedby");
  if(state.previousInvalid[index]===null)target.removeAttribute("aria-invalid");else target.setAttribute("aria-invalid",state.previousInvalid[index]!);
 });
 state.node.remove();errors.delete(input);
}
export function clearFormErrors(form:HTMLFormElement){controls(form).forEach(clearFieldError)}
export function showFieldError(input:Control,message:string,native=false){
 clearFieldError(input);
 const composite=input.closest<HTMLElement>(".persian-date,.file-upload,[data-validation-field]");
 const trigger=composite?.querySelector<HTMLElement>(".date-trigger,[data-validation-trigger]");
 const targets:HTMLElement[]=trigger?[input,trigger]:composite?.hasAttribute("data-validation-group")?[input,composite]:[input];
 const previousInvalid=targets.map(target=>target.getAttribute("aria-invalid"));
 const label=input.closest("label");
 const assignedLabel=!input.hasAttribute("aria-label")&&!input.hasAttribute("aria-labelledby")?(input.labels?.[0]?.childNodes[0]?.textContent?.trim()||undefined):undefined;
 if(assignedLabel)input.setAttribute("aria-label",assignedLabel);
 const node=document.createElement("small");node.id="field-error-"+(++sequence);node.className="field-error";node.dataset.fieldError="true";node.setAttribute("role","alert");node.textContent=message;
 if(composite)composite.append(node);else if(label)label.append(node);else input.insertAdjacentElement("afterend",node);
 targets.forEach(target=>{target.setAttribute("aria-invalid","true");target.setAttribute("aria-describedby",[target.getAttribute("aria-describedby"),node.id].filter(Boolean).join(" "))});
 if(native)input.setCustomValidity(message);
 errors.set(input,{node,targets,native,previousInvalid,assignedLabel});
}
export function focusInvalid(input:Control){
 const target=input.closest<HTMLElement>(".persian-date,[data-validation-field]")?.querySelector<HTMLElement>(".date-trigger,[data-validation-trigger]")||input;
 let attempts=0;
 const focus=()=>{if(!target.isConnected||!target.getClientRects().length)return;if(target.matches(":disabled")||target.closest("[inert]")){if(attempts++<10)requestAnimationFrame(focus);return}target.focus();target.scrollIntoView({block:"nearest",inline:"nearest"})};
 // Let confirmation focus restoration and the owning form's pending state settle first.
 requestAnimationFrame(()=>requestAnimationFrame(focus));
}
export function validationIssues(value:unknown,path=""):ValidationIssue[]{
 if(Array.isArray(value)){
  if(value.every(item=>typeof item!=="object"||item===null))return value.filter(Boolean).map(item=>({path,message:persianMessage(item)}));
  return value.flatMap((item,index)=>validationIssues(item,path?path+"."+index:String(index)));
 }
 if(value&&typeof value==="object"){
  const record=value as Record<string,unknown>;
  if(record.field_errors&&typeof record.field_errors==="object")return [...validationIssues(record.field_errors),...validationIssues(record.non_field_errors||[],"")];
  return Object.entries(record).filter(([key,item])=>!((key==="code"||key==="type")&&!Array.isArray(item)&&typeof item!=="object")).flatMap(([key,item])=>validationIssues(item,key==="detail"||key==="non_field_errors"?path:path?path+"."+key:key));
 }
 return value?[{path,message:persianMessage(value)}]:[];
}
function persianMessage(value:unknown){const message=String(value||"");return /[\u0600-\u06ff]/.test(message)?message:"مقدار واردشده معتبر نیست. این فیلد را بررسی کنید."}
export function applyFormErrors(context:FormContext|undefined,issues:ValidationIssue[]){
 if(!context?.form.isConnected)return issues;
 const fields=controls(context.form),remaining:ValidationIssue[]=[],matched=new Map<Control,string[]>();
 for(const issue of issues){
  if(!issue.path){remaining.push(issue);continue}
  const path=issue.path.replace(/\[(\d+)\]/g,".$1"),leaf=path.split(".").at(-1)!;
  const exact=fields.filter(input=>input.name.replace(/\[(\d+)\]/g,".$1")===path||!!input.name&&path.startsWith(input.name+".")&&!!input.closest("[data-validation-field]"));
  const nestedArray=/\.\d+(\.|$)/.test(path);
  const names=[leaf,fieldNames[leaf],...(aliases[leaf]||[])].filter(Boolean).map(normalized);
  const matches=exact.length?exact:nestedArray?[]:fields.filter(input=>names.includes(normalized(input.name))||names.includes(normalized(input.getAttribute("aria-label")||""))||Array.from(input.labels||[]).some(label=>names.includes(normalized(label.childNodes[0]?.textContent||""))));
  let visible=matches.filter(input=>input.isConnected&&(input.getClientRects().length||input.closest("[data-validation-field]")?.querySelector("[data-validation-trigger],.date-trigger")?.getClientRects().length)&&context.values.get(input)===controlValue(input));
  if(visible.length>1&&visible.every(input=>input instanceof HTMLInputElement&&["checkbox","radio"].includes(input.type)&&input.closest("[data-validation-group]")===visible[0].closest("[data-validation-group]"))&&visible[0].closest("[data-validation-group]"))visible=visible.slice(0,1);
  if(!visible.length){remaining.push(issue);continue}
  for(const input of visible){const messages=matched.get(input)||[];if(!messages.includes(issue.message))messages.push(issue.message);matched.set(input,messages)}
 }
 matched.forEach((messages,input)=>showFieldError(input,messages.join(" ")));
 const first=fields.find(input=>matched.has(input));if(first)focusInvalid(first);
 return remaining;
}
