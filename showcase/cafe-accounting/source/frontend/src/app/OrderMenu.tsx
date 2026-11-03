import { AvailabilityLabel } from "../shared/ui/AvailabilityLabel";
import { useRef, useState } from "react";
import { MenuCategory, MenuItem } from "../shared/api";

export type CartLine = { id: string; name: string; price: number; quantity: number };
const orderMoney = (n: number) => `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;

export function OrderQuantity({ name, value, disabled, onChange }: { name: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="order-quantity">
    <button type="button" disabled={disabled || value >= 100} aria-label={`افزایش تعداد ${name}`} onClick={() => onChange(value + 1)}>＋</button>
    <output aria-label={`تعداد ${name}`}>{new Intl.NumberFormat("fa-IR").format(value)}</output>
    <button type="button" disabled={disabled} aria-label={`کاهش تعداد ${name}`} onClick={() => onChange(value - 1)}>−</button>
  </div>;
}

export function OrderMenu({ categories, items, lines, disabled, onQuantity }: { categories: MenuCategory[]; items: MenuItem[]; lines: CartLine[]; disabled: boolean; onQuantity: (item: MenuItem, quantity: number) => void }) {
  const [selected, setSelected] = useState(categories[0]?.id ?? "");
  const tabs = useRef<HTMLDivElement>(null);
  const categoryId = categories.some((category) => category.id === selected) ? selected : categories[0]?.id;
  function scroll(left: number) {
    tabs.current?.scrollBy({ left, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const visible = items.filter((item) => item.category === categoryId);
  return <>
    <div className="order-categories">
      <button type="button" aria-label="اسکرول دسته‌بندی‌ها به راست" onClick={() => scroll(240)}>›</button>
      <div ref={tabs} className="order-categories__scroll" role="navigation" aria-label="دسته‌بندی‌های سفارش">{categories.map((category) => <button type="button" key={category.id} aria-pressed={category.id === categoryId} onClick={() => setSelected(category.id)}>{category.name}</button>)}</div>
      <button type="button" aria-label="اسکرول دسته‌بندی‌ها به چپ" onClick={() => scroll(-240)}>‹</button>
    </div>
    <div className="panel order-catalog">{visible.length ? <ul>{visible.map((item) => {
      const quantity = lines.find((line) => line.id === item.id)?.quantity ?? 0;
      return <li key={item.id}><div><strong>{item.name}</strong><small>{orderMoney(item.price)}</small></div><AvailabilityLabel available={item.is_available} />{quantity ? <OrderQuantity name={item.name} value={quantity} disabled={disabled} onChange={(value) => onQuantity(item, value)} /> : <button type="button" className="order-add" aria-label={`افزودن ${item.name}`} disabled={!item.is_available || disabled} onClick={() => onQuantity(item, 1)}>＋</button>}</li>;
    })}</ul> : <p className="empty-copy">در این دسته‌بندی آیتمی وجود ندارد.</p>}</div>
  </>;
}
