"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft, LockKeyhole} from "lucide-react";
import {api, ApiError, announceAccountChange} from "../lib/api";
import {SecretField} from "./secret-field";
import {useAccount} from "../lib/use-account";
import {ActionButton, Feedback, LoadingAccount, LoadFailure} from "./account-ui";

export function LoginForm() {
  const router = useRouter();
  const {account, refresh} = useAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{username?: string; password?: string}>({});
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  useEffect(() => { if (account.phase === "ready") router.replace("/organizations"); }, [account, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const invalid = {username: username.trim() ? undefined : "نام کاربری را وارد کنید.", password: password ? undefined : "رمز عبور را وارد کنید."};
    setErrors(invalid); setError("");
    if (invalid.username || invalid.password) {
      (invalid.username ? usernameRef : passwordRef).current?.focus(); return;
    }
    pending.current = true; setBusy(true);
    try {
      await api("auth/login/", {body: {username: username.trim(), password}});
      setPassword(""); announceAccountChange(); router.replace("/organizations");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setError("نام کاربری یا رمز عبور معتبر نیست. دوباره بررسی کنید."); setPassword(""); passwordRef.current?.focus();
      } else setError(error instanceof Error ? error.message : "ورود انجام نشد.");
    } finally { pending.current = false; setBusy(false); }
  }

  if (account.phase === "loading" || account.phase === "ready") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  return <div className="login-layout">
    <section className="login-intro" aria-labelledby="login-intro-title">
      <span className="account-kicker">فضای کار تیم شما</span>
      <h2 id="login-intro-title">هر رابطه، <br/><span>یک قدم بعدی.</span></h2>
      <p>به حساب خود وارد شوید و سازمانی را که در آن کار می‌کنید انتخاب کنید.</p>
      <div className="intro-note"><LockKeyhole size={20} aria-hidden="true"/><span>دسترسی هر سازمان بر اساس عضویت شما تعیین می‌شود.</span></div>
    </section>
    <section className="account-panel login-panel" aria-labelledby="login-title">
      <span className="account-kicker">خوش آمدید</span>
      <h1 id="login-title">ورود به حساب</h1>
      <p className="account-description">از نام کاربری و رمز دریافت‌شده از مدیر سامانه استفاده کنید.</p>
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <div className="account-field">
          <label htmlFor="username">نام کاربری</label>
          <input ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} dir="auto" maxLength={150} required
            value={username} onChange={e => setUsername(e.target.value)} disabled={busy} aria-invalid={!!errors.username} aria-describedby="username-error"/>
          <p className="field-error" id="username-error">{errors.username || "\u00a0"}</p>
        </div>
        <SecretField inputRef={passwordRef} id="password" name="password" label="رمز عبور" autoComplete="current-password"
          maxLength={4096} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} error={errors.password}/>
        <ActionButton type="submit" className="full-width" busy={busy}>ورود به حساب<ArrowLeft size={18} aria-hidden="true"/></ActionButton>
        <Feedback message={error}/>
      </form>
      <p className="invitation-back"><Link href="/account/activate">فعال‌سازی حساب دعوت‌شده</Link></p>
      <p className="account-help">برای دریافت حساب یا بازیابی دسترسی، با مدیر سامانه تماس بگیرید.</p>
    </section>
  </div>;
}
