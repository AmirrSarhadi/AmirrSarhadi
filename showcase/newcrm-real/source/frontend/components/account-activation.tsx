"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api, ApiError, announceAccountChange, roleNames} from "../lib/api";
import {useAccount} from "../lib/use-account";
import {formatAccountDate} from "../lib/format";
import {ActionButton, Feedback, LoadingAccount, LoadFailure, LogoutButton} from "./account-ui";
import {SecretField} from "./secret-field";

type SetupPreview = {username: string; organization: {id: string; name: string}; role: string; expires_at: string; confirmation: string};
type FieldErrors = {username?: string; token?: string; password?: string; password_confirm?: string};

export function AccountActivation() {
  const router = useRouter();
  const {account, refresh} = useAccount();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [preview, setPreview] = useState<SetupPreview | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const previousReview = useRef(false);

  useEffect(() => {
    if (account.phase === "ready") {
      setUsername(""); setToken(""); setPassword(""); setPasswordConfirm(""); setPreview(null);
    }
  }, [account.phase]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (preview) passwordRef.current?.focus();
    else if (previousReview.current) usernameRef.current?.focus();
    previousReview.current = !!preview;
  }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    setError("");
    const invalid: FieldErrors = preview ? {
      password: password ? undefined : "رمز عبور جدید را وارد کنید.",
      password_confirm: passwordConfirm === password && passwordConfirm ? undefined : "تکرار رمز عبور یکسان نیست.",
    } : {username: username.trim() ? undefined : "نام کاربری تخصیص‌یافته را وارد کنید.", token: token.trim() ? undefined : "کد فعال‌سازی را وارد کنید."};
    setErrors(invalid);
    if (Object.values(invalid).some(Boolean)) {
      (invalid.username ? usernameRef : invalid.token ? tokenRef : invalid.password ? passwordRef : confirmRef).current?.focus(); return;
    }
    pending.current = true; setBusy(true);
    const ctrl = new AbortController(); controller.current?.abort(); controller.current = ctrl;
    try {
      const credentials = {username: username.trim(), token: token.trim()};
      if (!preview) {
        const result = await api<SetupPreview>("auth/setup/preview/", {body: credentials, signal: ctrl.signal});
        if (!ctrl.signal.aborted) setPreview(result);
      } else {
        await api("auth/setup/complete/", {body: {...credentials, confirmation: preview.confirmation, password, password_confirm: passwordConfirm}, signal: ctrl.signal});
        if (ctrl.signal.aborted) return;
        setPassword(""); setPasswordConfirm(""); setToken(""); setPreview(null);
        announceAccountChange(); router.replace("/workspace");
      }
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      const completing = !!preview;
      if (completing) {setPassword(""); setPasswordConfirm("");}
      if (failure instanceof ApiError && failure.status === 400) {
        if (failure.fields.password?.length || failure.fields.password_confirm?.length) {
          setErrors({password: failure.fields.password?.join(" "), password_confirm: failure.fields.password_confirm?.join(" ")});
          (failure.fields.password?.length ? passwordRef : confirmRef).current?.focus();
        } else {
          setPreview(null); setErrors({token: "نام کاربری یا کد فعال‌سازی معتبر نیست؛ ممکن است دعوت منقضی یا لغو شده باشد. از مدیر سامانه بررسی کنید."});
          tokenRef.current?.focus();
        }
      } else if (failure instanceof ApiError && failure.status === 409) {
        setPreview(null); setError("مشخصات دعوت تغییر کرده یا زمان بررسی گذشته است. دوباره دعوت را بررسی کنید.");
      } else if (failure instanceof ApiError && failure.status === 403) {
        setError("دسترسی تأیید نشد. وضعیت حساب را دوباره بررسی کنید."); void refresh();
      } else if (completing) {
        setUncertain(true); setToken(""); setPreview(null);
        setError("نتیجه فعال‌سازی مشخص نیست. پیش از تلاش دوباره، با نام کاربری و رمزی که تعیین کردید وارد شوید.");
      } else setError(failure instanceof Error ? failure.message : "بررسی دعوت انجام نشد.");
    } finally {pending.current = false; setBusy(false);}
  }

  if (account.phase === "loading") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  if (account.phase === "ready") return <section className="account-panel"><h1>ابتدا از حساب فعلی خارج شوید</h1><p className="account-description">اکنون با حساب <bdi>{account.data.user.username}</bdi> وارد شده‌اید. فعال‌سازی حساب تازه، رمز یا دسترسی این حساب را تغییر نمی‌دهد.</p><LogoutButton/><p className="invitation-back"><Link href="/organizations">بازگشت به سازمان‌های من</Link></p></section>;
  return <section className="organization-page invitation-page">
    <span className="account-kicker">فقط برای حساب تازه دعوت‌شده</span><h1>فعال‌سازی حساب</h1><p className="account-description">نام کاربری و کد فعال‌سازی دریافت‌شده از مدیر سامانه را وارد کنید. این مسیر برای بازیابی رمز حساب موجود نیست.</p>
    {uncertain ? <div className="account-panel"><h2>ابتدا وضعیت ورود را بررسی کنید</h2><Feedback message={error}/><Link className="account-button" href="/login">رفتن به ورود</Link></div> : <form noValidate onSubmit={submit} aria-busy={busy} className="account-panel invitation-entry">
      {!preview ? <>
        <div className="account-field"><label htmlFor="setup-username">نام کاربری تخصیص‌یافته</label><input id="setup-username" name="username" ref={usernameRef} value={username} onChange={event => setUsername(event.target.value)} maxLength={150} autoComplete="username" autoCapitalize="none" spellCheck={false} dir="auto" required disabled={busy} aria-invalid={!!errors.username} aria-describedby="setup-username-error"/><p className="field-error" id="setup-username-error">{errors.username || "\u00a0"}</p></div>
        <SecretField id="setup-token" name="token" label="کد فعال‌سازی" inputRef={tokenRef} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={128} required value={token} onChange={event => setToken(event.target.value)} disabled={busy} error={errors.token}/>
        <ActionButton type="submit" busy={busy}>بررسی دعوت و ادامه</ActionButton>
      </> : <>
        <h2>مشخصات حساب دعوت‌شده</h2><dl className="activation-details"><div><dt>نام کاربری</dt><dd><bdi>{preview.username}</bdi></dd></div><div><dt>سازمان</dt><dd>{preview.organization.name}</dd></div><div><dt>نقش</dt><dd>{roleNames[preview.role] || "عضو سازمان"}</dd></div><div><dt>مهلت (به وقت تهران)</dt><dd>{formatAccountDate(preview.expires_at)}</dd></div></dl>
        <p className="account-description">با تعیین رمز، دعوت را می‌پذیرید و وارد همین سازمان می‌شوید. رمز باید دست‌کم ۸ نویسه باشد و از رمزهای رایج نباشد.</p>
        <SecretField id="setup-password" name="password" label="رمز عبور جدید" inputRef={passwordRef} autoComplete="new-password" minLength={8} maxLength={4096} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} error={errors.password}/>
        <SecretField id="setup-password-confirm" name="password_confirm" label="تکرار رمز عبور جدید" inputRef={confirmRef} autoComplete="new-password" maxLength={4096} required value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} disabled={busy} error={errors.password_confirm}/>
        <div className="invitation-actions"><ActionButton className="secondary" type="button" disabled={busy} onClick={() => {setPreview(null); setPassword(""); setPasswordConfirm(""); setErrors({}); setError("");}}>ویرایش مشخصات دعوت</ActionButton><ActionButton type="submit" busy={busy}>تعیین رمز و پذیرش دعوت</ActionButton></div>
      </>}
      <Feedback message={error}/>
    </form>}
    <p className="invitation-back"><Link href="/login">بازگشت به ورود</Link></p>
  </section>;
}
