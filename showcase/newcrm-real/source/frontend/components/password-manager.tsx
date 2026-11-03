"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api, ApiError, announceAccountChange} from "../lib/api";
import {useAccount} from "../lib/use-account";
import {ActionButton, Feedback, LoadingAccount, LoadFailure, LogoutButton} from "./account-ui";
import {SecretField} from "./secret-field";

const fields = [
  {name: "password", label: "رمز عبور فعلی", complete: "current-password"},
  {name: "new_password", label: "رمز عبور جدید", complete: "new-password"},
  {name: "new_password_confirm", label: "تکرار رمز عبور جدید", complete: "new-password"},
] as const;
type Field = typeof fields[number]["name"];
const empty = {password: "", new_password: "", new_password_confirm: ""};

export function PasswordManager() {
  const {account, refresh} = useAccount();
  const router = useRouter();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const owner = account.phase === "ready" ? account.data.user.user_id : null;
  useEffect(() => {setValues(empty); setErrors({});}, [owner]);
  useEffect(() => {if (account.phase === "anonymous") router.replace("/login");}, [account.phase, router]);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    const invalid: Partial<Record<Field, string>> = {};
    for (const field of fields) if (!values[field.name]) invalid[field.name] = `${field.label} را وارد کنید.`;
    if (values.new_password !== values.new_password_confirm) invalid.new_password_confirm = "تکرار رمز عبور یکسان نیست.";
    setErrors(invalid); setError("");
    const first = fields.find(field => invalid[field.name]);
    if (first) {inputs.current[first.name]?.focus(); return;}
    pending.current = true; setBusy(true);
    const ctrl = new AbortController(); controller.current = ctrl;
    try {
      await api("auth/password/change/", {body: values, signal: ctrl.signal});
      if (ctrl.signal.aborted) return;
      setValues(empty); announceAccountChange(); router.replace("/login"); router.refresh();
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      setValues(empty);
      if (failure instanceof ApiError && failure.status === 400) {
        const next: Partial<Record<Field, string>> = {};
        for (const field of fields) if (failure.fields[field.name]?.length) next[field.name] = failure.fields[field.name].join(" ");
        setErrors(next); setError(Object.keys(next).length ? "موارد مشخص‌شده را بررسی و رمزها را دوباره وارد کنید." : failure.message);
        inputs.current[fields.find(field => next[field.name])?.name || "password"]?.focus();
      } else if (failure instanceof ApiError && failure.status === 403) {void refresh();}
      else if (failure instanceof ApiError && failure.status === 429) {setError(failure.message);}
      else {setUncertain(true); setError("نتیجه تغییر رمز مشخص نیست. از صفحه ورود، ورود با رمز جدید را بررسی کنید. درخواست دوباره خودکار ارسال نمی‌شود.");}
    } finally {pending.current = false; setBusy(false);}
  }

  if (account.phase === "loading" || account.phase === "anonymous") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  return <section className="organization-page">
    <span className="account-kicker">حساب <bdi>{account.data.user.username}</bdi></span>
    <h1>تغییر رمز عبور</h1>
    <p className="account-description">با تغییر رمز، همه نشست‌های حساب شما از جمله این نشست بسته می‌شوند. سپس با رمز جدید وارد شوید.</p>
    <form className="account-panel" noValidate onSubmit={submit} aria-busy={busy}>
      {fields.map(field => <SecretField key={field.name} id={`change-${field.name}`} name={field.name} label={field.label} autoComplete={field.complete} required maxLength={4096} inputRef={node => {inputs.current[field.name] = node;}} value={values[field.name]} disabled={busy || uncertain} error={errors[field.name]} hint={field.name === "new_password" ? "حداقل ۸ نویسه؛ از رمزهای رایج استفاده نکنید." : undefined} onChange={event => setValues(previous => ({...previous, [field.name]: event.target.value}))}/>)}
      <Feedback message={error}/>
      <ActionButton type="submit" busy={busy} disabled={uncertain}>تغییر رمز و خروج از همه نشست‌ها</ActionButton>
    </form>
    {uncertain && <div><p><Link href="/login">بررسی ورود با رمز جدید</Link></p><LogoutButton/></div>}
    <p className="invitation-back"><Link href="/account/sessions">بازگشت به نشست‌های فعال</Link></p>
  </section>;
}
