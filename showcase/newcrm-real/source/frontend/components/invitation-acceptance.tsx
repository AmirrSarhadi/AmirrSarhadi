"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Building2} from "lucide-react";
import {api, ApiError, announceAccountChange, roleNames} from "../lib/api";
import {formatAccountDate} from "../lib/format";
import {useAccount} from "../lib/use-account";
import {ActionButton, Feedback, LoadingAccount, LoadFailure, LogoutButton} from "./account-ui";
import {SecretField} from "./secret-field";

type Preview = {organization: {id: string; name: string}; role: string; expires_at: string; confirmation: string};

export function InvitationAcceptance() {
  const router = useRouter();
  const {account, refresh} = useAccount();
  const [token, setToken] = useState("");
  const [tokenUserId, setTokenUserId] = useState<number | null>(null);
  const [preview, setPreview] = useState<(Preview & {userId: number}) | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const hadPreview = useRef(false);
  const userId = account.phase === "ready" ? account.data.user.user_id : null;

  useEffect(() => {
    if (account.phase === "anonymous") {
      setToken(""); setPreview(null); router.replace("/login");
    }
  }, [account.phase, router]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (preview) reviewRef.current?.focus();
    else if (hadPreview.current) tokenRef.current?.focus();
    hadPreview.current = !!preview;
  }, [preview]);

  async function checkInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || userId === null) return;
    const value = tokenUserId === userId ? token.trim() : "";
    if (!value) { setFieldError("کد دعوت را وارد کنید."); tokenRef.current?.focus(); return; }
    pending.current = true; setBusy(true); setError(""); setFieldError(""); setUncertain(false);
    const ctrl = new AbortController(); controller.current?.abort(); controller.current = ctrl;
    try {
      const result = await api<Preview>("invitations/preview/", {body: {token: value}, signal: ctrl.signal});
      if (!ctrl.signal.aborted) setPreview({...result, userId});
    } catch (error) {
      if (ctrl.signal.aborted) return;
      if (error instanceof ApiError && error.status === 403) {
        setError("حساب یا مجوز دسترسی تغییر کرده است. دوباره وارد حساب شوید."); void refresh();
      } else if (error instanceof ApiError && error.status === 400) {
        setFieldError("این دعوت قابل استفاده نیست. کد و حساب خود را بررسی کنید یا از مدیر دعوت تازه بگیرید."); tokenRef.current?.focus();
      } else setError(error instanceof Error ? error.message : "بررسی دعوت انجام نشد.");
    } finally { pending.current = false; setBusy(false); }
  }

  async function acceptInvitation() {
    if (pending.current || !preview || preview.userId !== userId) return;
    pending.current = true; setBusy(true); setError("");
    const ctrl = new AbortController(); controller.current?.abort(); controller.current = ctrl;
    try {
      await api("invitations/accept/", {body: {token: token.trim(), confirmation: preview.confirmation}, signal: ctrl.signal});
      setToken(""); setPreview(null); announceAccountChange(); router.replace("/workspace");
    } catch (error) {
      if (ctrl.signal.aborted) return;
      if (error instanceof ApiError && error.status === 409) {
        setPreview(null); setError("مشخصات دعوت تغییر کرده یا زمان بررسی گذشته است. پیش از پذیرش، دوباره بررسی کنید.");
      } else if (error instanceof ApiError && error.status === 400) {
        setPreview(null); setError("این دعوت دیگر قابل استفاده نیست. حساب و دسترسی‌های خود را بررسی کنید.");
      } else if (error instanceof ApiError && error.status === 403) {
        setPreview(null); setError("دسترسی حساب تأیید نشد. وضعیت حساب را دوباره بررسی کنید."); void refresh();
      } else {
        setUncertain(true);
        setError("نتیجه پذیرش مشخص نیست. پیش از تلاش دوباره، وضعیت حساب خود را بررسی کنید.");
      }
    } finally { pending.current = false; setBusy(false); }
  }

  if (account.phase === "loading" || account.phase === "anonymous") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  const visiblePreview = preview?.userId === userId ? preview : null;
  const expiry = visiblePreview ? formatAccountDate(visiblePreview.expires_at) : "";
  return <section className="organization-page invitation-page">
    <div className="account-page-heading"><div><span className="account-kicker">حساب <bdi>{account.data.user.username}</bdi></span><h1>پذیرش دعوت سازمان</h1><p className="account-description">دعوت خود را بررسی کنید و با آگاهی از نقش پیشنهادی به سازمان بپیوندید.</p></div><LogoutButton/></div>
    {visiblePreview ? <section ref={reviewRef} tabIndex={-1} className="account-panel invitation-review" aria-labelledby="invitation-review-title">
      <Building2 size={28} aria-hidden="true"/><h2 id="invitation-review-title">مشخصات دعوت</h2>
      <dl><div><dt>سازمان</dt><dd>{visiblePreview.organization.name}</dd></div><div><dt>نقش پیشنهادی</dt><dd>{roleNames[visiblePreview.role] || "عضو سازمان"}</dd></div><div><dt>مهلت پذیرش (به وقت تهران)</dt><dd>{expiry}</dd></div></dl>
      <p className="account-description">با پذیرش دعوت، عضو این سازمان می‌شوید و سازمان فعال حساب شما تغییر می‌کند.</p>
      {!uncertain && <div className="invitation-actions"><ActionButton busy={busy} onClick={() => void acceptInvitation()}>پذیرش دعوت و ورود به سازمان</ActionButton><ActionButton className="secondary" disabled={busy} onClick={() => {setPreview(null); setError("");}}>ویرایش کد دعوت</ActionButton></div>}
    </section> : <section className="account-panel invitation-entry" aria-labelledby="invitation-code-title"><h2 id="invitation-code-title">کد دعوت را وارد کنید</h2>
      <p className="account-description">از کدی استفاده کنید که مدیر سامانه برای همین حساب به شما داده است.</p>
      <form noValidate onSubmit={checkInvitation} aria-busy={busy}>
        <SecretField inputRef={tokenRef} id="invitation-token" name="invitation-token" label="کد دعوت" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={128}
          value={tokenUserId === userId ? token : ""} onChange={event => {setToken(event.target.value); setTokenUserId(userId);}} disabled={busy} error={fieldError}/>
        <ActionButton busy={busy} type="submit">بررسی دعوت</ActionButton>
      </form></section>}
    <Feedback message={error}/>
    {uncertain && <Link className="account-button secondary" href="/workspace">بررسی وضعیت حساب</Link>}
    <p className="invitation-back"><Link href="/organizations">بازگشت به سازمان‌های من</Link></p>
  </section>;
}
