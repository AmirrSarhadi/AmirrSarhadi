import type {MetadataRoute} from "next";
import {siteUrl} from "@/lib/seo";
const routes=["","/about","/staff","/honors","/gallery","/news","/faq","/contact","/admissions","/privacy"];
export const revalidate=300;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=siteUrl;
 const entries:MetadataRoute.Sitemap=routes.map((path,index)=>({url:base+path,changeFrequency:index===0?"weekly":"monthly",priority:index===0?1:path==="/admissions"?0.9:0.7}));
 const backend=(process.env.BACKEND_URL||"http://127.0.0.1:8000").replace(/\/$/,"");
 try{
  for(let page=1;;page++){
   const response=await fetch(`${backend}/api/v1/news/?page=${page}&page_size=100`,{next:{revalidate:300},signal:AbortSignal.timeout(5000)});
   if(!response.ok)break;
   const data=await response.json();
   if(!Array.isArray(data.records))break;
   for(const item of data.records){if(Number.isInteger(item.id)&&item.id>0)entries.push({url:`${base}/news/${item.id}`,changeFrequency:"monthly",priority:0.6})}
   if(!data.records.length||!Number.isInteger(data.pages)||page>=data.pages)break;
  }
 }catch{/* Public pages remain discoverable while the news service is unavailable. */}
 return entries;
}
