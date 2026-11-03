import { FormEvent, useRef, useState } from "react";
import { ApiError } from "../api";

export type Errors = Record<string, string>;
export class UserFacingError extends Error {}
export function serverError(error: unknown) {
  if (error instanceof UserFacingError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "نشست یا دسترسی شما معتبر نیست. اطلاعات فرم محفوظ است؛ دسترسی را بررسی کنید.";
    if (error.status === 409) return "این دستور تهیه در جای دیگری تغییر کرده است. ابتدا نسخه جدید را دریافت کنید.";
    if (error.status === 400) return "اطلاعات ثبت نشد؛ موارد مشخص‌شده در فرم را اصلاح کنید.";
  }
  return "پاسخ سرور دریافت نشد. اطلاعات فرم محفوظ است؛ دوباره تلاش کنید.";
}
export function fieldErrors(error: unknown): Errors {
  if (!(error instanceof ApiError) || error.status !== 400 || !error.details || typeof error.details !== "object") return {};
  return Object.fromEntries(Object.entries(error.details).map(([key, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    return [key, typeof message === "string" && /[\u0600-\u06ff]/.test(message) ? message : "این مقدار معتبر نیست؛ اطلاعات را بررسی کنید."];
  }));
}
export function useFormState() {
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>, validate: () => Errors, action: () => Promise<void>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const next = validate(); setErrors(next); setError("");
    if (Object.keys(next).length) {
      setError("موارد مشخص‌شده در فرم را اصلاح کنید.");
      (form.elements.namedItem(Object.keys(next)[0]) as HTMLElement | null)?.focus();
      return;
    }
    locked.current = true; setBusy(true);
    try { await action(); }
    catch (failure) { const fields = fieldErrors(failure); setErrors(fields); setError(serverError(failure)); (form.elements.namedItem(Object.keys(fields)[0]) as HTMLElement | null)?.focus(); }
    finally { locked.current = false; setBusy(false); }
  }
  return { errors, error, busy, submit };
}
