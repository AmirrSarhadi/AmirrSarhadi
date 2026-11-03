import type {Metadata} from "next";
import {PublicNewsArticle} from "@/components/public-news-article";
import {publicMetadata} from "@/lib/seo";

type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id}=await params,backend=process.env.BACKEND_URL||"http://127.0.0.1:8000";
 try{
  const response=await fetch(`${backend}/api/v1/news/${encodeURIComponent(id)}/`,{next:{revalidate:300}});
  if(response.status===404||response.status===410)return {title:"خبر در دسترس نیست",robots:{index:false,follow:false}};
  if(!response.ok)throw new Error("News service unavailable");
  const news=await response.json();const metadata=publicMetadata(`/news/${encodeURIComponent(id)}`,news.title,news.summary);return {...metadata,openGraph:{...metadata.openGraph,type:"article",images:news.image_url?[news.image_url]:["/hero.webp"]}};
 }catch{return publicMetadata(`/news/${encodeURIComponent(id)}`,"خبرهای مدرسه","اخبار مدرسه دخترانه مدرسه نمونه کرمان")}
}
export default async function Page({params}:Props){const {id}=await params;return <PublicNewsArticle id={id}/>}
