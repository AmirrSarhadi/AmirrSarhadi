"use client";

import {useCallback,useEffect,useId,useMemo,useRef,useState} from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {ArrowLeft,ArrowRight,ArrowUpLeft,ImageOff,Pause,Play,RefreshCw} from "lucide-react";
import {api,fa} from "@/lib/api";
import {safePublicImage} from "@/lib/homepage";
import {usePublicMotion} from "@/components/public-experience";
import {CoverflowCarousel} from "@/components/ui/coverflow-carousel";
import "@/app/public-photo-slider.css";

type GalleryPhoto={id:number;title:string;subtitle:string;image_url:string|null;image_alt:string};
type Slide={id:string;title:string;caption:string;image:string;alt:string;illustrated:boolean};
const illustrations:Slide[]=[
 {id:"learning",title:"از یک پرسش، تا یک دنیای تازه",caption:"شوق یادگیری",image:"/school-learning-scene.webp",alt:"تصویرسازی کتاب و مداد کنار تخته کلاس",illustrated:true},
 {id:"science",title:"جایی برای کشف و تجربه",caption:"دنیای علم",image:"/school-science-scene.webp",alt:"تصویرسازی ابزارهای علمی و آزمایشگاه",illustrated:true},
 {id:"reading",title:"هر کتاب، یک پنجره تازه",caption:"دنیای کتاب‌ها",image:"/school-reading-scene.webp",alt:"تصویرسازی کتابخانه و فضای مطالعه",illustrated:true},
];

