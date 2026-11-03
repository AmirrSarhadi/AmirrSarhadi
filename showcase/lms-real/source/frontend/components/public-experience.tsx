"use client";

import {createContext, useContext, useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";
import "@/app/public-experience.css";

const MotionContext = createContext({paused: false});
export const usePublicMotion = () => useContext(MotionContext);

export function PublicExperience({children, className = ""}: {children: ReactNode; className?: string}) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setPaused(preference.matches);update();
    preference.addEventListener("change",update);
    return()=>preference.removeEventListener("change",update);
  }, []);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    function initialize() {
      stop();
      if (!element || paused || preference.matches || !("IntersectionObserver" in window)) return;
      const observed = new WeakSet<Element>();
      const loops = new WeakSet<Element>();
      let revealIndex = 0;
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, {threshold: 0, rootMargin: "0px 0px -95px"});
      const footerObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add("is-visible");footerObserver.unobserve(entry.target)}
      }),{threshold:0,rootMargin:"0px 0px 120px"});
      const loopObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        entry.target.classList.toggle("is-loop-visible", entry.isIntersecting);
      }));
      function discover() {
        element?.querySelectorAll<HTMLElement>("main section, [data-reveal], [data-public-reveal]").forEach(item => {
          if (observed.has(item) || item.classList.contains("is-visible")) return;
          observed.add(item);
          if (!item.dataset.revealDirection) item.dataset.revealDirection = ["right", "left", "up"][revealIndex++ % 3];
          item.classList.add("public-reveal-pending");
          if(item.closest("footer"))footerObserver.observe(item);else observer.observe(item);
        });
        element?.querySelectorAll("[data-public-loop]").forEach(item => {
          if (loops.has(item)) return;
          loops.add(item); loopObserver.observe(item);
        });
      }
      const mutations = new MutationObserver(records => {
        if (records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) discover();
      });
      mutations.observe(element, {childList: true, subtree: true});
      discover();
      stop = () => {
        mutations.disconnect(); observer.disconnect(); footerObserver.disconnect(); loopObserver.disconnect();
        element.querySelectorAll(".public-reveal-pending").forEach(item => item.classList.remove("public-reveal-pending"));
      };
    }
    initialize(); preference.addEventListener("change", initialize);
    return () => {stop(); preference.removeEventListener("change", initialize);};
  }, [paused]);
  return <MotionContext.Provider value={{paused}}><div ref={root} id="public-top" className={`public-site public-experience ${className}${paused ? " motion-paused" : ""}`}>
    {children}
  </div></MotionContext.Provider>;
}
