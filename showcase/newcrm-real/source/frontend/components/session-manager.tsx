"use client";

import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Monitor, ShieldCheck} from "lucide-react";
import {api, ApiError, announceAccountChange} from "../lib/api";
import {formatAccountDate} from "../lib/format";
import {useAccount} from "../lib/use-account";
import {ActionButton, Feedback, LoadingAccount, LoadFailure, LogoutButton} from "./account-ui";
import {SecretField} from "./secret-field";

type SessionRecord = {id: string; label: string; current: boolean; created_at: string; expires_at: string};
type SessionPage = {count: number; next: string | null; previous: string | null; results: SessionRecord[]};

export function SessionManager() {
  const router = useRouter();
  const {account, refresh} = useAccount();
  const owner = account.phase === "ready" ? account.data.user.user_id : null;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(SessionPage & {owner: number}) | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirming, setConfirming] = useState<false | "others" | "all">(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  const listController = useRef<AbortController | null>(null);
  const mutationController = useRef<AbortController | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const allButton = useRef<HTMLButtonElement>(null);
  const activeOwner = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (owner === null) return;
    listController.current?.abort();
    const ctrl = new AbortController(); listController.current = ctrl;
    setLoading(true); setLoadError("");
    try {
      const result = await api<SessionPage>(`auth/sessions/?page=${page}`, {signal: ctrl.signal});
      if (!ctrl.signal.aborted) {setData({...result, owner}); setUncertain(false);}
    } catch (error) {
      if (ctrl.signal.aborted) return;
      if (error instanceof ApiError && error.status === 403) { void refresh(); return; }
      if (error instanceof ApiError && error.status === 404 && page > 1) {setPage(1); return;}
      setLoadError(error instanceof Error ? error.message : "دریافت نشست‌ها انجام نشد.");
    } finally { if (!ctrl.signal.aborted) setLoading(false); }
  }, [owner, page, refresh]);

  useEffect(() => {
    if (account.phase === "anonymous") {setPassword(""); router.replace("/login");}
    if (account.phase === "ready") {
      if (activeOwner.current !== owner) {
        activeOwner.current = owner; setPassword(""); setConfirming(false); setData(null);
        setError(""); setMessage(""); setPage(1);
      }
      void load();
    }
    return () => listController.current?.abort();
  }, [account.phase, owner, load, router]);
  useEffect(() => () => mutationController.current?.abort(), []);
  useEffect(() => { if (confirming) passwordRef.current?.focus(); }, [confirming]);

  function cancel() {
    if (pending.current) return;
    const trigger = confirming === "all" ? allButton : startButton;
    setPassword(""); setConfirming(false); setPasswordError(""); setError("");
    trigger.current?.focus();
  }
  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    if (!password) {setPasswordError("رمز عبور فعلی را وارد کنید."); passwordRef.current?.focus(); return;}
    pending.current = true; setBusy(true); setPasswordError(""); setError(""); setMessage("");
    const ctrl = new AbortController(); mutationController.current = ctrl;
    try {
      const result = await api<{revoked_count: number}>(`auth/sessions/revoke-${confirming}/`, {body: {password}, signal: ctrl.signal});
      if (ctrl.signal.aborted) return;
      if (confirming === "all") {setPassword(""); announceAccountChange(); router.replace("/login"); router.refresh(); return;}
      setPassword(""); setConfirming(false); setPage(1);
      setMessage(result.revoked_count ? "نشست‌های دیگر بسته شدند. این نشست همچنان فعال است." : "نشست فعال دیگری برای بستن وجود نداشت.");
      announceAccountChange(); await load(); startButton.current?.focus();
    } catch (error) {
      if (ctrl.signal.aborted) return;
      setPassword("");
      if (error instanceof ApiError && error.status === 400) {
        setPasswordError("رمز عبور فعلی معتبر نیست. دوباره بررسی کنید."); passwordRef.current?.focus();
      } else if (error instanceof ApiError && error.status === 403) { void refresh(); }
      else if (error instanceof ApiError && error.status === 429) { setError(error.message); }
      else {
        setUncertain(true); setConfirming(false);
        setError("نتیجه خروج مشخص نیست. پیش از تلاش دوباره، فهرست نشست‌ها را تازه کنید.");
      }
    } finally { pending.current = false; setBusy(false); }
  }

  if (account.phase === "loading" || account.phase === "anonymous") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  const visible = data?.owner === owner ? data : null;
  return <section className="organization-page sessions-page">
    <div className="account-page-heading"><div><span className="account-kicker">حساب <bdi>{account.data.user.username}</bdi></span><h1>نشست‌های فعال</h1><p className="account-description">ورودهای فعال حساب شما در همه سازمان‌ها؛ زمان‌ها به وقت تهران هستند.</p></div><LogoutButton/></div>
    <p className="account-description">نام مرورگر تقریبی است. تب‌های یک مرورگر با کوکی مشترک، یک نشست محسوب می‌شوند.</p>
    {loading || !visible && !loadError ? <LoadingAccount/> : loadError ? <LoadFailure message={loadError} retry={() => void load()}/> : visible && <>
      <p className="session-count">تعداد نشست‌ها: {new Intl.NumberFormat("fa-IR").format(visible.count)}</p>
      <ul className="session-list">{visible.results.map(record => <li className="account-panel" key={record.id}>
        <div className="session-title"><Monitor size={22} aria-hidden="true"/><h2><bdi>{record.label}</bdi></h2>{record.current && <span className="current-org"><ShieldCheck size={16} aria-hidden="true"/>این نشست</span>}</div>
        <dl><div><dt>زمان ورود</dt><dd>{formatAccountDate(record.created_at)}</dd></div><div><dt>انقضا</dt><dd>{formatAccountDate(record.expires_at)}</dd></div></dl>
      </li>)}</ul>
      {!visible.count && <p role="status">نشست فعالی پیدا نشد. وضعیت حساب را دوباره بررسی کنید.</p>}
      <nav className="session-pagination" aria-label="صفحه‌بندی نشست‌ها"><ActionButton className="secondary" disabled={!visible.previous || busy} onClick={() => setPage(value => value - 1)}>صفحه قبل</ActionButton><span>صفحه {new Intl.NumberFormat("fa-IR").format(page)}</span><ActionButton className="secondary" disabled={!visible.next || busy} onClick={() => setPage(value => value + 1)}>صفحه بعد</ActionButton></nav>
    </>}
    <Feedback message={error || message} kind={error ? "error" : "info"}/>
    <div className="session-actions"><ActionButton ref={startButton} className="secondary" disabled={busy || loading || uncertain || !!loadError} onClick={() => {setConfirming("others"); setMessage(""); setError("");}}>خروج از نشست‌های دیگر</ActionButton><ActionButton ref={allButton} className="secondary" disabled={busy || loading || uncertain || !!loadError} onClick={() => {setConfirming("all"); setPassword(""); setPasswordError(""); setMessage(""); setError("");}}>خروج از همه نشست‌ها</ActionButton><ActionButton className="secondary" disabled={busy || loading} onClick={() => void load()}>تازه‌کردن فهرست</ActionButton></div>
    {confirming && <section className="account-panel session-confirm" aria-labelledby="session-confirm-title"><h2 id="session-confirm-title">{confirming === "all" ? "تأیید خروج از همه نشست‌ها" : "تأیید خروج از نشست‌های دیگر"}</h2><p className="account-description">{confirming === "all" ? "همه ورودهای حساب شما، از جمله این نشست، بسته می‌شوند. برای ادامه باید دوباره وارد شوید." : "این نشست باز می‌ماند. ورودهای دیگر حساب شما در همه سازمان‌ها بسته می‌شوند و برای ادامه به ورود دوباره نیاز دارند."}</p><form noValidate onSubmit={revoke} aria-busy={busy}><SecretField id="session-password" name="password" label="رمز عبور فعلی" inputRef={passwordRef} autoComplete="current-password" required maxLength={4096} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} error={passwordError}/><div className="session-actions"><ActionButton type="button" className="secondary" disabled={busy} onClick={cancel}>انصراف</ActionButton><ActionButton type="submit" busy={busy}>{confirming === "all" ? "تأیید خروج از همه نشست‌ها" : "تأیید خروج از نشست‌های دیگر"}</ActionButton></div></form></section>}
    <p className="invitation-back"><Link href="/account/password">تغییر رمز عبور</Link></p>
    <p className="invitation-back"><Link href="/organizations">بازگشت به سازمان‌های من</Link></p>
  </section>;
}
