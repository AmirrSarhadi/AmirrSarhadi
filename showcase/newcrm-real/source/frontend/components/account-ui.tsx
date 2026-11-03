"use client";

import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";
import { requestNavigation } from "../lib/request-navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { api, announceAccountChange } from "../lib/api";

export function ActionButton({
  busy,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`account-button ${className}`}
    >
      <span className={busy ? "button-label pending" : "button-label"}>
        {children}
      </span>
      {busy && (
        <LoaderCircle
          className="button-spinner spin"
          size={20}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export function Feedback({
  message,
  kind = "error",
}: {
  message?: string;
  kind?: "error" | "info";
}) {
  return (
    <div className={`feedback-slot ${message ? kind : ""}`}>
      {message && <p role={kind === "error" ? "alert" : "status"}>{message}</p>}
    </div>
  );
}

export function AccountShell({
  children,
  step,
  workspace = false,
}: {
  children: ReactNode;
  step: string;
  workspace?: boolean;
}) {
  const pathname = usePathname();
  if (
    workspace ||
    [
      "/workspace",
      "/customers",
      "/leads",
      "/opportunities",
      "/sales",
      "/products",
      "/activities",
    ].includes(pathname)
  )
    return <WorkspaceShell pageTitle={workspace?step:undefined}>{children}</WorkspaceShell>;
  return (
    <div className="account-shell">
      <a className="skip-link" href="#account-main">
        رفتن به محتوای اصلی
      </a>
      <header className="account-topbar">
        <Link className="brand" href="/" aria-label="NewCRM؛ صفحه اصلی">
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <bdi>NewCRM</bdi>
        </Link>
        <span className="account-location">{step}</span>
      </header>
      <main id="account-main" tabIndex={-1} className="account-main">
        {children}
      </main>
      <footer className="account-footer">
        NewCRM · مدیریت ارتباط با مشتری
      </footer>
    </div>
  );
}

export function LoadingAccount() {
  return (
    <div className="account-loading" role="status">
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <span>در حال بررسی حساب…</span>
    </div>
  );
}

export function LoadFailure({
  message,
  retry,
  title = "حساب بارگذاری نشد",
}: {
  message?: string;
  retry: () => void;
  title?: string;
}) {
  return (
    <section className="account-panel">
      <h1>{title}</h1>
      <Feedback message={message} />
      <ActionButton onClick={retry}>تلاش دوباره</ActionButton>
    </section>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("auth/logout/", { body: {} });
      announceAccountChange();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خروج انجام نشد.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="logout-control">
      <ActionButton
        className="secondary"
        onClick={() => requestNavigation(() => void logout())}
        busy={busy}
      >
        <LogOut size={17} aria-hidden="true" />
        خروج از حساب
      </ActionButton>
      {error && (
        <p className="logout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
