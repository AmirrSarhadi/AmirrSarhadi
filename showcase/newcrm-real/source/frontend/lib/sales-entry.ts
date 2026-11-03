/** Exact, string-only money and typed Persian calendar input. No float conversion. */
export function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
}
export function parseToman(value: string): string | null {
  const text = latinDigits(value.trim()).replace(/٬/g, ",");
  if (!text) return null;
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)$/.test(text))
    throw new Error("مبلغ را به تومانِ صحیح و بدون اعشار وارد کنید.");
  const digits = text.replace(/,/g, "").replace(/^0+(?=\d)/, "");
  if (digits.length > 18) throw new Error("مبلغ باید حداکثر ۱۸ رقم باشد.");
  return digits;
}
export function formatToman(value: string | null) {
  return value === null
    ? "مبلغ نامشخص"
    : `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} تومان`;
}
const calendar = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function parts(date: Date) {
  const values = Object.fromEntries(
    calendar.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return [Number(values.year), Number(values.month), Number(values.day)];
}
export function persianDate(iso: string | null) {
  if (!iso) return "";
  const [year, month, day] = parts(new Date(`${iso}T12:00:00Z`));
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}
export function displayPersianDate(iso: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "UTC",
    dateStyle: "long",
  }).format(new Date(`${iso}T12:00:00Z`));
}
export function parsePersianDate(value: string): string | null {
  const text = latinDigits(value.trim());
  if (!text) return null;
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (!match)
    throw new Error(
      "تاریخ شمسی را به صورت سال/ماه/روز وارد کنید؛ مانند ۱۴۰۵/۰۸/۰۴.",
    );
  const [, y, m, d] = match.map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31)
    throw new Error("تاریخ شمسی معتبر نیست.");
  const anchor = Date.UTC(y + 621, 0, 1, 12);
  for (let i = 0; i < 730; i++) {
    const date = new Date(anchor + i * 86400000);
    const [year, month, day] = parts(date);
    if (year === y && month === m && day === d)
      return date.toISOString().slice(0, 10);
  }
  throw new Error("این روز در تقویم شمسی وجود ندارد.");
}
