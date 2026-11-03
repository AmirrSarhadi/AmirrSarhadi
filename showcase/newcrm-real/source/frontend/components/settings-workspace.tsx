"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Settings2,
  Building2,
  Mail,
  Image as ImageIcon,
  Database,
  ScrollText,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { useDraftNavigation } from "../lib/use-draft-navigation";
import {
  ActionButton,
  Feedback,
  LoadingAccount,
  LoadFailure,
} from "./account-ui";
import { FormField, ConfirmPanel, Pager } from "./customer-controls";
import { RecordFields } from "./record-fields";
import { customerFileRequest, downloadBlob } from "../lib/customer-files";
import { formatAccountDate } from "../lib/format";
import type { FieldSpec } from "../lib/fields";
type Config = {
  version: number;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  tax_rate: string;
  currency: string;
  page_size: number;
  log_retention_days: number;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_security: string;
  sender_email: string;
  sender_name: string;
  has_smtp_password: boolean;
  has_logo: boolean;
  has_favicon: boolean;
};
type Log = { id: number; actor: string; action: string; created_at: string };
type Logs = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Log[];
};
const generalFields: FieldSpec[] = [
  { name: "company_name", label: "نام شرکت", length: 160 },
  { name: "phone", label: "تلفن شرکت", length: 40, direction: "ltr" },
  {
    name: "email",
    label: "ایمیل شرکت",
    type: "email",
    direction: "ltr",
    length: 254,
  },
  { name: "currency", label: "واحد پول", readOnly: true },
  { name: "address", label: "آدرس شرکت", lines: true, length: 2000 },
  {
    name: "tax_rate",
    label: "نرخ مالیات پیش‌فرض (%)",
    direction: "ltr",
    length: 6,
  },
  {
    name: "page_size",
    label: "تعداد رکورد در صفحه",
    options: [20, 50, 100].map((v) => ({
      value: String(v),
      label: new Intl.NumberFormat("fa-IR").format(v),
    })),
  },
  {
    name: "log_retention_days",
    label: "نگهداری لاگ‌های عملیاتی",
    options: [30, 90, 180, 365].map((v) => ({
      value: String(v),
      label: new Intl.NumberFormat("fa-IR").format(v) + " روز",
    })),
  },
];
const emailFields: FieldSpec[] = [
  { name: "smtp_host", label: "سرور SMTP", length: 253, direction: "ltr" },
  { name: "smtp_port", label: "پورت", length: 5, direction: "ltr" },
  {
    name: "smtp_username",
    label: "نام کاربری SMTP",
    length: 254,
    direction: "ltr",
  },
  {
    name: "sender_email",
    label: "ایمیل فرستنده",
    type: "email",
    length: 254,
    direction: "ltr",
  },
  { name: "sender_name", label: "نام فرستنده", length: 160 },
  {
    name: "smtp_security",
    label: "نوع رمزگذاری",
    options: [
      { value: "tls", label: "TLS (STARTTLS)" },
      { value: "ssl", label: "SSL / TLS" },
    ],
  },
];
const actions: Record<string, string> = {
  general_updated: "تنظیمات عمومی ذخیره شد",
  email_updated: "تنظیمات ایمیل ذخیره شد",
  logo_updated: "لوگو تغییر کرد",
  favicon_updated: "آیکون مرورگر تغییر کرد",
  backup_downloaded: "نسخه داده‌ها دریافت شد",
  logs_cleaned: "لاگ‌های عملیاتی قدیمی پاک شدند",
};
const n = (v: number) => new Intl.NumberFormat("fa-IR").format(v);
const draft = (data: Config, fields: FieldSpec[]) =>
  Object.fromEntries(
    fields
      .filter((f) => f.name !== "currency")
      .map((f) => [f.name, String(data[f.name as keyof Config])]),
  );
