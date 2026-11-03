"use client";
import { Target, Phone, Settings2 } from "lucide-react";
import { type Lead, statusLabel } from "../lib/leads";
import { formatAccountDate } from "../lib/format";
import { formatToman, displayPersianDate } from "../lib/sales-entry";
import { RecordStatus } from "./record-fields";
import type { ReactNode } from "react";
export function LeadProbability({
  value,
}: {
  value: number | null | undefined;
}) {
  return (
    <span className="lead-probability">
      {value === null || value === undefined ? (
        "ثبت نشده"
      ) : (
        <>
          <span>{new Intl.NumberFormat("fa-IR").format(value)}٪</span>
          <progress max={100} value={value} aria-label="احتمال موفقیت" />
        </>
      )}
    </span>
  );
}
export function LeadReferenceProfile({
  record,
  actions,
  children,
}: {
  record: Lead;
  actions: ReactNode;
  children: ReactNode;
}) {
  const priority =
    { high: "بالا", normal: "عادی", low: "پایین" }[record.priority] || "نامشخص";
  const facts = [
    ["منبع", record.source],
    ["مسئول", record.owner_label],
    ["ایجادکننده", record.created_by_label],
    [
      "تاریخ ایجاد",
      record.created_at ? formatAccountDate(record.created_at) : null,
    ],
    ["آخرین به‌روزرسانی", formatAccountDate(record.updated_at)],
    [
      "تاریخ بسته‌شدن مورد انتظار",
      record.expected_close_date
        ? displayPersianDate(record.expected_close_date)
        : null,
    ],
    ["برچسب‌ها", record.tags.join("، ")],
  ];
  return (
    <>
      <div className="customer-profile-actions">
        <span className="customer-profile-actions-label">عملیات لید</span>
        {actions}
      </div>
      <div className="customer-reference-detail lead-reference-detail">
        <aside className="customer-reference-side">
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Target size={18} aria-hidden="true" />
                اطلاعات سرنخ
              </h2>
            </div>
            <div className="customer-ref-panel-body customer-identity">
              <span className="customer-identity-avatar">
                <Target size={32} aria-hidden="true" />
              </span>
              <strong className="customer-identity-name">{record.title}</strong>
              <p>
                <RecordStatus
                  tone={
                    record.status === "converted"
                      ? "success"
                      : record.status === "qualified" ||
                          record.status === "proposal"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {statusLabel(record.status)}
                </RecordStatus>{" "}
                <RecordStatus
                  tone={record.priority === "high" ? "warning" : "neutral"}
                >
                  اولویت {priority}
                </RecordStatus>
              </p>
              <div className="lead-profile-metrics">
                <div
                  className={
                    record.estimated_amount &&
                    record.estimated_amount.length > 12
                      ? "lead-large-estimate"
                      : undefined
                  }
                >
                  <strong>{formatToman(record.estimated_amount)}</strong>
                  <span>ارزش تقریبی لید</span>
                </div>
                <div>
                  <LeadProbability value={record.probability} />
                  <span>احتمال موفقیت</span>
                </div>
              </div>
              <p className="crm-context-note">
                احتمال موفقیت، برآورد ثبت‌شده شماست و از وضعیت محاسبه نمی‌شود.
              </p>
            </div>
          </section>
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Phone size={18} aria-hidden="true" />
                اطلاعات تماس
              </h2>
            </div>
            <div className="customer-ref-panel-body">
              <dl className="customer-reference-contact">
                <div>
                  <dt>نام کامل</dt>
                  <dd>
                    {[record.first_name, record.last_name]
                      .filter(Boolean)
                      .join(" ") || "ثبت نشده"}
                    {record.contact_title && (
                      <span>{record.contact_title}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>ایمیل</dt>
                  <dd>
                    {record.emails?.length
                      ? record.emails.map((v) => (
                          <a href={`mailto:${v}`} key={v}>
                            <bdi>{v}</bdi>
                          </a>
                        ))
                      : "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt>تلفن</dt>
                  <dd>
                    {record.phones?.length
                      ? record.phones.map((v) => (
                          <a href={`tel:${v}`} key={v}>
                            <bdi>{v}</bdi>
                          </a>
                        ))
                      : "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt>شرکت</dt>
                  <dd>{record.company_name || "ثبت نشده"}</dd>
                </div>
              </dl>
            </div>
          </section>
        </aside>
        <div className="customer-reference-main">
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Settings2 size={18} aria-hidden="true" />
                اطلاعات مدیریتی
              </h2>
            </div>
            <div className="customer-ref-panel-body">
              <dl className="customer-definition">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "ثبت نشده"}</dd>
                  </div>
                ))}
              </dl>
              {[
                ["توضیحات لید", record.description],
                ["یادداشت‌ها", record.notes],
                ["دلیل رد ثبت‌شده", record.rejection_reason],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div className="customer-profile-notes" key={label}>
                    <h3>{label}</h3>
                    <p className="record-value-multiline">{value}</p>
                  </div>
                ))}
            </div>
          </section>
          {children}
        </div>
      </div>
    </>
  );
}
