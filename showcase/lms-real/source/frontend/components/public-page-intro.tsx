import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowLeft, ChevronLeft} from "lucide-react";
import {PublicIntroFilm} from "@/components/public-intro-film";

export function PublicPageIntro({title, kicker, children}: {title: string; kicker: string; children?: ReactNode}) {
  return <section className="public-page-intro" data-public-reveal>
    <div className="page-intro-media"><PublicIntroFilm/></div>
    <div className="container intro-inner"><nav className="public-breadcrumb" aria-label="مسیر صفحه"><Link href="/">صفحه اصلی</Link><ChevronLeft size={14}/><span aria-current="page">{kicker}</span></nav>
      <span className="eyebrow">{kicker}</span><h1>{title}</h1>{children && <div className="intro-description">{children}</div>}
      <a className="intro-scroll" href="#public-page-content" aria-label="رفتن به محتوای صفحه" title="رفتن به محتوای صفحه"><ArrowLeft size={18} aria-hidden="true"/></a>
    </div>
  </section>;
}
