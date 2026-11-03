import { latinDigits, parsePersianDate, persianDate } from "./sales-entry";

const wallClock = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function wallParts(date: Date) {
  return Object.fromEntries(
    wallClock.formatToParts(date).map((p) => [p.type, p.value]),
  );
}
export function tehranInput(iso: string) {
  const parts = wallParts(new Date(iso));
  return {
    date: persianDate(`${parts.year}-${parts.month}-${parts.day}`),
    time: `${parts.hour}:${parts.minute}`,
  };
}
export class TehranInputError extends Error {
  part: "date" | "time";
  constructor(message: string, part: "date" | "time") { super(message); this.part = part; }
}
export function parseTehranDateTime(date: string, time: string) {
  let day: string | null;
  try { day = parsePersianDate(date); } catch (error) { throw new TehranInputError((error as Error).message,"date"); }
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new TehranInputError("تاریخ شمسی معتبر را وارد کنید.","date");
  const match = /^(\d{1,2}):(\d{2})$/.exec(latinDigits(time.trim()));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
    throw new TehranInputError(
      "ساعت تهران را به صورت ساعت:دقیقه، از ۰۰:۰۰ تا ۲۳:۵۹ وارد کنید.",
      "time",
    );
  const hour = match[1].padStart(2, "0"),
    minute = match[2];
  const naive = Date.parse(`${day}T${hour}:${minute}:00Z`);
  const candidates: string[] = [];
  // Resolve the IANA zone instead of assuming today's UTC offset for historical dates.
  for (let offset = -840; offset <= 840; offset += 15) {
    const instant = new Date(naive - offset * 60000);
    const parts = wallParts(instant);
    if (
      `${parts.year}-${parts.month}-${parts.day}` === day &&
      parts.hour === hour &&
      parts.minute === minute
    )
      candidates.push(instant.toISOString());
  }
  if (candidates.length !== 1)
    throw new TehranInputError(
      "این زمان در منطقه تهران ناموجود یا مبهم است؛ زمان دیگری انتخاب کنید.",
      "time",
    );
  return candidates[0];
}