export function SettingsWorkspace() {
  const { account, refresh } = useAccount();
  const ready = account.phase === "ready" && account.data.current;
  const org = ready ? ready.organization_id : "";
  const user = account.phase === "ready" ? account.data.user.user_id : 0;
  const identity = org + ":" + user;
  const allowed =
    account.phase === "ready" &&
    account.data.operations.includes("settings.manage");
  const [data, setData] = useState<Config | null>(null),
    [general, setGeneral] = useState<Record<string, string>>({}),
    [email, setEmail] = useState<Record<string, string>>({}),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [clearPassword, setClearPassword] = useState(false),
    [confirmSecretClear, setConfirmSecretClear] = useState(false),
    [stats, setStats] = useState<Record<string, number> | null>(null),
    [logs, setLogs] = useState<Logs | null>(null),
    [logsError, setLogsError] = useState(""),
    [logsPage, setLogsPage] = useState(1),
    [showLogs, setShowLogs] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [readError, setReadError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [stamp, setStamp] = useState<object | null>(null),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [files, setFiles] = useState<{ logo: File | null; favicon: File | null }>({
      logo: null,
      favicon: null,
    }),
    [cleanup, setCleanup] = useState<{
      count: number;
      confirmation: string;
    } | null>(null),
    [remove, setRemove] = useState<"logo" | "favicon" | null>(null);
  const scope = useRef(""),
    currentAccount = useRef(account);
  currentAccount.current = account;
  const mutation = useRef<AbortController | null>(null),
    pending = useRef(false),
    configRef = useRef(data);
  configRef.current = data;
  const dirty =
    !!data &&
    (JSON.stringify(general) !== JSON.stringify(draft(data, generalFields)) ||
      JSON.stringify(email) !== JSON.stringify(draft(data, emailFields)) ||
      !!password ||
      clearPassword ||
      !!files.logo ||
      !!files.favicon);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const guard = useDraftNavigation(dirty, !!busy, () => {
    setPassword("");
    setFiles({ logo: null, favicon: null });
  });
  const options = { organizationId: org, expectedUserId: user };
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    if (!ready || !allowed) return;
    const controller = new AbortController();
    const changed = scope.current !== identity;
    scope.current = identity;
    if (changed) {
      mutation.current?.abort();
      pending.current = false;
      setBusy("");
      setData(null);
      setPassword("");
      setShowPassword(false);
      setClearPassword(false);
      setConfirmSecretClear(false);
      setFiles({ logo: null, favicon: null });
      setError("");
      setMessage("");
      setErrors({});
      setShowLogs(false);
      setLogs(null);
      setCleanup(null);
      setRemove(null);
      setUncertain(false);
      guard.reset();
    }
    setStamp(null);
    setReadError("");
    Promise.all([
      api<Config>("settings/", { ...options, signal: controller.signal }),
      api<Record<string, number>>("settings/stats/", {
        ...options,
        signal: controller.signal,
      }),
    ])
      .then(([config, statistics]) => {
        if (controller.signal.aborted) return;
        if (changed || !dirtyRef.current) {
          setData(config);
          setGeneral(draft(config, generalFields));
          setEmail(draft(config, emailFields));
        } else if (
          configRef.current &&
          config.version !== configRef.current.version
        ) {
          setError(
            "تنظیمات تغییر کرده است؛ پیش‌نویس حفظ شد. برای بازخوانی و شروع دوباره، تغییرات را کنار بگذارید.",
          );
          setUncertain(true);
        }
        setStats(statistics);
        setStamp(account);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setReadError(e.message);
          setStamp(account);
        }
      });
    return () => controller.abort();
  }, [account, identity, retry, allowed]);
  useEffect(() => {
    if (!ready || !allowed || !showLogs) return;
    const controller = new AbortController();
    setLogs(null);
    setLogsError("");
    api<Logs>("settings/logs/?page=" + logsPage, {
      ...options,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setLogs(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setLogsError(e.message);
      });
    return () => controller.abort();
  }, [account, showLogs, logsPage, retry]);
  async function mutate(
    label: string,
    run: (signal: AbortSignal) => Promise<Config | { deleted: number }>,
    section?: "general" | "email",
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(label);
    setError("");
    setMessage("");
    setErrors({});
    const controller = new AbortController();
    mutation.current = controller;
    const snapshot = currentAccount.current;
    try {
      const result = await run(controller.signal);
      if (controller.signal.aborted || currentAccount.current !== snapshot) {
        setUncertain(true);
        return;
      }
      if ("version" in result) {
        setData(result);
        if (section === "general") setGeneral(draft(result, generalFields));
        if (section === "email") {
          setEmail(draft(result, emailFields));
          setPassword("");
          setClearPassword(false);
          setShowPassword(false);
        }
        window.dispatchEvent(new Event("newcrm-branding"));
        if (section === "general")
          window.dispatchEvent(new Event("newcrm-organization-updated"));
      } else {
        setCleanup(null);
      }
      setRetry((v) => v + 1);
      setUncertain(false);
      setMessage("تغییرات ذخیره شد.");
    } catch (e) {
      if (controller.signal.aborted) return;
      const failure = e as ApiError;
      setError(failure.message);
      if (failure.status === 400) {
        setErrors(
          Object.fromEntries(
            Object.entries(failure.fields).map(([key, value]) => [
              key,
              value.join(" "),
            ]),
          ),
        );
        setTimeout(
          () =>
            document
              .querySelector<HTMLElement>(
                '.settings-workspace [aria-invalid="true"]',
              )
              ?.focus(),
          0,
        );
      } else if ([0, 409].includes(failure.status)) {
        setUncertain(true);
        setCleanup(null);
      }
      if (failure.status === 403) void refresh();
    } finally {
      if (mutation.current === controller) {
        pending.current = false;
        setBusy("");
      }
    }
  }
  function save(
    event: FormEvent | undefined,
    section: "general" | "email",
    approved = false,
  ) {
    event?.preventDefault();
    if (!data || uncertain) return;
    if (
      section === "email" &&
      clearPassword &&
      data.has_smtp_password &&
      !approved
    ) {
      setConfirmSecretClear(true);
      return;
    }
    setConfirmSecretClear(false);
    const values = section === "general" ? general : email;
    if (section === "general" && !general.company_name.trim()) {
      setErrors({ company_name: "نام شرکت را وارد کنید." });
      document.getElementById("settings-company_name")?.focus();
      return;
    }
    void mutate(
      section,
      (signal) =>
        api<Config>("settings/", {
          ...options,
          method: "PATCH",
          signal,
          body: {
            section,
            version: data.version,
            ...values,
            ...(section === "email"
              ? { smtp_password: password, clear_password: clearPassword }
              : {}),
          },
        }),
      section,
    );
  }
  async function upload(kind: "logo" | "favicon") {
    if (!data || !files[kind]) return;
    const file = files[kind]!;
    await mutate(kind, async (signal) => {
      const response = await customerFileRequest(
        "tenancy/settings/branding/" + kind + "/",
        org,
        user,
        { file, signal, version: data.version },
      );
      const result = await response.json();
      setFiles((previous) => ({ ...previous, [kind]: null }));
      return result;
    });
  }
  async function backup() {
    if (pending.current) return;
    pending.current = true;
    setBusy("backup");
    setError("");
    const controller = new AbortController();
    mutation.current = controller;
    const snapshot = currentAccount.current;
    try {
      const response = await customerFileRequest(
        "tenancy/settings/backup/",
        org,
        user,
        { signal: controller.signal },
      );
      const blob = await response.blob();
      if (!controller.signal.aborted && snapshot === currentAccount.current) {
        downloadBlob(blob, "newcrm-organization-backup.zip");
        setRetry((v) => v + 1);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (mutation.current === controller) {
        pending.current = false;
        setBusy("");
      }
    }
  }
  async function previewCleanup() {
    if (pending.current) return;
    pending.current = true;
    setBusy("cleanup");
    setError("");
    const controller = new AbortController();
    mutation.current = controller;
    const snapshot = currentAccount.current;
    try {
      const result = await api<{ count: number; confirmation: string }>(
        "settings/logs/cleanup/",
        { ...options, body: {}, signal: controller.signal },
      );
      if (!controller.signal.aborted && snapshot === currentAccount.current)
        setCleanup(result);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (mutation.current === controller) {
        pending.current = false;
        setBusy("");
      }
    }
  }
  if (account.phase === "loading") return <LoadingAccount />;
  if (account.phase === "error")
    return (
      <LoadFailure
        title="حساب دریافت نشد"
        message={account.message}
        retry={() => void refresh()}
      />
    );
  if (!ready)
    return (
      <p>
        <a href="/organizations">انتخاب سازمان</a>
      </p>
    );
  if (!allowed)
    return (
      <section className="account-panel">
        <h1>دسترسی به تنظیمات ندارید</h1>
        <p>تنظیمات سیستم در اختیار مدیران سازمان است.</p>
      </section>
    );
  if (readError)
    return (
      <>
        <LoadFailure
          title="تنظیمات دریافت نشد"
          message={readError}
          retry={() => setRetry((v) => v + 1)}
        />
        {dirty && <p>پیش‌نویس در این صفحه حفظ شده است.</p>}
      </>
    );
  if (stamp !== account || !data) return <LoadingAccount />;
  const disabled = !!busy || uncertain;
  const asset = (kind: "logo" | "favicon") =>
    `/api/v1/tenancy/settings/branding/${kind}/?v=${data.version}&organization=${org}`;
  return (
    <section className="customer-workspace settings-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{ready.name}</span>
          <h1>تنظیمات سیستم</h1>
          <p className="account-description">
            مدیریت تنظیمات سازمان، هویت و ابزارهای سیستم
          </p>
        </div>
        <Settings2 aria-hidden="true" />
      </div>
      <Feedback message={error || message} kind={error ? "error" : "info"} />
      {uncertain && (
        <div className="account-panel">
          <p>
            ذخیره دوباره متوقف است. نسخه ثبت‌شده را بخوانید و سپس تغییرات را
            دوباره وارد کنید.
          </p>
          <ActionButton
            className="secondary"
            onClick={() =>
              guard.navigate(() => {
                dirtyRef.current = false;
                setPassword("");
                setClearPassword(false);
                setFiles({ logo: null, favicon: null });
                setGeneral(draft(data, generalFields));
                setEmail(draft(data, emailFields));
                setData(null);
                setUncertain(false);
                setError("");
                setRetry((v) => v + 1);
              })
            }
          >
            کنار گذاشتن پیش‌نویس و بازخوانی
          </ActionButton>
        </div>
      )}
      {guard.confirming && (
        <ConfirmPanel
          title="تغییرات ذخیره نشده‌اند"
          description="برای حفظ تغییرات انصراف دهید؛ ادامه پیش‌نویس را کنار می‌گذارد."
          label="کنار گذاشتن پیش‌نویس"
          busy={!!busy}
          onCancel={guard.cancel}
          onConfirm={guard.confirm}
        />
      )}
      {confirmSecretClear && (
        <ConfirmPanel
          title="پاک‌کردن رمز SMTP"
          description="رمز ذخیره‌شده این سازمان حذف می‌شود. برای اتصال نیازمند رمز، باید رمز تازه وارد کنید."
          label="حذف رمز و ذخیره تنظیمات"
          danger
          busy={!!busy}
          onCancel={() => setConfirmSecretClear(false)}
          onConfirm={() => save(undefined, "email", true)}
        />
      )}
      {cleanup && (
        <ConfirmPanel
          title="پاک‌سازی لاگ‌های عملیاتی"
          description={`${n(cleanup.count)} لاگ ابزارهای سیستم قدیمی‌تر از ${n(data.log_retention_days)} روز پاک می‌شود. تاریخچه پرونده‌ها و رویدادهای امنیتی حفظ می‌شوند.`}
          label="پاک‌کردن لاگ‌های مشخص‌شده"
          danger
          busy={!!busy}
          onCancel={() => setCleanup(null)}
          onConfirm={() =>
            void mutate("cleanup", (signal) =>
              api("settings/logs/cleanup/", {
                ...options,
                signal,
                body: { confirmation: cleanup.confirmation },
              }),
            )
          }
        />
      )}
      {remove && (
        <ConfirmPanel
          title="حذف تصویر سازمان"
          description="تصویر انتخابی حذف و نشان پیش‌فرض نمایش داده می‌شود."
          label="حذف تصویر"
          danger
          busy={!!busy}
          onCancel={() => setRemove(null)}
          onConfirm={() => {
            const kind = remove;
            void mutate(kind, (signal) =>
              api<Config>(`settings/branding/${kind}/`, {
                ...options,
                method: "DELETE",
                signal,
                body: { version: data.version },
              }),
            ).then(() => setRemove(null));
          }}
        />
      )}
      <div className="settings-grid">
        <div className="settings-main">
          <form
            className="account-panel customer-editor"
            noValidate
            onSubmit={(e) => save(e, "general")}
          >
            <h2>
              <Building2 size={19} aria-hidden="true" /> تنظیمات عمومی
            </h2>
            <div className="customer-fields">
              <RecordFields
                prefix="settings"
                fields={generalFields}
                draft={{ ...general, currency: "تومان" }}
                errors={errors}
                disabled={disabled}
                onChange={(key, value) => {
                  setGeneral({ ...general, [key]: value });
                  setErrors({ ...errors, [key]: "" });
                }}
              />
            </div>
            <p className="field-hint">
              نرخ مالیات پیشنهاد محاسبه برای فروش تازه است؛ مبلغ فروش‌های
              ثبت‌شده تغییر نمی‌کند. تعداد رکورد در فهرست‌های صفحه‌بندی‌شده
              اعمال می‌شود.
            </p>
            <ActionButton
              type="submit"
              disabled={disabled}
              busy={busy === "general"}
            >
              ذخیره تنظیمات عمومی
            </ActionButton>
          </form>
          <section className="account-panel customer-editor">
            <h2>
              <ImageIcon size={19} aria-hidden="true" /> لوگو و آیکون مرورگر
            </h2>
            <p className="crm-context-note">
              PNG، JPEG، WEBP یا ICO تا یک مگابایت؛ تصویر پس از ذخیره در همین
              سازمان نمایش داده می‌شود.
            </p>
            <div className="settings-assets">
              {(["logo", "favicon"] as const).map((kind) => (
                <div key={kind}>
                  <FormField
                    id={"settings-" + kind}
                    label={kind === "logo" ? "لوگوی شرکت" : "آیکون مرورگر"}
                    error={errors.file}
                  >
                    <input
                      id={"settings-" + kind}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                      disabled={disabled}
                      onChange={(event) => {
                        setFiles({
                          ...files,
                          [kind]: event.target.files?.[0] || null,
                        });
                        event.target.value = "";
                      }}
                    />
                  </FormField>
                  <div className="settings-asset-preview">
                    {data[kind === "logo" ? "has_logo" : "has_favicon"] ? (
                      <img
                        src={asset(kind)}
                        alt={
                          kind === "logo"
                            ? "لوگوی ثبت‌شده شرکت"
                            : "آیکون ثبت‌شده مرورگر"
                        }
                        width="96"
                        height="96"
                      />
                    ) : (
                      <span>تصویری ثبت نشده است.</span>
                    )}
                  </div>
                  <p className="field-hint">
                    {files[kind]?.name || "فایل تازه‌ای انتخاب نشده است."}
                  </p>
                  <div className="session-actions">
                    <ActionButton
                      disabled={disabled || !files[kind]}
                      busy={busy === kind}
                      onClick={() => void upload(kind)}
                    >
                      {kind === "logo" ? "ذخیره لوگو" : "ذخیره آیکون"}
                    </ActionButton>
                    {data[kind === "logo" ? "has_logo" : "has_favicon"] && (
                      <ActionButton
                        className="secondary danger"
                        disabled={disabled}
                        onClick={() => setRemove(kind)}
                      >
                        حذف تصویر
                      </ActionButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <form
            className="account-panel customer-editor"
            noValidate
            onSubmit={(e) => save(e, "email")}
          >
            <h2>
              <Mail size={19} aria-hidden="true" /> تنظیمات ایمیل
            </h2>
            <p className="crm-context-note">
              ذخیره تنظیمات پیام ارسال نمی‌کند. کانال بازیابی پیامکی حساب‌ها
              مستقل است.
            </p>
            <div className="customer-fields">
              <RecordFields
                prefix="settings"
                fields={emailFields}
                draft={email}
                errors={errors}
                disabled={disabled}
                onChange={(key, value) => {
                  setEmail({ ...email, [key]: value });
                  setErrors({ ...errors, [key]: "" });
                }}
              />
              <FormField
                id="settings-smtp_password"
                label="رمز عبور SMTP"
                error={errors.smtp_password}
                hint={
                  data.has_smtp_password
                    ? "رمز ذخیره شده است؛ خالی‌گذاشتن آن را حفظ می‌کند."
                    : "رمزی ذخیره نشده است."
                }
              >
                <div className="password-control">
                  <input
                    id="settings-smtp_password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={2000}
                    autoComplete="new-password"
                    disabled={disabled}
                    aria-invalid={!!errors.smtp_password}
                    aria-describedby="settings-smtp_password-error settings-smtp_password-hint"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="customer-link"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
                  </button>
                </div>
              </FormField>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  disabled={disabled}
                  onChange={(e) => setClearPassword(e.target.checked)}
                />
                پاک‌کردن رمز ذخیره‌شده
              </label>
            </div>
            <ActionButton
              type="submit"
              disabled={disabled}
              busy={busy === "email"}
            >
              ذخیره تنظیمات ایمیل
            </ActionButton>
          </form>
        </div>
        <aside className="settings-aside">
          <section className="account-panel">
            <h2>
              <Database size={19} aria-hidden="true" /> آمار سازمان
            </h2>
            {stats ? (
              <dl className="settings-stats">
                {Object.entries({
                  users: "کاربران فعال",
                  customers: "پرونده‌های شخص",
                  companies: "شرکت‌ها",
                  leads: "لیدها",
                  activities: "فعالیت‌ها",
                  sales: "فروش‌ها",
                }).map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{n(stats[key])}</dd>
                  </div>
                ))}
                <div>
                  <dt>حجم پیوست‌ها</dt>
                  <dd>{n(stats.attachment_bytes)} بایت</dd>
                </div>
                <div>
                  <dt>لاگ‌های عملیاتی</dt>
                  <dd>{n(stats.operational_logs)}</dd>
                </div>
              </dl>
            ) : (
              <LoadingAccount />
            )}
            <p className="field-hint">
              پرونده‌های بایگانی‌نشده در سازمان فعال؛ حجم، مربوط به پیوست‌هاست.
            </p>
          </section>
          <section className="account-panel">
            <h2>ابزارهای سیستم</h2>
            <p className="crm-context-note">
              نسخه ZIP شامل داده‌های تجاری و پیوست‌های این سازمان است. رمزها،
              حساب‌های ورود و زیرساخت پایگاه داده در آن نیستند؛ بازیابی به ابزار
              مدیر نیاز دارد.
            </p>
            <div className="settings-tools">
              <ActionButton
                disabled={!!busy}
                busy={busy === "backup"}
                onClick={() => void backup()}
              >
                دریافت نسخه پشتیبان داده‌ها
              </ActionButton>
              <ActionButton
                className="secondary danger"
                disabled={disabled}
                busy={busy === "cleanup"}
                onClick={() => void previewCleanup()}
              >
                بررسی لاگ‌های قدیمی برای پاک‌سازی
              </ActionButton>
              <ActionButton
                className="secondary"
                disabled={!!busy}
                onClick={() => {
                  setShowLogs(!showLogs);
                  setLogsPage(1);
                }}
              >
                <ScrollText size={17} aria-hidden="true" />
                {showLogs ? "بستن لاگ‌های عملیاتی" : "مشاهده لاگ‌های عملیاتی"}
              </ActionButton>
            </div>
          </section>
        </aside>
      </div>
      {showLogs && (
        <section className="account-panel">
          <h2>لاگ‌های عملیاتی سیستم</h2>
          <p className="crm-context-note">
            ثبت تغییر تنظیمات و ابزارهای مدیریتی؛ سابقه امنیتی و تاریخچه
            پرونده‌ها مستقل‌اند.
          </p>
          {logsError ? (
            <LoadFailure
              title="لاگ‌ها دریافت نشد"
              message={logsError}
              retry={() => setRetry((v) => v + 1)}
            />
          ) : !logs ? (
            <LoadingAccount />
          ) : (
            <>
              <div
                className="customer-table-scroll"
                role="region"
                aria-label="لاگ‌های عملیاتی"
                tabIndex={0}
              >
                <table className="customer-table">
                  <thead>
                    <tr>
                      <th>عملیات</th>
                      <th>کاربر</th>
                      <th>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.results.map((log) => (
                      <tr key={log.id}>
                        <td>{actions[log.action] || log.action}</td>
                        <td>
                          <bdi>{log.actor}</bdi>
                        </td>
                        <td>{formatAccountDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!logs.count && <p>لاگی ثبت نشده است.</p>}
              <Pager
                page={logsPage}
                count={logs.count}
                previous={!!logs.previous}
                next={!!logs.next}
                busy={!!busy}
                onPage={setLogsPage}
              />
            </>
          )}
        </section>
      )}
    </section>
  );
}
