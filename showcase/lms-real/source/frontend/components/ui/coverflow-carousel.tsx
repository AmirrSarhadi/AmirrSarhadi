"use client";

import {useCallback,useEffect} from "react";
import type {ReactNode,RefCallback} from "react";
import type {UseEmblaCarouselType} from "embla-carousel-react";

type Props={api:UseEmblaCarouselType[1];viewportRef:RefCallback<HTMLDivElement>;id:string;children:ReactNode;rotate?:number;depth?:number;falloff?:number;fade?:number};

// Embla owns touch physics, looping and RTL; this layer only paints the supplied coverflow perspective.
export function CoverflowCarousel({api,viewportRef,id,children,rotate=44,depth=.6,falloff=.56,fade=.1}:Props){
 const paint=useCallback(()=>{
  if(!api)return;
  const engine=api.internalEngine(),progress=api.scrollProgress(),snaps=api.scrollSnapList(),width=api.slideNodes()[0]?.offsetWidth||0;
  api.slideNodes().forEach((slide,index)=>{
   let difference=snaps[index]-progress;
   if(engine.options.loop)engine.slideLooper.loopPoints.forEach(point=>{
    if(point.index!==index)return;
    const target=point.target();
    if(target<0)difference=snaps[index]-(1+progress);
    if(target>0)difference=snaps[index]+(1-progress);
   });
   const offset=difference*snaps.length,distance=Math.abs(offset),ramp=Math.pow(distance,falloff);
   slide.style.setProperty("--cf-tilt",`${Math.min(rotate*ramp,78)*Math.sign(offset)}deg`);
   slide.style.setProperty("--cf-depth",`${-depth*width*ramp}px`);
   slide.style.setProperty("--cf-opacity",String(Math.max(.25,1-fade*distance)));
   slide.style.zIndex=String(100-Math.round(distance*10));
  });
 },[api,rotate,depth,falloff,fade]);
 useEffect(()=>{
  if(!api)return;
  paint();api.on("scroll",paint).on("reInit",paint).on("select",paint);
  return()=>{api.off("scroll",paint).off("reInit",paint).off("select",paint)};
 },[api,paint]);
 return <div className="coverflow-carousel"><div className="photo-slider-viewport" id={id} ref={viewportRef} tabIndex={0} aria-label="تصاویر مدرسه"><div className="photo-slider-track">{children}</div></div></div>;
}
