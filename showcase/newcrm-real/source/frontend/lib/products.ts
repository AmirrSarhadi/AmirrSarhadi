import { latinDigits, parseToman } from "./sales-entry";
export const productUnits = [
  "عدد",
  "کیلوگرم",
  "گرم",
  "متر",
  "لیتر",
  "بسته",
  "لیسانس",
  "ساعت",
  "قرارداد",
  "دوره",
];
export const productStatus = { active: "فعال", inactive: "غیرفعال" };
export type Product = {
  id: string;
  version: number;
  name: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  status: keyof typeof productStatus;
  price: string;
  cost: string | null;
  stock: string;
  min_stock: string;
  barcode: string;
  weight_grams: string | null;
  dimensions: string;
  internal_notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  low_stock: boolean;
  creator_label: string;
};
export type ProductDraft = Record<string, string>;
export const productFields = [
  { name: "name", label: "نام محصول", length: 200 },
  { name: "sku", label: "کد محصول (SKU)", length: 80 },
  { name: "description", label: "توضیحات محصول", lines: true, length: 4000 },
  {
    name: "category",
    label: "دسته‌بندی",
    length: 100,
    suggestionsId: "product-categories",
  },
  {
    name: "unit",
    label: "واحد شمارش",
    options: productUnits.map((v) => ({ value: v, label: v })),
  },
  {
    name: "status",
    label: "وضعیت محصول",
    options: Object.entries(productStatus).map(([value, label]) => ({
      value,
      label,
    })),
  },
  { name: "barcode", label: "بارکد", length: 100 },
  { name: "tags", label: "برچسب‌ها (جدا با ویرگول)", length: 2000 },
  { name: "price", label: "قیمت فروش (تومان)", length: 24 },
  { name: "cost", label: "قیمت خرید/تولید (تومان)", length: 24 },
  { name: "stock", label: "موجودی فعلی", length: 16 },
  { name: "min_stock", label: "حداقل موجودی", length: 16 },
  { name: "weight_grams", label: "وزن (گرم)", length: 16 },
  { name: "dimensions", label: "ابعاد", length: 200 },
  {
    name: "internal_notes",
    label: "یادداشت‌های داخلی",
    lines: true,
    length: 4000,
  },
];
export const blankProduct = (): ProductDraft => ({
  name: "",
  sku: "PRD-" + crypto.randomUUID().slice(0, 12).toUpperCase(),
  description: "",
  category: "",
  unit: "عدد",
  status: "active",
  price: "",
  cost: "",
  stock: "0",
  min_stock: "5",
  barcode: "",
  weight_grams: "",
  dimensions: "",
  internal_notes: "",
  tags: "",
});
export const productDraft = (r: Product): ProductDraft =>
  Object.fromEntries(
    productFields.map((f) => [
      f.name,
      f.name === "tags"
        ? r.tags.join("، ")
        : String((r as unknown as Record<string, unknown>)[f.name] ?? ""),
    ]),
  );
export function productInput(d: ProductDraft) {
  const errors: Record<string, string> = {};
  const body: Record<string, unknown> = {
    ...d,
    tags: d.tags
      .split(/[،,]/)
      .map((v) => v.trim())
      .filter(Boolean),
  };
  for (const key of ["name", "sku"])
    if (!d[key].trim()) errors[key] = "این فیلد لازم است.";
  for (const key of ["price", "cost"])
    try {
      body[key] = parseToman(d[key]);
      if (key === "price" && body[key] === null)
        errors.price = "قیمت فروش لازم است؛ صفر مجاز است.";
    } catch (e) {
      errors[key] = (e as Error).message;
    }
  for (const key of ["stock", "min_stock", "weight_grams"]) {
    const value = latinDigits(d[key].trim());
    if (key === "weight_grams" && !value) {
      body[key] = null;
      continue;
    }
    if (!/^\d{1,12}(\.\d{1,3})?$/.test(value))
      errors[key] = "عدد غیرمنفی با حداکثر ۱۲ رقم صحیح و ۳ اعشار وارد کنید.";
    else body[key] = value;
  }
  return { body, errors };
}
export function quantityDisplay(value: string) {
  const [n, f] = value.split(".");
  return (
    new Intl.NumberFormat("fa-IR").format(BigInt(n)) +
    (f && Number(f)
      ? "٫" +
        f.replace(/0+$/, "").replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)])
      : "")
  );
}
export function stockMoney(price: string | null, stock: string) {
  if (price === null) return "ثبت نشده";
  const [n, f = ""] = stock.split(".");
  const q = BigInt(n) * BigInt(1000) + BigInt(f.padEnd(3, "0"));
  const v = BigInt(price) * q;
  const abs = v < BigInt(0) ? -v : v;
  const rem = (abs % BigInt(1000))
    .toString()
    .padStart(3, "0")
    .replace(/0+$/, "");
  return (
    (v < BigInt(0) ? "−" : "") +
    new Intl.NumberFormat("fa-IR").format(abs / BigInt(1000)) +
    (rem ? "٫" + rem.replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)]) : "") +
    " تومان"
  );
}
