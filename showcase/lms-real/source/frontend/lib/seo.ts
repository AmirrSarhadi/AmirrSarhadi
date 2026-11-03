import type {Metadata} from "next";

export const siteUrl=(process.env.SITE_URL||"https://fatemie-kerman-sch.ir").replace(/\/+$/,"");
export const schoolName="مدرسه دخترانه مدرسه نمونه کرمان";
export const schoolDescription="وب‌سایت رسمی مدرسه دخترانه مدرسه نمونه کرمان؛ دبیرستان دوره دوم متوسطه نظری، معرفی مدرسه، رشته‌های ریاضی‌فیزیک و علوم تجربی، اخبار، ثبت‌نام و راه‌های تماس.";

export function publicMetadata(path:string,title:string,description:string):Metadata{
 return {title,description,alternates:{canonical:path},openGraph:{type:"website",url:path,locale:"fa_IR",siteName:schoolName,title,description,images:[{url:"/hero.webp",alt:schoolName}]},twitter:{card:"summary_large_image",title,description,images:["/hero.webp"]}};
}
