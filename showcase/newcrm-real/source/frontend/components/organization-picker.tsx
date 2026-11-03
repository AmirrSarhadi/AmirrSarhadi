"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft, Building2, Check} from "lucide-react";
import {api, ApiError, announceAccountChange, roleNames} from "../lib/api";
import {useAccount} from "../lib/use-account";
import {ActionButton, Feedback, LoadingAccount, LoadFailure, LogoutButton} from "./account-ui";

export function OrganizationPicker() {
  const router = useRouter();
  const {account, refresh} = useAccount();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => { if (account.phase === "anonymous") router.replace("/login"); }, [account, router]);
  async function select(id: string) {
    if (pending.current) return;
    pending.current = true; setBusyId(id); setError("");
    try {
      await api("active-organization/", {body: {organization_id: id}});
      announceAccountChange(); router.replace("/workspace");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setError("عضویت یا وضعیت حساب تغییر کرده است. فهرست سازمان‌ها را دوباره بررسی کنید.");
        void refresh();
      } else setError(error instanceof Error ? error.message : "انتخاب سازمان انجام نشد.");
    } finally { pending.current = false; setBusyId(null); }
  }
  if (account.phase === "loading" || account.phase === "anonymous") return <LoadingAccount/>;
  if (account.phase === "error") return <LoadFailure message={account.message} retry={() => void refresh()}/>;
  const {user, organizations, current} = account.data;
  return <section className="organization-page" aria-labelledby="organizations-title">
    <div className="account-page-heading"><div><span className="account-kicker">حساب <bdi>{user.username}</bdi></span><h1 id="organizations-title">انتخاب سازمان</h1><p className="account-description">فضای کاری موردنظر خود را انتخاب کنید.</p></div><LogoutButton/></div>
    <Feedback message={error}/>
    {organizations.length ? <ul className="organization-list">{organizations.map(organization => <li key={organization.id}>
      <div className="organization-identity"><span className="organization-symbol"><Building2 size={23} aria-hidden="true"/></span><div><h2>{organization.name}</h2><p>{roleNames[organization.role] || "عضو سازمان"}</p></div></div>
      <div className="organization-actions">{current?.organization_id === organization.id && <span className="current-org"><Check size={15} aria-hidden="true"/>سازمان جاری</span>}<ActionButton disabled={!!busyId} busy={busyId === organization.id} onClick={() => void select(organization.id)} aria-label={`ورود به سازمان ${organization.name}`}>ورود به سازمان<ArrowLeft size={17} aria-hidden="true"/></ActionButton></div>
    </li>)}</ul> : <div className="account-panel empty-organizations"><Building2 size={32} aria-hidden="true"/><h2>عضویت فعالی ندارید</h2><p>برای بررسی دعوت یا دسترسی سازمانی، با مدیر سامانه تماس بگیرید.</p><ActionButton className="secondary" onClick={() => void refresh()}>بررسی دوباره دسترسی</ActionButton></div>}
    <p className="invitation-back"><Link href="/account/sessions">مدیریت نشست‌های فعال</Link></p>
    <p className="invitation-back">کد دعوت دارید؟ <Link href="/invitations/accept">پذیرش دعوت سازمان</Link></p>
  </section>;
}
