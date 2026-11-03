"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Package,
  ShieldCheck,
  UserCog,
  ArrowLeftRight,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Settings2,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useAccount } from "../lib/use-account";
import { api, roleNames } from "../lib/api";
import { LogoutButton } from "./account-ui";

const destinations: {
  href: string;
  label: string;
  icon: typeof Activity;
  operation?: string;
  pending?: boolean;
}[] = [
  { href: "/workspace", label: "داشبورد", icon: LayoutDashboard },
  {
    href: "/customers",
    label: "مشتریان",
    icon: UsersRound,
    operation: "customer.view",
  },
  { href: "/leads", label: "لیدها", icon: Target, operation: "lead.view" },
  {
    href: "/activities",
    label: "وظایف",
    icon: Activity,
    operation: "activity.view",
  },
  {
    href: "/sales",
    label: "فروش",
    icon: ChartNoAxesCombined,
    operation: "sale.view",
  },
  {
    href: "/opportunities",
    label: "فرصت‌ها",
    icon: Target,
    operation: "sale.view",
  },
  {
    href: "/products",
    label: "محصولات",
    icon: Package,
    operation: "product.view",
  },
  {
    href: "/reports",
    label: "گزارش‌ها",
    icon: ChartNoAxesCombined,
    operation: "report.view",
  },
  {
    href: "/companies",
    label: "شرکت‌ها",
    icon: Building2,
    operation: "customer.view",
  },
  {
    href: "/settings",
    label: "تنظیمات",
    icon: Settings2,
    operation: "settings.manage",
  },
  { href: "users", label: "کاربران", icon: UserCog, pending: true },
  {
    href: "roles",
    label: "نقش‌ها و دسترسی‌ها",
    icon: ShieldCheck,
    pending: true,
  },
];

