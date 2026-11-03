import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {PublicShell} from "@/components/public-shell";
export default function NotFound(){return <PublicShell><section className="not-found container"><span>۴۰۴</span><h1>این صفحه پیدا نشد</h1><p>نشانی واردشده درست نیست یا صفحه جابه‌جا شده است.</p><Link href="/" className="button">بازگشت به صفحه اصلی <ArrowLeft/></Link></section></PublicShell>}
