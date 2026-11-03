import {ArrowLeft, Building2, CheckCircle2, ShieldCheck, UsersRound} from "lucide-react";

const foundations = [
  {icon: Building2, title: "سازمان‌های مستقل", text: "هر رکورد به سازمان خود متصل است و دسترسی خارج از عضویت فعال رد می‌شود."},
  {icon: ShieldCheck, title: "کنترل دسترسی سرور", text: "مخفی‌کردن دکمه کافی نیست؛ همه مسیرهای API مجوز و سازمان فعال را بررسی می‌کنند."},
  {icon: UsersRound, title: "عضویت و نقش", text: "کاربر می‌تواند عضو چند سازمان باشد و در هر سازمان نقش متفاوتی داشته باشد."},
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="NewCRM صفحه اصلی">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NewCRM</span>
        </a>
        <span className="phase"><span className="dot"/> فاز صفر</span>
      </header>

      <section className="hero" id="main">
        <div className="hero-copy">
          <p className="eyebrow">هسته چندسازمانی CRM</p>
          <h1>رابطه با مشتری، روشن و قابل پیگیری</h1>
          <p className="lead">زیرساخت اولیه برای مدیریت سازمان‌ها، اعضا و مرز دسترسی آماده شده است. توسعه ماژول‌های مشتری، سرنخ و فروش روی همین پایه امن ادامه پیدا می‌کند.</p>
          <div className="actions">
            <a className="button primary" href="/login">ورود به حساب <ArrowLeft size={18}/></a>
            <span className="status"><CheckCircle2 size={18}/> آماده توسعه ماژول‌ها</span>
          </div>
        </div>
        <aside className="tenant-card" aria-label="نمای وضعیت سازمان فعال">
          <div className="tenant-head"><span>سازمان فعال</span><span className="badge">ایمن</span></div>
          <strong>سازمان نمونه فروش</strong>
          <dl>
            <div><dt>نقش جاری</dt><dd>مدیر سازمان</dd></div>
            <div><dt>نوع استقرار</dt><dd>SaaS مشترک</dd></div>
            <div><dt>مرز داده</dt><dd>Organization ID</dd></div>
          </dl>
        </aside>
      </section>

      <section className="foundation" id="foundation" aria-labelledby="foundation-title">
        <div className="section-heading"><p>پایه محصول</p><h2 id="foundation-title">سه قاعده‌ای که از روز اول می‌شکنیم‌شان نمی‌دهیم</h2></div>
        <div className="grid">
          {foundations.map(({icon: Icon, title, text}) => (
            <article className="card" key={title}>
              <span className="icon"><Icon size={22}/></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