export function WorkspaceShell({
  children,
  pageTitle,
}: {
  children: ReactNode;
  pageTitle?: string;
}) {
  const pathname = usePathname();
  const { account } = useAccount();
  const [menu, setMenu] = useState(false);
  const [date, setDate] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () =>
      setDate(
        new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Tehran",
        }).format(new Date()),
      );
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);
  const [branding, setBranding] = useState<{
    name: string;
    version: number;
    has_logo: boolean;
    has_favicon: boolean;
    identity: string;
  } | null>(null);
  const brandingIdentity =
    account.phase === "ready" && account.data.current
      ? account.data.current.organization_id + ":" + account.data.user.user_id
      : "";
  useEffect(() => {
    if (account.phase !== "ready" || !account.data.current) return;
    const controller = new AbortController();
    const org = account.data.current.organization_id;
    const user = account.data.user.user_id;
    const load = () => {
      api<{
        name: string;
        version: number;
        has_logo: boolean;
        has_favicon: boolean;
      }>("settings/branding/", {
        organizationId: org,
        expectedUserId: user,
        signal: controller.signal,
      })
        .then((value) => {
          if (!controller.signal.aborted)
            setBranding({ ...value, identity: brandingIdentity });
        })
        .catch(() => {
          if (!controller.signal.aborted) setBranding(null);
        });
    };
    load();
    window.addEventListener("newcrm-branding", load);
    return () => {
      controller.abort();
      window.removeEventListener("newcrm-branding", load);
    };
  }, [account, brandingIdentity]);
  const brand = branding?.identity === brandingIdentity ? branding : null;
  const brandOrg =
    account.phase === "ready" ? account.data.current?.organization_id : "";
  const brandPath = (kind: string) =>
    `/api/v1/tenancy/settings/branding/${kind}/?v=${brand?.version}&organization=${brandOrg}`;
  useEffect(() => {
    if (!brand?.has_favicon) return;
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = brandPath("favicon");
    document.head.appendChild(link);
    return () => link.remove();
  }, [brand, brandOrg, pathname]);
  const data = account.phase === "ready" ? account.data : null;
  const current = data?.current;
  const title =
    pageTitle ||
    destinations.find((item) => item.href === pathname)?.label ||
    "فضای کار";
  return (
    <div className="account-shell crm-shell">
      <a className="skip-link" href="#account-main">
        رفتن به محتوای اصلی
      </a>
      <aside className="crm-sidebar" aria-label="ناوبری سازمان">
        <a className="crm-brand" href="/workspace">
          <span className="brand-mark" aria-hidden="true">
            {brand?.has_logo ? (
              <img src={brandPath("logo")} alt="" width="36" height="36" />
            ) : (
              "N"
            )}
          </span>
          <span>
            <bdi>{brand?.name || "NewCRM"}</bdi>
            <small>مدیریت ارتباط با مشتری</small>
          </span>
        </a>
        <button
          ref={toggle}
          type="button"
          className="crm-menu-toggle"
          aria-expanded={menu}
          aria-controls="crm-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? (
            <X size={21} aria-hidden="true" />
          ) : (
            <Menu size={21} aria-hidden="true" />
          )}
          <span>منوی اصلی</span>
        </button>
        <div
          id="crm-navigation"
          className={`crm-navigation ${menu ? "is-open" : ""}`}
        >
          <p className="crm-nav-caption">فضای کار شما</p>
          <nav aria-label="منوی اصلی">
            {destinations
              .filter(
                (item) =>
                  current &&
                  (!item.operation ||
                    data?.operations.includes(item.operation)),
              )
              .map(({ href, label, icon: Icon, pending }) =>
                pending ? (
                  <span
                    key={href}
                    className="crm-nav-pending"
                    aria-disabled="true"
                  >
                    <Icon size={19} aria-hidden="true" />
                    {label}
                    <small>به‌زودی</small>
                  </span>
                ) : (
                  <a
                    key={href}
                    href={href}
                    aria-current={
                      pathname === href.split("?")[0] && !href.includes("?")
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon size={21} aria-hidden="true" />
                    {label}
                  </a>
                ),
              )}
          </nav>
          <div className="crm-organization">
            <Building2 size={20} aria-hidden="true" />
            <span className="crm-nav-caption">سازمان فعال</span>
            <strong>
              {current?.name ||
                (account.phase === "loading"
                  ? "در حال بررسی حساب…"
                  : "سازمان انتخاب نشده")}
            </strong>
            {current && (
              <>
                <div className="crm-sidebar-user">
                  <span className="crm-avatar" aria-hidden="true">
                    {data?.user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <bdi>{data?.user.username}</bdi>
                    <small>{roleNames[current.role] || "عضو سازمان"}</small>
                  </span>
                </div>
                <LogoutButton />
                <a href="/organizations">
                  <ArrowLeftRight size={16} aria-hidden="true" />
                  تغییر سازمان
                </a>
              </>
            )}
          </div>
        </div>
      </aside>
      <div className="crm-body">
        <header className="crm-topbar">
          <div className="crm-page-context">
            <time>{date || "فضای کار سازمان"}</time>
            <strong>{title}</strong>
            {current && (
              <small className="crm-mobile-context">
                <span>{current.name}</span>
                <span aria-hidden="true"> · </span>
                <span>{roleNames[current.role] || "عضو سازمان"}</span>
              </small>
            )}
          </div>
          <div className="crm-account-actions">
            {current && (
              <>
                <a
                  className="crm-icon-button"
                  href="/activities"
                  aria-label="فعالیت‌ها و اعلان‌های من"
                >
                  <Bell size={20} aria-hidden="true" />
                </a>
                <a className="crm-user" href="/account/sessions">
                  <span className="crm-avatar" aria-hidden="true">
                    {data?.user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <bdi>{data?.user.username}</bdi>
                  <ChevronDown size={14} aria-hidden="true" />
                </a>
              </>
            )}
          </div>
        </header>
        <main id="account-main" tabIndex={-1} className="account-main crm-main">
          {children}
        </main>
        <footer className="crm-footer">
          <span>NewCRM · فضای کار سازمان شما</span>
          <a href="/account/sessions">
            <Settings2 size={15} aria-hidden="true" />
            مدیریت حساب و نشست‌ها
          </a>
        </footer>
      </div>
    </div>
  );
}
