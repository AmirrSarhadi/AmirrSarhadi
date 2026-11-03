"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import useEmblaCarousel from "embla-carousel-react";
import {ChevronLeft,ChevronRight,ImageOff} from "lucide-react";
import {fa} from "@/lib/api";

export type GalleryPhoto={id:number;title:string;body:string;image_alt:string;image_url:string|null};
export function ThumbnailCarousel({items,total,busy,onMore}:{items:GalleryPhoto[];total:number;busy:boolean;onMore:()=>Promise<boolean>}){
 const [viewport,embla]=useEmblaCarousel({direction:"rtl",loop:false,duration:30});
 const [index,setIndex]=useState(0),[failed,setFailed]=useState<Record<number,boolean>>({});
 const thumbnails=useRef<HTMLDivElement>(null),pendingNext=useRef(false);
 const select=useCallback(()=>{if(embla)setIndex(embla.selectedScrollSnap())},[embla]);
 useEffect(()=>{if(!embla)return;select();embla.on("select",select).on("reInit",select);return()=>{embla.off("select",select).off("reInit",select)}},[embla,select]);
 useEffect(()=>{if(!embla)return;const media=matchMedia("(prefers-reduced-motion: reduce)"),update=()=>embla.reInit({duration:media.matches?0:30});update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update)},[embla]);
 useEffect(()=>{if(!embla)return;embla.reInit();if(pendingNext.current&&items.length>index+1){pendingNext.current=false;embla.scrollTo(index+1)}},[items.length,embla]);
 useEffect(()=>{const active=thumbnails.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);if(!active||!thumbnails.current)return;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;const box=active.getBoundingClientRect(),parent=thumbnails.current.getBoundingClientRect();thumbnails.current.scrollBy({left:box.left-parent.left-(parent.width-box.width)/2,behavior:reduced?"instant":"smooth"})},[index]);
 async function next(){if(busy)return;if(index<items.length-1)embla?.scrollNext();else if(items.length<total){pendingNext.current=true;await onMore()}}
 function previous(){pendingNext.current=false;embla?.scrollPrev()}
 function choose(index:number){pendingNext.current=false;embla?.scrollTo(index)}
 return <section className="thumbnail-carousel" aria-label="تصاویر آلبوم" aria-roledescription="اسلایدر" onKeyDown={event=>{if(event.key==="ArrowLeft"){event.preventDefault();void next()}else if(event.key==="ArrowRight"){event.preventDefault();previous()}}}>
  <div className="thumbnail-stage">
   <div ref={viewport} className="thumbnail-viewport" dir="rtl"><div className="thumbnail-track">{items.map((item,i)=><div key={item.id} className="thumbnail-slide" role="group" aria-roledescription="تصویر" aria-label={`${fa(i+1)} از ${fa(total)}`} aria-hidden={i!==index}>{failed[item.id]?<div className="thumbnail-failed"><ImageOff/><span>تصویر در دسترس نیست.</span></div>:<img src={Math.abs(i-index)<=1?item.image_url||undefined:undefined} alt={item.image_alt||item.title} draggable={false} onError={()=>setFailed(value=>({...value,[item.id]:true}))}/>}</div>)}</div></div>
   <button type="button" className="thumbnail-arrow previous" aria-label="تصویر قبلی" title="تصویر قبلی" disabled={index===0||busy} onClick={previous}><ChevronRight/></button>
   <button type="button" className="thumbnail-arrow next" aria-label="تصویر بعدی" title="تصویر بعدی" disabled={busy||index>=total-1} onClick={()=>void next()}><ChevronLeft/></button>
   <span className="thumbnail-counter" aria-live="polite">{fa(index+1)} / {fa(total)}</span>
  </div>
  <div className="thumbnail-caption"><h3>{items[index]?.title}</h3>{items[index]?.body&&<p>{items[index].body}</p>}</div>
  <div ref={thumbnails} className="thumbnail-strip" dir="rtl"><div className="thumbnail-strip-track">{items.map((item,i)=><button type="button" key={item.id} data-index={i} className={i===index?"is-active":""} aria-label={`تصویر ${fa(i+1)}: ${item.title}`} aria-current={i===index?"true":undefined} onClick={()=>choose(i)}><img src={item.image_url?.startsWith("/api/v1/public/items/")?item.image_url+"?size=thumb":item.image_url||undefined} alt="" loading="lazy" draggable={false}/></button>)}{items.length<total&&<button type="button" className="thumbnail-more" disabled={busy} onClick={()=>void onMore()}>بیشتر</button>}</div></div>
 </section>;
}
