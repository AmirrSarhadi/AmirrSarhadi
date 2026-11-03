import Link from "next/link";
export function Brand({light=false}:{light?:boolean}){return <Link href="/" className={"brand "+(light?"light":"")}><span className="logo-box"><img src="/logo.png" alt="نشان مدرسه نمونه"/></span><span><strong>مدرسه نمونه</strong><small>دخترانه · دوره دوم متوسطه نظری · کرمان</small></span></Link>}
