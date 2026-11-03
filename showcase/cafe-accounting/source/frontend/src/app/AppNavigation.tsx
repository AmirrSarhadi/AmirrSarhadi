import { useEffect, useRef } from "react";

export type Section = "orderEntry" | "menu" | "tables" | "orders" | "receipts" | "customers" | "reports" | "rangeReports" | "cashShift" | "expenses" | "inventory" | "settings" | "help";
const groups: { title: string; items: { id: Section; label: string; management?: boolean }[] }[] = [
  { title: "عملیات روزانه", items: [{ id: "orderEntry", label: "ثبت سفارش" }, { id: "orders", label: "سفارش‌های باز" }, { id: "cashShift", label: "شیفت صندوق" }, { id: "receipts", label: "آرشیو صورتحساب‌ها" }, { id: "customers", label: "مشتری‌ها" }] },
  { title: "مدیریت کافه", items: [{ id: "menu", label: "مدیریت منو" }, { id: "tables", label: "مدیریت میزها" }, { id: "inventory", label: "انبار و بهای تمام‌شده", management: true }, { id: "expenses", label: "هزینه‌ها", management: true }, { id: "settings", label: "تنظیمات" }] },
  { title: "راهنمای برنامه", items: [{ id: "help", label: "راهنما" }] },
  { title: "گزارش‌ها", items: [{ id: "reports", label: "گزارش روزانه", management: true }, { id: "rangeReports", label: "گزارش بازه‌ای", management: true }] },
];

export function AppNavigation({ active, canManage, cafeName, onSelect }: { active: Section; canManage: boolean; cafeName: string; onSelect: (section: Section) => void }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() { drawer.current?.close(); trigger.current?.focus(); }
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (query.matches && drawer.current?.open) drawer.current.close(); };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    const original = document.body.style.overflow;
    const sync = () => { document.body.style.overflow = dialog.open ? "hidden" : original; };
    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => { observer.disconnect(); document.body.style.overflow = original; };
  }, []);
  function links(mobile = false) {
    return groups.map((group) => {
      const items = group.items.filter((item) => !item.management || canManage);
      return items.length > 0 && <div className="app-nav__group" key={group.title}>
        <span className="app-nav__group-title">{group.title}</span>
        <div className="app-nav__links">{items.map((item) => <button type="button" key={item.id} className="app-nav__link" aria-current={active === item.id ? "page" : undefined} onClick={() => { if (mobile) close(); onSelect(item.id); }}>{item.label}</button>)}</div>
      </div>;
    });
  }
  return <>
    <nav className="app-nav app-nav--desktop" aria-label="بخش‌های مدیریت">{links()}</nav>
    <button type="button" ref={trigger} className={active === "orderEntry" ? "app-nav__toggle app-nav__toggle--ordering" : "app-nav__toggle"} aria-label="باز کردن منوی بخش‌ها" aria-haspopup="dialog" aria-controls="app-navigation-drawer" onClick={() => drawer.current?.showModal()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
    <dialog id="app-navigation-drawer" ref={drawer} className="app-drawer" aria-labelledby="app-drawer-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}>
      <header className="app-drawer__header"><div><span className="app-nav__group-title">{cafeName}</span><h2 id="app-drawer-title">بخش‌های کافه</h2></div><button type="button" className="app-drawer__close" onClick={close} autoFocus aria-label="بستن منو">×</button></header>
      <nav className="app-nav app-nav--mobile" aria-label="بخش‌های مدیریت در موبایل">{links(true)}</nav>
    </dialog>
  </>;
}
