"use client";

import {Fragment, useEffect, useRef, useState} from "react";
import type {CSSProperties} from "react";
import {ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, GraduationCap, MoveUpRight, School, Sparkles, Users} from "lucide-react";
import {fa} from "@/lib/api";
import {HOME_HEADLINE, HomepageSettings, persianMonths, schoolDate} from "@/lib/homepage";
import {SCHOOL_TOUR_URL} from "@/lib/public-links";

export function TypedHeadline({delay = 150}: {delay?: number}) {
  let offset = delay;
  return <h1 className="learning-headline" aria-label={HOME_HEADLINE}>
    {HOME_HEADLINE.split(" ").map((word, index) => {
      const duration = Array.from(word).length * 85;
      const style = {"--word-delay": `${offset}ms`, "--word-duration": `${duration}ms`, "--word-steps": Array.from(word).length} as CSSProperties;
      offset += duration;
      return <Fragment key={index}><span className={index > 1 ? "typed-word headline-accent" : "typed-word"} style={style} aria-hidden="true">{word}{" "}</span>{index === 1 && <br aria-hidden="true"/>}</Fragment>;
    })}
  </h1>;
}
export function LearningCharacters() {
  return <div className="learning-characters" aria-hidden="true">
    <div className="chalkboard"><span className="chalk-equation">۲ + ۲ = ۴</span><span className="chalk-stroke"/><span className="chalk-tray"/></div>
    <div className="book-character"><div className="book-page page-right"/><div className="book-page page-left"/><div className="character-eyes"><i/><i/></div><span className="character-smile"/><span className="book-arm"/><span className="book-foot foot-one"/><span className="book-foot foot-two"/></div>
    <div className="pencil-character"><span className="pencil-eraser"/><span className="pencil-eyes"><i/><i/></span><span className="pencil-smile"/><span className="pencil-tip"/></div>
  </div>;
}

function Counter({value, paused}: {value: number; paused: boolean}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const finish = () => { cancelAnimationFrame(frame); element.textContent = fa(value); };
    const start = () => {
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - started) / 1600, 1);
        element.textContent = fa(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    if (paused || media.matches || !("IntersectionObserver" in window)) finish();
    else {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { start(); observer?.disconnect(); }
      }, {threshold: .5});
      observer.observe(element);
    }
    const changed = () => { if (media.matches) { observer?.disconnect(); finish(); } };
    media.addEventListener("change", changed);
    return () => {cancelAnimationFrame(frame); observer?.disconnect(); media.removeEventListener("change", changed);};
  }, [value, paused]);
  return <span className="stat-number" aria-label={fa(value)}><span aria-hidden="true" ref={ref}>{fa(value)}</span></span>;
}

export function SchoolNumbers({stats, paused}: {stats: HomepageSettings["stats"]; paused: boolean}) {
  const icons = [Users, School, BookOpen, GraduationCap, Sparkles];
  if (!stats.length) return null;
  return <section className="school-numbers" aria-labelledby="school-numbers-title" data-reveal>
    <div className="container numbers-inner"><div className="numbers-heading"><span className="eyebrow">مدرسه نمونه در یک نگاه</span><h2 id="school-numbers-title">پشت هر عدد،<br/>یک دنیای یادگیری.</h2></div>
      <dl className="numbers-grid">{stats.map((stat, index) => {const Icon = icons[index % icons.length]; return <div className="school-stat" key={`${index}-${stat.label}`}><Icon size={26} strokeWidth={1.6} aria-hidden="true"/><dt>{stat.label}</dt><dd><Counter value={stat.value} paused={paused}/>{stat.suffix && <span className="stat-suffix">{stat.suffix}</span>}</dd></div>;})}</dl>
    </div>
  </section>;
}

