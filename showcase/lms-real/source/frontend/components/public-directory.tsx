"use client";
import {useEffect,useRef,useState} from "react";
import {Award,Camera,ChevronLeft,ChevronRight,Microscope,RefreshCw,Search,Users,X} from "lucide-react";
import {api,fa} from "@/lib/api";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";

export type PublicCategory="staff"|"honor"|"gallery"|"facility";
type Item={id:number;title:string;subtitle:string;body:string;image_alt:string;image_url:string|null};
type Content={title:string;body:string};
const categoryIcons={staff:Users,honor:Award,gallery:Camera,facility:Microscope};

export function PublicDirectory({category,contentKey,fallbackTitle,kicker}:{category:PublicCategory;contentKey:string;fallbackTitle:string;kicker:string}){
 const [content,setContent]=useState<Record<string,Content>>({}),[contentError,setContentError]=useState("");
 const [query,setQuery]=useState(""),[search,setSearch]=useState({q:"",page:1}),[retry,setRetry]=useState(0),[selected,setSelected]=useState<number|null>(null);
 const [result,setResult]=useState<{scope:string;key:string;items:Item[];pages:number;count:number;page:number}|null>(null),[failure,setFailure]=useState<{key:string;message:string}|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement|null>(null),searchInput=useRef<HTMLInputElement>(null);
 const scope=JSON.stringify([category,search.q]),key=JSON.stringify([scope,search.page,retry]);
 const items=result?.scope===scope?result.items:[],error=failure?.key===key?failure.message:"",loading=result?.key!==key&&!error;
 const Icon=categoryIcons[category];
 useEffect(()=>{let live=true;setContentError("");api<Record<string,Content>>("/public/").then(value=>{if(live)setContent(value)}).catch(e=>{if(live)setContentError((e as Error).message)});return()=>{live=false}},[category,retry]);
 useEffect(()=>{
  let live=true;
  const params=new URLSearchParams({category});
  if(retry)params.set("_refresh",String(retry));
  if(search.q)params.set("q",search.q);
  if(category==="gallery")params.set("page",String(search.page));
  api<Item[]|{records:Item[];count:number;pages:number}>(`/public/items/?${params}`).then(value=>{
   if(!live)return;
   const data=Array.isArray(value)?{records:value,count:value.length,pages:1}:value;
   if(search.page>data.pages){setResult(null);setSearch(current=>({...current,page:1}));return}
   setFailure(null);
   setResult(previous=>{
    const records=category==="gallery"&&search.page>1&&previous?.scope===scope?[...previous.items,...data.records]:data.records;
    return {scope,key,items:[...new Map(records.map(item=>[item.id,item])).values()],pages:data.pages,count:data.count,page:search.page};
   });
  }).catch(e=>{if(live)setFailure({key,message:(e as Error).message})});
  return()=>{live=false};
 },[category,key]);
 const intro=content[contentKey],photos=items.filter(item=>item.image_url),selectedItem=photos.find(item=>item.id===selected);
 function searchFor(q:string){close();setSearch({q:q.trim(),page:1});setRetry(value=>value+1);searchInput.current?.focus()}
 useEffect(()=>{
  if(!selectedItem)return;
  const element=dialog.current;
  if(element&&!element.open)element.showModal();
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{document.body.style.overflow=previous;};
 },[selectedItem]);
 function close(){dialog.current?.close();setSelected(null);if(opener.current?.isConnected)opener.current.focus();else searchInput.current?.focus()}
 function move(step:number){if(photos.length)setSelected(current=>photos[(photos.findIndex(item=>item.id===current)+step+photos.length)%photos.length].id)}
 return <PublicShell><PublicPageIntro title={intro?.title||fallbackTitle} kicker={kicker}><p>{intro?.body||"روایت‌هایی از آدم‌ها، فضاها و روزهای مدرسه؛ آنچه مدرسه نمونه را می‌سازد."}</p></PublicPageIntro>
  <div id="public-page-content" className="container public-page-content">
   <div className="public-section-heading" data-public-reveal><h2>{fallbackTitle}</h2>{!loading&&!error&&<span>{fa(result?.scope===scope?result.count:0)} مورد منتشرشده</span>}</div>
   <form role="search" className="toolbar" onSubmit={event=>{event.preventDefault();searchFor(query)}}>
    <label>جست‌وجو در {fallbackTitle}<input ref={searchInput} type="search" aria-label="جست‌وجوی آیتم‌های عمومی" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)}/></label>
    {query&&<button className="icon-button" type="button" aria-label="پاک کردن جست‌وجو" title="پاک کردن جست‌وجو" onClick={()=>{setQuery("");searchFor("")}}><X size={17}/></button>}
    <button className="button" type="submit"><Search size={17}/>جست‌وجو</button>
   </form>
   {(error||contentError)&&<div className="error" role="alert"><p>{error||contentError}</p><button className="text-link" type="button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={16}/>تلاش دوباره</button></div>}
   {loading&&<p className="public-load-state" role="status">در حال دریافت اطلاعات…</p>}
   {!loading&&!error&&!items.length&&<section className="empty-editorial" data-public-reveal><span><Icon size={30}/></span><div><h2>{search.q?"موردی پیدا نشد.":"این بخش در حال تکمیل است"}</h2>{!search.q&&<p>آیتم‌های منتشرشده مدرسه به‌زودی اینجا قرار می‌گیرند.</p>}</div></section>}
   {items.length>0&&
   <section className={`public-items directory-${category}${category==="gallery"?" gallery-grid":""}`} aria-label={fallbackTitle}>{items.map(item=><article className="public-item-card" key={item.id} data-public-reveal>
    {category!=="staff"&&(item.image_url?(category==="gallery"?<button className="gallery-open" onClick={event=>{opener.current=event.currentTarget;setSelected(item.id)}} aria-label={`نمایش بزرگ ${item.title}`}><img src={item.image_url} alt={item.image_alt||item.title} loading="lazy" width="640" height="480"/></button>:<img src={item.image_url} alt={item.image_alt||item.title} loading="lazy" width="640" height="480"/>):<div className="public-item-placeholder"><Icon size={40} strokeWidth={1.3}/></div>)}
    <div>{category!=="staff"&&item.subtitle&&<span className="badge">{item.subtitle}</span>}<h2>{item.title}</h2>{category!=="staff"&&item.body&&<p>{item.body}</p>}</div>
   </article>)}</section>}
   {category==="gallery"&&result?.scope===scope&&result.page<result.pages&&<button type="button" className="button outline" disabled={loading||!!error} onClick={()=>setSearch(current=>({...current,page:current.page+1}))}>نمایش بیشتر</button>}
  </div>
  {selectedItem&&<dialog ref={dialog} className="gallery-dialog" aria-label={selectedItem.title} onCancel={event=>{event.preventDefault();close()}} onKeyDown={event=>{if(event.key==="Tab"){const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}if(event.key==="ArrowLeft"){event.preventDefault();move(1)}if(event.key==="ArrowRight"){event.preventDefault();move(-1)}}} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close()}}}>
   <div className="gallery-dialog-card"><button className="gallery-close icon-button" aria-label="بستن تصویر" title="بستن تصویر" autoFocus onClick={close}><X/></button><img src={selectedItem.image_url!} alt={selectedItem.image_alt||selectedItem.title}/><div><h2>{selectedItem.title}</h2>{selectedItem.body&&<p>{selectedItem.body}</p>}</div>{photos.length>1&&<><button className="gallery-next icon-button" aria-label="تصویر بعدی" title="تصویر بعدی" onClick={()=>move(1)}><ChevronLeft/></button><button className="gallery-prev icon-button" aria-label="تصویر قبلی" title="تصویر قبلی" onClick={()=>move(-1)}><ChevronRight/></button></>}</div>
  </dialog>}
 </PublicShell>;
}

export function PublicTextPage({contentKey,fallbackTitle,kicker}:{contentKey:string;fallbackTitle:string;kicker:string}){
 const [content,setContent]=useState<Record<string,Content>>({}),[error,setError]=useState("");
 useEffect(()=>{api<Record<string,Content>>("/public/").then(setContent).catch(()=>setError("دریافت محتوای صفحه ممکن نشد."))},[]);
 const item=content[contentKey];
 return <PublicShell><PublicPageIntro title={item?.title||fallbackTitle} kicker={kicker}/><div id="public-page-content" className="container public-page-content"><article className="public-text-body" data-public-reveal>{error?<div className="error" role="alert">{error}</div>:<p>{item?.body||"اطلاعات این بخش به‌زودی توسط مدرسه تکمیل می‌شود."}</p>}</article></div></PublicShell>;
}
