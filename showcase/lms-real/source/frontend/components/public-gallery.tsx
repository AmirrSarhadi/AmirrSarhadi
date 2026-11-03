"use client";
import {withPageSize} from "@/lib/pagination";
import {useEffect,useRef,useState} from "react";
import dynamic from "next/dynamic";
import {ArrowUpLeft,Camera,Images,RefreshCw,Search,X} from "lucide-react";
import {api,fa} from "@/lib/api";
import {Pagination} from "@/components/ui/pagination";
import {PencilLoader} from "@/components/ui/loader-1";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";
import type {GalleryPhoto} from "@/components/ui/thumbnail-carousel";
import "@/app/gallery-albums.css";

const ThumbnailCarousel=dynamic(()=>import("@/components/ui/thumbnail-carousel").then(module=>module.ThumbnailCarousel),{loading:()=> <PencilLoader/>});
type Album={key:string;title:string;photo_count:number;image_url:string};
type AlbumPage={records:Album[];count:number;pages:number;page:number};
type PhotoPage={records:GalleryPhoto[];count:number;pages:number;page:number};

export function PublicGallery(){
 const [pageSize,setPageSize]=useState(12);

 const [query,setQuery]=useState(""),[filters,setFilters]=useState({q:"",page:1}),[retry,setRetry]=useState(0);
 const [data,setData]=useState<AlbumPage|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[selected,setSelected]=useState<Album|null>(null);
 const [intro,setIntro]=useState<{title?:string;body?:string}>({});
 const opener=useRef<HTMLButtonElement|null>(null),search=useRef<HTMLInputElement>(null);
 useEffect(()=>{let live=true;api<Record<string,{title:string;body:string}>>(withPageSize("/public/",pageSize)).then(value=>{if(live)setIntro(value.gallery||{})}).catch(()=>{});return()=>{live=false}},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");const params=new URLSearchParams({q:filters.q,page:String(filters.page)});if(retry)params.set("_refresh",String(retry));api<AlbumPage>(withPageSize("/public/gallery/albums/?"+params,pageSize),{signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;setData(result);if(result.page!==filters.page)setFilters(value=>({...value,page:result.page}))}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[filters,retry,pageSize]);
 function find(q:string){setFilters({q:q.trim(),page:1});setRetry(value=>value+1)}
 function close(){setSelected(null);requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();else search.current?.focus()})}
 return <PublicShell><PublicPageIntro title={intro.title||"گالری مدرسه نمونه"} kicker="روایت روزهای مدرسه"><p>{intro.body||"هر رویداد، یک آلبوم؛ لحظه‌هایی از ایام در مدرسه نمونه."}</p></PublicPageIntro>
  <div id="public-page-content" className="container public-page-content gallery-albums">
   <div className="public-section-heading" data-public-reveal><h2>آلبوم رویدادها</h2>{!loading&&!error&&<span>{fa(data?.count||0)} آلبوم</span>}</div>
   <form role="search" className="toolbar" onSubmit={event=>{event.preventDefault();find(query)}}><label>جست‌وجو در آلبوم‌ها<input ref={search} type="search" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)}/></label>{query&&<button type="button" className="icon-button" aria-label="پاک کردن جست‌وجو" title="پاک کردن جست‌وجو" onClick={()=>{setQuery("");find("");search.current?.focus()}}><X size={18}/></button>}<button className="button"><Search size={17}/>جست‌وجو</button></form>
   {error&&<div className="error" role="alert">{error}<button className="text-link" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={16}/>تلاش دوباره</button></div>}
   {loading?<PencilLoader label="در حال دریافت آلبوم‌ها…"/>:!error&&!data?.records.length?<div className="empty-editorial"><Camera/><h2>{filters.q?"آلبومی پیدا نشد.":"آلبومی هنوز منتشر نشده است."}</h2></div>:!error&&<section className="album-grid" aria-label="آلبوم رویدادها">{data?.records.map((album,index)=><article className="album-item" key={album.key} data-public-reveal><button className="album-open" aria-label={`مشاهده آلبوم ${album.title}`} onClick={event=>{opener.current=event.currentTarget;setSelected(album)}}><span className="album-cover"><img src={album.image_url} alt={album.title} loading={index<3?"eager":"lazy"} width="640" height="480"/><span className="album-photo-count"><Images size={15}/>{fa(album.photo_count)} تصویر</span></span><span className="album-info"><span><small>ایام در مدرسه نمونه</small><strong>{album.title}</strong></span><span className="album-enter"><ArrowUpLeft size={22}/></span></span></button></article>)}</section>}
   {data&&<Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setFilters(current=>({...current,page:1}));}} page={filters.page} pages={data.pages} count={data.count} busy={loading||!!error} onChange={page=>setFilters(value=>({...value,page}))} label="صفحه‌بندی آلبوم‌ها"/>}
  </div>{selected&&<AlbumDialog key={selected.key} album={selected} onClose={close}/>}
 </PublicShell>;
}

function AlbumDialog({album,onClose}:{album:Album;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),version=useRef(0),pending=useRef(false),pageNumber=useRef(0),abort=useRef<AbortController|null>(null);
 const [photos,setPhotos]=useState<GalleryPhoto[]>([]),[count,setCount]=useState(album.photo_count),[busy,setBusy]=useState(true),[error,setError]=useState("");
 async function load(){if(pending.current)return false;pending.current=true;setBusy(true);setError("");const token=version.current;try{const params=new URLSearchParams({category:"gallery",album:album.key,page:String(pageNumber.current+1)});const result=await api<PhotoPage>("/public/items/?"+params,{signal:abort.current?.signal});if(token!==version.current)return false;setPhotos(previous=>[...new Map([...previous,...result.records].map(photo=>[photo.id,photo])).values()]);setCount(result.count);pageNumber.current=result.page;return true}catch(e){if(token===version.current)setError((e as Error).message);return false}finally{if(token===version.current){pending.current=false;setBusy(false)}}}
 useEffect(()=>{const token=++version.current;abort.current=new AbortController();dialog.current?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow="hidden";queueMicrotask(()=>{if(token===version.current)void load()});return()=>{version.current++;abort.current?.abort();document.body.style.overflow=overflow;pending.current=false}},[]);
 return <dialog ref={dialog} className="album-dialog" aria-label={album.title} onCancel={event=>{event.preventDefault();onClose()}} onKeyDown={event=>{if(event.defaultPrevented)return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();event.currentTarget.querySelector<HTMLButtonElement>(`button[aria-label="${event.key==="ArrowLeft"?"تصویر بعدی":"تصویر قبلی"}"]`)?.click();return}if(event.key!=="Tab")return;const controls=[...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose()}}>
  <header className="album-dialog-heading"><div><small>آلبوم رویداد</small><h2>{album.title}</h2></div><button className="icon-button" autoFocus aria-label="بستن آلبوم" title="بستن آلبوم" onClick={onClose}><X/></button></header>
  {error&&<div className="error" role="alert">{error}<button className="text-link" disabled={busy} onClick={()=>void load()}>تلاش دوباره</button></div>}
  {!photos.length?(busy?<PencilLoader/>:!error&&<p className="empty-state">تصویری در این آلبوم در دسترس نیست.</p>):<ThumbnailCarousel items={photos} total={count} busy={busy} onMore={load}/>}
 </dialog>;
}