export function VirtualTour({tour}: {tour: HomepageSettings["tour"]}) {
  return <section className="virtual-tour" aria-labelledby="virtual-tour-title" data-reveal>
    <img className="tour-backdrop" src={tour.image || "/temp.webp"} onError={event => {if (event.currentTarget.getAttribute("src") !== "/temp.webp") event.currentTarget.src = "/temp.webp";}} alt="" loading="lazy" width="1536" height="1024"/>
    <div className="tour-shade"/>
    <div className="container tour-content"><span className="eyebrow"><MoveUpRight size={18}/> تور مجازی مدرسه</span><h2 id="virtual-tour-title">{tour.title}</h2><p>{tour.description}</p>
      <a className="button white" href={SCHOOL_TOUR_URL} rel="noopener noreferrer">مشاهده کنید <ArrowLeft size={19}/></a>
    </div>
  </section>;
}

export function SchoolCalendar({events}: {events: HomepageSettings["events"]}) {
  const yearFa = (year: number) => new Intl.NumberFormat("fa-IR", {useGrouping:false}).format(year);
  const [today, setToday] = useState<ReturnType<typeof schoolDate> | null>(null);
  const [month, setMonth] = useState("all");
  const rail = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({start: true, end: false});
  useEffect(() => {setToday(schoolDate());}, []);
  function measure() {
    const element = rail.current;
    if (element) setEdges({start: Math.abs(element.scrollLeft) < 2, end: Math.abs(element.scrollLeft) + element.clientWidth >= element.scrollWidth - 2});
  }
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    element.scrollLeft = 0;
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    measure();
    return () => resize.disconnect();
  }, [month, events]);
  const filtered = events.filter(event => month === "all" || event.month === Number(month));
  const next = today && events.find(event => {
    const year = (event.month >= 7 ? today.academicYear : today.academicYear + 1);
    return year > today.year || (year === today.year && (event.month > today.month || event.month === today.month && event.day >= today.day));
  });
  function move(direction: number) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.current?.scrollBy({left: direction * Math.max(240, rail.current.clientWidth * .75), behavior: reduced ? "instant" : "smooth"});
  }
  return <section className="school-calendar container" aria-labelledby="school-calendar-title" data-reveal>
    <div className="section-heading"><div><span className="eyebrow"><CalendarDays size={17}/> روزهایی که کنار هم می‌سازیم</span><h2 id="school-calendar-title">تقویم رویدادهای سال تحصیلی</h2></div><span className="academic-year">{today ? `${yearFa(today.academicYear)} — ${yearFa(today.academicYear + 1)}` : "سال تحصیلی جاری"}</span></div>
    <div className="calendar-toolbar"><p>مناسبت‌ها و روزهای ویژه در مسیر یک سال یادگیری</p><div><label className="calendar-month">ماه<select value={month} onChange={event => setMonth(event.target.value)} aria-label="ماه رویدادها"><option value="all">همه ماه‌ها</option>{[7,8,9,10,11,12,1,2,3,4,5,6].map(value => <option key={value} value={value}>{persianMonths[value - 1]}</option>)}</select></label><button className="calendar-arrow" type="button" title="رویدادهای قبلی" aria-label="رویدادهای قبلی" disabled={edges.start} onClick={() => move(1)}><ArrowRight size={19}/></button><button className="calendar-arrow" type="button" title="رویدادهای بعدی" aria-label="رویدادهای بعدی" disabled={edges.end} onClick={() => move(-1)}><ArrowLeft size={19}/></button></div></div>
    <ol className="event-timeline" ref={rail} onScroll={measure} tabIndex={0} aria-label="رویدادها به ترتیب سال تحصیلی">{filtered.map((event, index) => <li className={next === event ? "school-event is-next" : "school-event"} key={`${event.month}-${event.day}-${index}`}><div className="event-date"><strong>{fa(event.day)}</strong><span>{persianMonths[event.month - 1]}<small>{today ? yearFa(event.month >= 7 ? today.academicYear : today.academicYear + 1) : ""}</small></span></div><span className="timeline-node" aria-hidden="true"><Clock3 size={18}/></span><article><span className="event-category">{next === event ? "پیش رو" : "تقویم مدرسه"}</span><h3>{event.title}</h3></article></li>)}</ol>
    {!filtered.length && <p className="calendar-empty" role="status">هنوز رویدادی برای این ماه ثبت نشده است.</p>}
  </section>;
}