export function PublicPhotoSlider(){
 const id=useId(),root=useRef<HTMLElement>(null);
 const {paused}=usePublicMotion();
 const [slides,setSlides]=useState<Slide[]>(illustrations),[selected,setSelected]=useState(0),[enabled,setEnabled]=useState(true);
 const displaySlides=useMemo(()=>slides.length>1&&slides.length<5?Array.from({length:Math.ceil(6/slides.length)},()=>slides).flat():slides,[slides]);
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(false),[blocked,setBlocked]=useState(true),[failed,setFailed]=useState(false);
 const [broken,setBroken]=useState<Set<string>>(()=>new Set());
 const plugin=useRef(Autoplay({delay:6500,playOnInit:false,stopOnInteraction:false,stopOnMouseEnter:false,stopOnFocusIn:false}));
 const plugins=useMemo(()=>[plugin.current],[]);
 const [viewport,embla]=useEmblaCarousel({loop:slides.length>1,direction:"rtl",align:"center",duration:reduced?0:35},plugins);
 const load=useCallback(async()=>{
  setFailed(false);
  try{
   const photos=await api<GalleryPhoto[]>("/public/items/?category=gallery&preview=1");
   const published=photos.filter(photo=>safePublicImage(photo.image_url)).slice(0,12).map(photo=>({id:String(photo.id),title:photo.title,caption:photo.subtitle||"از روزهای مدرسه نمونه",image:safePublicImage(photo.image_url),alt:photo.image_alt||photo.title,illustrated:false}));
   setSlides(published.length?published:illustrations);setBroken(new Set());
  }catch{setFailed(true)}
 },[]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");let visible=false;
  const update=()=>{setReduced(preference.matches);setBlocked(!visible||preference.matches||document.hidden)};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()},{threshold:.15});
  if(root.current)observer.observe(root.current);
  preference.addEventListener("change",update);document.addEventListener("visibilitychange",update);update();
  return()=>{observer.disconnect();preference.removeEventListener("change",update);document.removeEventListener("visibilitychange",update)};
 },[]);
 useEffect(()=>{
  if(!embla)return;
  const update=()=>setSelected(embla.selectedScrollSnap());const interact=()=>{plugin.current.stop();setEnabled(false)};
  embla.on("select",update).on("reInit",update).on("pointerDown",interact);update();
  return()=>{embla.off("select",update).off("reInit",update).off("pointerDown",interact)};
 },[embla]);
 const playing=Boolean(embla)&&slides.length>1&&enabled&&!paused&&!blocked&&!hovered&&!focused;
 useEffect(()=>{
  if(!embla)return;
  const sync=()=>{if(playing)plugin.current.play();else plugin.current.stop()};
  sync();embla.on("reInit",sync);
  return()=>{embla.off("reInit",sync);plugin.current.stop()};
 },[embla,playing]);
 function navigate(index:number){plugin.current.stop();setEnabled(false);embla?.scrollTo(index)}
 function move(direction:number){plugin.current.stop();setEnabled(false);if(direction>0)embla?.scrollNext();else embla?.scrollPrev()}
 const active=selected%slides.length;
 return <section className="public-photo-slider" ref={root} data-playing={playing} aria-labelledby={`${id}-title`} aria-roledescription="اسلایدر" onMouseEnter={()=>{plugin.current.stop();setHovered(true)}} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>{plugin.current.stop();setFocused(true)}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false)}} onKeyDown={event=>{if(event.key==="ArrowLeft"){event.preventDefault();move(1)}if(event.key==="ArrowRight"){event.preventDefault();move(-1)}}}>
  <div className="container slider-heading" data-public-reveal><div><span className="eyebrow"> قاب مدرسه</span><h2 id={`${id}-title`}>هر تصویر، یک داستان</h2></div><Link className="text-link" href="/gallery">همه تصویرها <ArrowUpLeft size={18}/></Link></div>
  <CoverflowCarousel api={embla} viewportRef={viewport} id={`${id}-viewport`}>{displaySlides.map((slide,index)=><figure className={`photo-slide${selected===index?" is-selected":""}`} key={`${slide.id}-${index}`} data-clone={index>=slides.length?"true":undefined} role="group" aria-roledescription="تصویر" aria-hidden={selected!==index} aria-label={`${fa(index%slides.length+1)} از ${fa(slides.length)}`}>
   <div className="photo-slide-media">{broken.has(slide.id)?<div className="photo-unavailable"><ImageOff size={38}/><span>تصویر در دسترس نیست</span></div>:<img src={slide.image} alt={slide.alt} width="1536" height="1024" loading="lazy" draggable={false} onError={()=>setBroken(current=>new Set(current).add(slide.id))}/>}</div>
   <figcaption><div><span>{slide.caption}</span><h3>{slide.title}</h3></div><span className="photo-index" aria-hidden="true">{fa(index%slides.length+1).padStart(2,"۰")}</span></figcaption>
  </figure>)}</CoverflowCarousel>
  <div className="container slider-controls"><div className="slider-arrows"><button type="button" aria-label="تصویر قبلی اسلایدر" title="تصویر قبلی" aria-controls={`${id}-viewport`} disabled={slides.length<2} onClick={()=>move(-1)}><ArrowRight size={20}/></button><button type="button" aria-label="تصویر بعدی اسلایدر" title="تصویر بعدی" aria-controls={`${id}-viewport`} disabled={slides.length<2} onClick={()=>move(1)}><ArrowLeft size={20}/></button><button className="slider-play" type="button" aria-label={enabled?"توقف پخش خودکار اسلایدر":"شروع پخش خودکار اسلایدر"} title={paused||reduced?"حرکت‌ها متوقف شده‌اند":enabled?"توقف پخش خودکار":"شروع پخش خودکار"} aria-pressed={enabled} disabled={paused||reduced||slides.length<2} onClick={()=>setEnabled(current=>!current)}>{enabled?<Pause size={17}/>:<Play size={17}/>}</button></div>
   <div className="slider-selectors" aria-label="انتخاب تصویر">{slides.map((slide,index)=><button key={slide.id} type="button" className={index===active?"slider-dot is-active":"slider-dot"} aria-label={`نمایش تصویر ${fa(index+1)}`} aria-current={index===active?"true":undefined} onClick={()=>navigate(index)}><span/></button>)}</div>
   <span className="slider-count" aria-live={playing?"off":"polite"}>{fa(active+1)} <span>از {fa(slides.length)}</span></span>{failed&&<button type="button" className="slider-retry" title="تلاش دوباره برای دریافت تصاویر" aria-label="تلاش دوباره برای دریافت تصاویر" onClick={load}><RefreshCw size={17}/></button>}
  </div>
 </section>;
}
