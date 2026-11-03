"use client";
import {useEffect,useState} from "react";
import {api,dateFa} from "@/lib/api";
import {PublicShell} from "@/components/public-shell";
import {PublicPageIntro} from "@/components/public-page-intro";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
export function PublicNewsArticle({id}:{id:string}){
 const [data,setData]=useState<{title:string,summary:string,body:string,published_at:string,image_url:string|null,image_alt:string}|null>(null),[error,setError]=useState("");
 useEffect(()=>{let live=true;setData(null);setError("");api("/news/"+id+"/").then(x=>{if(live)setData(x)}).catch(()=>{if(live)setError("خبر در دسترس نیست یا ارتباط برقرار نشد.")});return()=>{live=false}},[id]);
 return <PublicShell><PublicPageIntro title={data?.title||"خبرهای مدرسه"} kicker="خبرهای مدرسه">{data?.summary&&<p>{data.summary}</p>}</PublicPageIntro><div id="public-page-content" className="container public-page-content news-page"><Link className="news-back" href="/news"><ArrowRight size={16}/>بازگشت به خبرهای مدرسه</Link>{error?<p className="error" role="alert">{error}</p>:!data?<p role="status">در حال دریافت خبر…</p>:<article className="news-article" data-public-reveal>{data.image_url&&<img className="news-article-image" src={data.image_url} alt={data.image_alt||data.title} width="1000" height="563"/>}<time dateTime={data.published_at}>{dateFa(data.published_at)}</time><div className="news-body">{data.body}</div></article>}</div></PublicShell>;
}
