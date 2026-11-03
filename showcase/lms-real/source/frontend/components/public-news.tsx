"use client";
import {withPageSize} from "@/lib/pagination";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Search} from "lucide-react";
import {Pagination} from "@/components/ui/pagination";
import {api,dateFa} from "@/lib/api";
export function PublicNews({latest=false}:{latest?:boolean}){
 const [pageSize,setPageSize]=useState(12);

 const [data,setData]=useState<{records:{id:number,title:string,summary:string,published_at:string,image_url:string|null,image_alt:string}[],pages:number,count?:number}|null>(null),[page,setPage]=useState(1),[error,setError]=useState("");
 const [draft,setDraft]=useState(""),[query,setQuery]=useState(""),[reload,setReload]=useState(0);
 useEffect(()=>{let live=true;setData(null);setError("");api(withPageSize("/news/?"+new URLSearchParams({page:String(page),q:latest?"":query}),pageSize)).then(x=>{if(live){setData(x);if(page>x.pages)setPage(x.pages)}}).catch(()=>{if(live)setError("دریافت خبرها ممکن نشد.")});return()=>{live=false}},[page,query,latest,reload,pageSize]);
 return <>
 {!latest&&<form className="toolbar" role="search" onSubmit={event=>{event.preventDefault();setPage(1);setQuery(draft.trim());setReload(x=>x+1)}}><label>جستجوی اخبار<input type="search" value={draft} onChange={event=>setDraft(event.target.value)} maxLength={120} placeholder="عنوان یا متن خبر"/></label><button className="button small"><Search size={16}/>جستجو</button>{(query||draft)&&<button type="button" className="button outline small" onClick={()=>{setDraft("");setQuery("");setPage(1)}}>پاک کردن</button>}</form>}
 {error?<div role="alert"><p>{error}</p><button className="button outline small" onClick={()=>setReload(x=>x+1)}>تلاش دوباره</button></div>:!data?<p role="status">در حال دریافت خبرها…</p>:!data.records.length?<div className="empty-editorial" data-public-reveal><p>{query?"خبری با این عبارت پیدا نشد.":"خبرهای مدرسه پس از انتشار اینجا نمایش داده می‌شوند."}</p></div>:<><div className="news-grid">{(latest?data.records.slice(0,3):data.records).map(n=><article className="news-card" key={n.id} data-public-reveal>{n.image_url&&<Link href={"/news/"+n.id} className="news-image"><img src={n.image_url} alt={n.image_alt||n.title} width="640" height="360" loading="lazy"/></Link>}<div className="news-card-body"><time dateTime={n.published_at}>{dateFa(n.published_at)}</time><h3><Link href={"/news/"+n.id}>{n.title}</Link></h3><p>{n.summary}</p><Link className="text-link" href={"/news/"+n.id}>خواندن خبر <ArrowLeft size={16}/></Link></div></article>)}</div>{latest?<Link className="text-link" href="/news">همه خبرهای مدرسه <ArrowLeft size={16}/></Link>:<Pagination pageSize={pageSize} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} page={page} pages={data.pages} count={data.count} onChange={setPage} label="صفحه‌بندی اخبار"/>}</>}
 </>
}
