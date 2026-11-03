import {SCHOOL_TOUR_URL} from "@/lib/public-links";
export const HOMEPAGE_KEY = "homepage-experience";
export const HOME_HEADLINE = "یادگیری، آغازِ بی‌نهایت امکان";

export type SchoolStat = { label: string; value: number; suffix: string };
export type SchoolEvent = { title: string; month: number; day: number };
export type HomepageSettings = {
  stats: SchoolStat[];
  tour: { title: string; description: string; url: string; image: string };
  events: SchoolEvent[];
};

export const persianMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const defaultHomepage: HomepageSettings = {
  stats: [
    { label: "ظرفیت دانش‌آموزی", value: 535, suffix: "" },
    { label: "کلاس آموزشی", value: 17, suffix: "" },
    { label: "پایه تحصیلی", value: 3, suffix: "" },
    { label: "رشته تحصیلی", value: 2, suffix: "" },
  ],
  tour: {
    title: "یک قدم نزدیک‌تر به مدرسه نمونه",
    description: "پیش از اولین روز مدرسه، به فضاهای یادگیری ما سر بزنید.",
    url: SCHOOL_TOUR_URL,
    image: "",
  },
  events: [
    { month: 7, day: 1, title: "آغاز سال تحصیلی" },
    { month: 8, day: 13, title: "روز دانش‌آموز" },
    { month: 9, day: 25, title: "روز پژوهش" },
    { month: 12, day: 15, title: "روز درختکاری" },
    { month: 2, day: 12, title: "روز معلم" },
  ],
};

export function safePublicUrl(value: unknown): string {
  if (typeof value !== "string" || /[\s\\\u0000-\u001f]/.test(value)) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function safePublicImage(value: unknown): string {
  const path = safePublicUrl(value);
  return path.startsWith("/") ? path : "";
}

export function validSchoolEvent(event: SchoolEvent): boolean {
  return Number.isInteger(event.month) && Number.isInteger(event.day) &&
    event.month >= 1 && event.month <= 12 && event.day >= 1 &&
    event.day <= (event.month <= 6 ? 31 : event.month === 12 ? 29 : 30) &&
    typeof event.title === "string" && event.title.trim().length > 0 && event.title.length <= 120;
}

export function readHomepage(body?: string): HomepageSettings {
  if (!body) return structuredClone(defaultHomepage);
  try {
    const data = JSON.parse(body);
    const stats = Array.isArray(data.stats) ? data.stats.filter((stat: SchoolStat) =>
      stat && typeof stat.label === "string" && stat.label.trim() && stat.label.length <= 60 &&
      Number.isInteger(stat.value) && stat.value >= 0 && stat.value <= 1_000_000 &&
      typeof stat.suffix === "string" && stat.suffix.length <= 4).slice(0, 5) : defaultHomepage.stats;
    const events = Array.isArray(data.events) ? data.events.filter((event: SchoolEvent) => event && validSchoolEvent(event)).slice(0, 30) : defaultHomepage.events;
    return {
      stats,
      events: [...events].sort((a, b) => ((a.month + 5) % 12) - ((b.month + 5) % 12) || a.day - b.day),
      tour: {
        title: typeof data.tour?.title === "string" && data.tour.title.trim() ? data.tour.title.slice(0, 120) : defaultHomepage.tour.title,
        description: typeof data.tour?.description === "string" ? data.tour.description.slice(0, 300) : defaultHomepage.tour.description,
        url: SCHOOL_TOUR_URL, image: safePublicImage(data.tour?.image),
      },
    };
  } catch { return structuredClone(defaultHomepage); }
}

export function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric", numberingSystem: "latn",
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const year = part("year"), month = part("month"), day = part("day");
  return { year, month, day, academicYear: month >= 7 ? year : year - 1 };
}
