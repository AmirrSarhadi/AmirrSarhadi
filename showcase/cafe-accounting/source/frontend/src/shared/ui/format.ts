export const unitLabels = { g: "گرم", kg: "کیلوگرم", ml: "میلی‌لیتر", l: "لیتر", piece: "عدد" };
export function normalizeNumber(value: string) {
  return value.trim().replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬,]/g, "").replace(/٫/g, ".");
}
export function decimalError(value: string, precision = 3, allowZero = false, integer = false) {
  const normalized = normalizeNumber(value);
  if (!/^\d+(\.\d+)?$/.test(normalized)) return "یک عدد معتبر وارد کنید.";
  const [whole, fraction = ""] = normalized.split(".");
  if (whole.replace(/^0+/, "").length > (precision === 6 ? 18 : 15)) return "مقدار بیش از حد مجاز است.";
  if (fraction.length > precision) return `حداکثر ${precision === 6 ? "شش" : "سه"} رقم اعشار وارد کنید.`;
  if (!allowZero && !/[1-9]/.test(normalized)) return "مقدار باید بیشتر از صفر باشد.";
  if (integer && /[1-9]/.test(fraction)) return "برای مواد عددی، تعداد صحیح وارد کنید.";
  return "";
}
export function formatDecimal(value: string | number) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match) return "—";
  const fraction = (match[3] ?? "").replace(/0+$/, "");
  const whole = (match[1] && BigInt(match[2]) === 0n && fraction ? "−" : "") + new Intl.NumberFormat("fa-IR").format(BigInt(`${match[1]}${match[2]}`));
  return whole + (fraction ? `٫${fraction.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])}` : "");
}
export const money = (value: string | number) => `${formatDecimal(value)} تومان`;
export const dateTime = (value: string) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(new Date(value));
export function today() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function daysBefore(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function dateError(value: string) {
  const normalized = normalizeNumber(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "تاریخ میلادی را با قالب سال-ماه-روز وارد کنید.";
  const date = new Date(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== normalized) return "تاریخ معتبر نیست.";
  return "";
}
