"use client";
import Link from "next/link";
import {
  UserRound,
  Phone,
  Building2,
  Settings2,
  Mail,
  MapPin,
  Globe,
  FileText,
  Activity,
} from "lucide-react";
import { displayName, type Customer } from "../lib/customers";
import { formatAccountDate } from "../lib/format";
import { RecordStatus } from "./record-fields";
import type { ReactNode } from "react";
export function CustomerReferenceProfile({
  record,
  children,
  actions,
}: {
  record: Customer;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <>
      <div className="customer-profile-actions">
        <div>
          <span className="customer-profile-code">{record.customer_code}</span>
          <span className="customer-profile-actions-label">عملیات پرونده</span>
        </div>
        {actions}
      </div>
      <div className="customer-reference-detail">
        <aside className="customer-reference-side">
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <UserRound size={19} aria-hidden="true" />
                اطلاعات شخصی
              </h2>
            </div>
            <div className="customer-ref-panel-body customer-identity">
              <span className="customer-identity-avatar">
                <UserRound size={34} aria-hidden="true" />
              </span>
              <strong className="customer-identity-name">
                {displayName(record)}
              </strong>
              {record.title && <p>{record.title}</p>}
              <p>
                <RecordStatus
                  tone={
                    record.status === "active"
                      ? "success"
                      : record.status === "potential"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {record.status === "active"
                    ? "فعال"
                    : record.status === "potential"
                      ? "مشتری بالقوه"
                      : "غیرفعال"}
                </RecordStatus>{" "}
                <RecordStatus>
                  {record.customer_type === "legal" ? "حقوقی" : "حقیقی"}
                </RecordStatus>
              </p>
              <div className="customer-summary">
                <Activity size={17} aria-hidden="true" />
                <strong>
                  {new Intl.NumberFormat("fa-IR").format(
                    record.activity_count || 0,
                  )}
                </strong>
                <span>فعالیت‌ها</span>
              </div>
              <p className="crm-context-note">
                فرصت‌های فروش و پیگیری‌ها در بخش پروندهٔ یکپارچه در دسترس‌اند.
              </p>
            </div>
          </section>
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Phone size={19} aria-hidden="true" />
                اطلاعات تماس
              </h2>
            </div>
            <div className="customer-ref-panel-body">
              <dl className="customer-reference-contact">
                <div>
                  <dt>
                    <Mail size={15} aria-hidden="true" />
                    ایمیل
                  </dt>
                  <dd>
                    {record.emails?.length
                      ? record.emails.map((value) => (
                          <a key={value} href={"mailto:" + value}>
                            <bdi>{value}</bdi>
                          </a>
                        ))
                      : "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt>
                    <Phone size={15} aria-hidden="true" />
                    شماره‌های تماس
                  </dt>
                  <dd>
                    {record.phones?.length
                      ? record.phones.map((value) => (
                          <a key={value} href={"tel:" + value}>
                            <bdi>{value}</bdi>
                          </a>
                        ))
                      : "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt>
                    <MapPin size={15} aria-hidden="true" />
                    آدرس
                  </dt>
                  <dd>
                    {record.street || "ثبت نشده"}
                    <br />
                    {[record.province, record.city].filter(Boolean).join("، ")}
                    {record.postal_code && (
                      <>
                        <br />
                        کد پستی: <bdi>{record.postal_code}</bdi>
                      </>
                    )}
                  </dd>
                </div>
                {record.website && (
                  <div>
                    <dt>
                      <Globe size={15} aria-hidden="true" />
                      وب‌سایت
                    </dt>
                    <dd>
                      <a href={record.website} target="_blank" rel="noreferrer">
                        <bdi>{record.website}</bdi>
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        </aside>
        <div className="customer-reference-main">
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Building2 size={19} aria-hidden="true" />
                اطلاعات شرکت
              </h2>
            </div>
            <div className="customer-ref-panel-body">
              <p>
                {record.company_label ||
                  "شرکتی در دسترسی فعلی شما ثبت نشده است."}
              </p>
              {record.primary_company_id && (
                <Link
                  className="customer-link"
                  href={`/customers?kind=companies&record=${record.primary_company_id}`}
                >
                  مشاهده شرکت
                </Link>
              )}
              {record.industry && <p>صنعت: {record.industry}</p>}
            </div>
          </section>
          <section className="account-panel customer-ref-panel">
            <div className="customer-ref-panel-heading">
              <h2>
                <Settings2 size={19} aria-hidden="true" />
                اطلاعات مدیریتی
              </h2>
            </div>
            <div className="customer-ref-panel-body">
              <dl className="customer-definition">
                <div>
                  <dt>کد مشتری</dt>
                  <dd>
                    <RecordStatus>
                      {record.customer_code || "ثبت نشده"}
                    </RecordStatus>
                  </dd>
                </div>
                <div>
                  <dt>تاریخ ثبت</dt>
                  <dd>
                    {record.created_at
                      ? formatAccountDate(record.created_at)
                      : "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt>ثبت‌کننده</dt>
                  <dd>{record.created_by_label || "عضو سازمان"}</dd>
                </div>
                <div>
                  <dt>مسئول پرونده</dt>
                  <dd>{record.owner_label}</dd>
                </div>
                <div>
                  <dt>منبع</dt>
                  <dd>{record.source || "ثبت نشده"}</dd>
                </div>
                <div>
                  <dt>برچسب‌ها</dt>
                  <dd>{record.tags.join("، ") || "ثبت نشده"}</dd>
                </div>
              </dl>
              {record.notes && (
                <div className="customer-profile-notes">
                  <h3>
                    <FileText size={16} aria-hidden="true" />
                    یادداشت‌ها
                  </h3>
                  <p className="record-value-multiline">{record.notes}</p>
                </div>
              )}
            </div>
          </section>
          {children}
        </div>
      </div>
    </>
  );
}
