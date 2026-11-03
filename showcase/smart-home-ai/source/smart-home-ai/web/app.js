'use strict';
const $ = id => document.getElementById(id);
const kinds = {bedroom:'اتاق خواب',living:'پذیرایی',kitchen:'آشپزخانه',bathroom:'فضای بهداشتی',corridor:'ورودی و گردش',terrace:'تراس',lightwell:'نورگیر',stairs:'پله',elevator:'آسانسور',other:'سایر'};
let state = null, selected = null, token = '', apiReady = false, busy = false, zoom = 1, proposal = null, editorDirty = false;
function msg(text, error=false) { $('message').textContent=text; $('message').className=error?'error':''; }
function el(tag, text, cls) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function list(parent, items) { const ul=el('ul'); for(const text of items)ul.append(el('li',text));parent.append(ul); }
function option(select, value, text) {const node=el('option',text);node.value=value;select.append(node);}
function unitName(id) {return ({left:'واحد سمت چپ نقشه',right:'واحد سمت راست نقشه',shared:'مشاعات — نیازمند تأیید',unknown:'محدوده نامشخص'})[id]||id;}
function choices(select, ids, previous) {select.replaceChildren();for(const id of ids)option(select,id,unitName(id));if(ids.includes(previous))select.value=previous;}
function invalidate() {state.reviewed=false;proposal=null;$('results').hidden=true;$('reviewCheck').checked=false;buttons();}
function buttons() {
  const has=!!state, plan=!!state?.plan;
  for(const id of ['upload','sample','openProject'])$(id).disabled=busy||!token;
  $('saveProject').disabled=busy||!plan||editorDirty;
  window.planEditor?.syncButtons();
  $('extract').disabled=busy||!has||!apiReady||!$('cloud').checked;
  $('review').disabled=busy||!plan||editorDirty||!$('reviewCheck').checked;
  $('propose').disabled=busy||!plan||editorDirty||!state.reviewed||!apiReady||!$('cloud').checked||!$('unit').value;
  $('exportPlan').disabled=busy||!plan||editorDirty;
  $('importPlan').disabled=busy||!has;
  $('addSpace').disabled=busy||!plan;
  $('deleteSpace').disabled=busy||!selected;
  for(const node of document.querySelectorAll('#editor input,#editor select,#editor button,#unit,#reviewCheck,#cloud,#file,#page'))node.disabled=busy;
  document.body.classList.toggle('busy',busy);
}
async function request(path, data={}) {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Workbench-Token':token},body:JSON.stringify(data)});
  const body=await response.json(); if(!response.ok)throw Error(body.error||'درخواست انجام نشد.');return body;
}
async function work(message, fn) {
  if(busy)return;busy=true;buttons();msg(message);
  try {await fn();}catch(error){msg(error.message,true);}finally{busy=false;buttons();}
}
function payload(extra={}) {return {session_id:state.session_id,revision:state.revision,...extra};}
function acceptSession(value) {
  state=value;selected=null;proposal=null;editorDirty=false;zoom=1;$('planStage').style.width='100%';
  window.planEditor?.reset();
  $('planImage').src=state.image;$('planImage').hidden=false;$('empty').hidden=true;
  $('reviewCheck').checked=state.reviewed;$('results').hidden=true;
  render();
}
function render() {
  const plan=state?.plan;
  $('sourceLabel').textContent=state?.origin==='manual_sample'?'نمونه دستی از شیت A05 · تشخیص خودکار مدل نیست':plan?`شیت ${plan.sheet} · صفحه ${plan.page_number} · ${state.reviewed?'بازبینی‌شده':'نیازمند بازبینی'}`:'تصویر آماده است؛ استخراج فضاها را اجرا کن.';
  if(!plan){$('spaces').replaceChildren();$('overlay').replaceChildren();$('editor').hidden=true;$('unknownCard').hidden=true;$('stats').textContent='';choices($('unit'),[],null);return;}
  const units=[...plan.unit_ids,'shared','unknown'];
  const prior=$('unit').value;choices($('unit'),units,prior);
  choices($('spaceUnit'),units,selected?.unit_id);
  $('unknowns').replaceChildren();for(const text of plan.unknowns)$('unknowns').append(el('li',text));$('unknownCard').hidden=!plan.unknowns.length;
  renderSpaces();buttons();
}
function renderSpaces() {
  if(!state?.plan)return;
  const spaces=state.plan.spaces.filter(s=>s.unit_id===$('unit').value);
  $('stats').textContent=`${spaces.length} فضا در محدوده انتخابی · مساحت درج‌شده: ${state.plan.area_m2??'نامشخص'}${state.plan.area_m2!==null?' مترمربع':''} (${({floor:'کل طبقه',unit:'واحد درج‌شده در نقشه',unknown:'محدوده نامشخص'})[state.plan.area_scope]})`;
  $('spaces').replaceChildren();$('overlay').replaceChildren();
  for(const s of spaces) {
    const button=el('button',s.name+(s.certainty==='uncertain'?' · نیازمند بررسی':''),'spaceRow'+(selected?.id===s.id?' active':''));button.type='button';button.onclick=()=>selectSpace(s);$('spaces').append(button);
    const box=el('button',s.name,'roomBox'+(s.certainty==='uncertain'?' uncertain':'')+(s.unit_id==='shared'?' shared':'')+(selected?.id===s.id?' selected':''));box.type='button';box.title=s.name;box.setAttribute('aria-label',`انتخاب ${s.name}`);
    box.dataset.spaceId=s.id;
    if(selected?.id===s.id){const handle=el('span',undefined,'resizeHandle');handle.setAttribute('aria-hidden','true');box.append(handle);}
    Object.assign(box.style,{left:`${s.box.x*100}%`,top:`${s.box.y*100}%`,width:`${s.box.width*100}%`,height:`${s.box.height*100}%`});
    box.onclick=()=>selectSpace(s);$('overlay').append(box);
  }
  $('editor').hidden=!selected;buttons();
}
function selectSpace(s) {
  if(busy)return;
  if(editorDirty){msg('ابتدا اصلاح فضای فعلی را اعمال کن.',true);return;}
  editorDirty=false;selected=s;$('spaceName').value=s.name;$('spaceKind').value=s.kind;$('spaceUnit').value=s.unit_id;
  for(const [id,key] of [['boxX','x'],['boxY','y'],['boxW','width'],['boxH','height']])$(id).value=s.box[key];
  renderSpaces();
}
for(const [key,name]of Object.entries(kinds))option($('spaceKind'),key,name);
$('unit').onchange=()=>{if(editorDirty&&selected){$('unit').value=selected.unit_id;msg('ابتدا اصلاح فضای فعلی را اعمال کن.',true);return;}selected=null;proposal=null;$('results').hidden=true;renderSpaces();};
$('editor').oninput=()=>{editorDirty=true;buttons();};
$('cloud').onchange=buttons;$('reviewCheck').onchange=buttons;
$('sample').onclick=()=>work('در حال بازکردن نمونه…',async()=>{acceptSession(await request('/api/sample'));msg('نمونه دستی باز شد. نام فضاها و کادرهای تقریبی را بازبینی کن.');});
$('importPlan').onclick=()=>work('در حال ورود بازبینی ذخیره‌شده…',async()=>{
  const file=$('savedPlan').files[0];if(!file)throw Error('فایل JSON بازبینی را انتخاب کن.');
  if(file.size>2*1024*1024)throw Error('حجم فایل بازبینی نباید بیشتر از ۲ مگابایت باشد.');
  let saved;try{saved=JSON.parse(await file.text());}catch{throw Error('فایل JSON معتبر نیست.');}
  const result=await request('/api/import',payload({saved}));acceptSession(result);msg('بازبینی وارد شد؛ پیش از پیشنهاد، دوباره پلان را بررسی و تأیید کن.');
});
$('upload').onclick=()=>work('در حال آماده‌سازی صفحه پلان…',async()=>{
  const file=$('file').files[0];if(!file)throw Error('یک فایل انتخاب کن.');if(file.size>30*1024*1024)throw Error('حجم فایل بیش از ۳۰ مگابایت است.');
  const page=Number($('page').value);if(!Number.isInteger(page)||page<1)throw Error('شماره صفحه معتبر نیست.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('فایل خوانده نشد.'));reader.readAsDataURL(file);});
  const extension='.'+file.name.split('.').pop().toLowerCase();acceptSession(await request('/api/upload',{data,extension,page}));msg(apiReady?'پلان بارگذاری شد؛ استخراج فضاها را اجرا کن.':'پلان بارگذاری شد؛ برای تحلیل خودکار، کلید و مدل را روی سرور تنظیم کن.');
});
$('extract').onclick=()=>work('مدل در حال بررسی پلان است؛ ممکن است چند دقیقه طول بکشد…',async()=>{acceptSession(await request('/api/extract',payload({allow_cloud:$('cloud').checked})));msg('استخراج انجام شد؛ برداشت مدل را روی نقشه بررسی و اصلاح کن.');});
$('editor').onsubmit=event=>{
  event.preventDefault();if(!selected||busy)return;
  const box={x:Number($('boxX').value),y:Number($('boxY').value),width:Number($('boxW').value),height:Number($('boxH').value)};
  if(!Object.values(box).every(Number.isFinite)||box.x<0||box.y<0||box.width<=0||box.height<=0||box.x+box.width>1||box.y+box.height>1){msg('کادر باید داخل صفحه باشد و عرض و ارتفاع مثبت داشته باشد.',true);return;}
  const name=$('spaceName').value.trim();if(!name){msg('نام فضا را وارد کن.',true);return;}
  window.planEditor?.capture();
  Object.assign(selected,{name,kind:$('spaceKind').value,unit_id:$('spaceUnit').value,box,certainty:'uncertain',evidence:'اصلاح کاربر؛ نیازمند تأیید نهایی پلان.'});
  editorDirty=false;const moved=selected.unit_id!==$('unit').value;if(moved)selected=null;invalidate();renderSpaces();msg('اصلاح اعمال شد؛ برای استفاده در پیشنهاد، پلان را ذخیره و تأیید کن.');
};
$('addSpace').onclick=()=>{
  if(busy||!state?.plan)return;if(editorDirty){msg('ابتدا اصلاح فضای فعلی را اعمال کن.',true);return;}const space={id:'user-'+crypto.randomUUID(),unit_id:$('unit').value,name:'فضای جدید',kind:'other',evidence:'افزوده‌شده توسط کاربر؛ نیازمند تأیید.',certainty:'uncertain',box:{x:.3,y:.3,width:.1,height:.1}};
  window.planEditor?.capture();state.plan.spaces.push(space);invalidate();selectSpace(space);msg('نام، نوع و کادر فضای جدید را تنظیم کن.');
};
$('deleteSpace').onclick=()=>{if(!selected||busy)return;window.planEditor?.capture();state.plan.spaces=state.plan.spaces.filter(s=>s.id!==selected.id);selected=null;editorDirty=false;invalidate();renderSpaces();msg('فضا از نسخه قابل ویرایش حذف شد؛ برای ثبت، پلان را تأیید کن.');};
$('review').onclick=()=>work('در حال ذخیره بازبینی…',async()=>{
  const oldUnit=$('unit').value;const result=await request('/api/review',payload({plan:state.plan}));state=result;selected=null;$('reviewCheck').checked=true;render();$('unit').value=oldUnit;renderSpaces();msg('پلان بازبینی‌شده ذخیره شد؛ نیازهای ساختمان را مشخص کن.');
});
function boolValue(id){return $(id).value===''?null:$(id).value==='yes';}
$('propose').onclick=()=>work('در حال تهیه پیشنهادهای مخصوص محدوده انتخابی…',async()=>{
  const brief={building_stage:$('buildingStage').value||null,hvac:$('hvac').value.trim()||null,budget:$('budget').value.trim()||null,rewiring_possible:boolValue('rewiring'),local_control_required:boolValue('local'),priority:$('priority').value,notes:$('notes').value.trim()||null};
  proposal=await request('/api/propose',payload({unit:$('unit').value,brief,allow_cloud:$('cloud').checked}));renderProposal();msg('پیشنهاد اولیه آماده شد؛ پیش‌نیازها و سؤال‌های تکمیلی را بررسی کن.');$('results').scrollIntoView({behavior:'smooth'});
});
function renderProposal() {
  const p=proposal.proposal;$('results').hidden=false;$('summary').textContent=p.summary;
  for(const id of ['packages','features','scenarios','questions'])$(id).replaceChildren();
  for(const pack of p.packages){const card=el('div',undefined,'resultCard');card.append(el('h3',pack.name));list(card,pack.feature_ids.map(id=>p.features.find(f=>f.id===id)?.title||id));list(card,pack.tradeoffs);$('packages').append(card);}
  for(const f of p.features){const card=el('div',undefined,'resultCard');const space=state.plan.spaces.find(s=>s.id===f.space_id);card.append(el('h3',`${space?.name||f.space_id} · ${f.title}`),el('span',f.status==='conditional'?'مشروط به پیش‌نیازها':'نیازمند بررسی محل','statusLabel'),el('p',f.benefit));card.append(el('strong','تجهیزات پیشنهادی'));list(card,f.equipment_categories);card.append(el('strong','پیش‌نیازها'));list(card,f.prerequisites);const show=el('button','نمایش فضا روی پلان','secondary');show.onclick=()=>{if(space){selectSpace(space);$('viewport').scrollIntoView({behavior:'smooth'});}};card.append(show);$('features').append(card);}
  for(const s of p.scenarios){const card=el('div',undefined,'resultCard');card.append(el('h3',s.title),el('p',`شروع: ${s.trigger}`));list(card,s.actions.map(a=>`${p.features.find(f=>f.id===a.feature_id)?.title||a.feature_id}: ${a.instruction}`));card.append(el('strong','پیش‌نیازهای سناریو'));list(card,s.prerequisites);$('scenarios').append(card);}
  list($('questions'),p.questions);list($('questions'),p.limitations);
}
function download(name, value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('exportPlan').onclick=()=>download('reviewed-plan.json',{origin:state.origin,reviewed:state.reviewed,image_sha256:state.image_sha256,plan:state.plan});
$('exportProposal').onclick=()=>{if(proposal)download('smart-home-proposal.json',proposal);};
const briefIds=['buildingStage','hvac','budget','rewiring','local','priority','notes'];
$('saveProject').onclick=()=>{
  if(!state?.plan||editorDirty||busy)return;
  const brief=Object.fromEntries(briefIds.map(id=>[id,$(id).value]));
  download('smart-home-project.json',{format:'smart-home-project-v1',image:state.image,
    image_sha256:state.image_sha256,plan:state.plan,unit:$('unit').value,brief});
  msg('پروژه شامل تصویر، فضاها و نیازسنجی دانلود شد؛ پیشنهاد را جداگانه دانلود کن.');
};
$('openProject').onclick=()=>work('در حال بازکردن پروژه…',async()=>{
  const file=$('projectFile').files[0];if(!file)throw Error('فایل پروژه را انتخاب کن.');
  if(file.size>40*1024*1024)throw Error('فایل پروژه بیش از ۴۰ مگابایت است.');
  let project;try{project=JSON.parse(await file.text());}catch{throw Error('فایل پروژه JSON معتبر نیست.');}
  const result=await request('/api/open-project',{project});acceptSession(result);
  for(const id of briefIds)$(id).value=result.brief[id]??(id==='priority'?'آسایش و امنیت':'');
  $('unit').value=result.unit;renderSpaces();msg('پروژه باز شد؛ پیش از تولید پیشنهاد، پلان را دوباره تأیید کن.');
});
$('zoomIn').onclick=()=>{zoom=Math.min(3,zoom+.25);$('planStage').style.width=`${zoom*100}%`;};
$('zoomOut').onclick=()=>{zoom=Math.max(.75,zoom-.25);$('planStage').style.width=`${zoom*100}%`;};
fetch('/api/config').then(r=>{if(!r.ok)throw Error('اتصال برقرار نشد.');return r.json();}).then(config=>{token=config.token;apiReady=config.api_ready;$('apiBadge').textContent=apiReady?`${config.provider} · ${config.model} · آماده اتصال`:'حالت نمونه · API تنظیم نشده';if(config.config_error)msg(config.config_error,true);buttons();}).catch(e=>{msg(e.message,true);buttons();});
buttons();
