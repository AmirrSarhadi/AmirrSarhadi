"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../lib/api";
import { type Page } from "../lib/customers";
import { formatToman } from "../lib/sales-entry";
import { type Opportunity } from "../lib/sales";
import { type Activity, activityStatuses } from "../lib/activities";
import { formatAccountDate } from "../lib/format";
import { ActionButton, LoadFailure } from "./account-ui";
import { Pager } from "./customer-controls";
import { CustomerTimeline } from "./customer-timeline";

type Props = {
  organizationId: string;
  userId: number;
  customerId: string;
  kind: "people" | "companies";
  operations: string[];
};
export function CustomerRelatedRecords(props: Props) {
  const { organizationId, userId, customerId, kind, operations } = props;
  const [section, setSection] = useState<
    "sales" | "activities" | "timeline" | null
  >(null);
  return (
    <section className="account-panel" aria-labelledby="customer-related-title">
      <h2 id="customer-related-title">پروندهٔ یکپارچه مشتری</h2>
      <p>
        فرصت‌های این پرونده و پیگیری‌های مستقیم یا متصل به فرصت‌های آن، در
        محدودهٔ دسترسی شما نمایش داده می‌شوند.
      </p>
      <div className="session-actions">
        <ActionButton
          className="secondary"
          aria-pressed={section === "timeline"}
          onClick={() => setSection(section === "timeline" ? null : "timeline")}
        >
          خط زمانی پرونده
        </ActionButton>
        {operations.includes("sale.view") && (
          <ActionButton
            className="secondary"
            aria-pressed={section === "sales"}
            onClick={() => setSection(section === "sales" ? null : "sales")}
          >
            فرصت‌های این پرونده
          </ActionButton>
        )}
        {operations.includes("activity.view") && (
          <ActionButton
            className="secondary"
            aria-pressed={section === "activities"}
            onClick={() =>
              setSection(section === "activities" ? null : "activities")
            }
          >
            پیگیری‌های این پرونده
          </ActionButton>
        )}
      </div>
      {section === "timeline" ? (
        <CustomerTimeline
          key={`timeline:${customerId}`}
          organizationId={organizationId}
          userId={userId}
          customerId={customerId}
          kind={kind}
        />
      ) : (
        section && (
          <RelatedList
            key={`${section}:${customerId}`}
            section={section}
            organizationId={organizationId}
            userId={userId}
            customerId={customerId}
            kind={kind}
          />
        )
      )}
    </section>
  );
}
export function RelatedList({
  section,
  organizationId,
  userId,
  customerId,
  kind,
}: Omit<Props, "operations" | "kind"> & {
  kind: "people" | "companies" | "leads";
  section: "sales" | "activities";
}) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    value: Page<Opportunity | Activity>;
  } | null>(null);
  const [error, setError] = useState("");
  const requestKey = `${page}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    const target =
      kind === "people" ? "person" : kind === "leads" ? "lead" : "company";
    const path =
      section === "sales"
        ? `opportunities/?${target}_id=${customerId}&page=${page}`
        : `?target_type=${target}&target_id=${customerId}&include_opportunities=${kind === "leads" ? "0" : "1"}&status=&mine=0&page=${page}`;
    api<Page<Opportunity | Activity>>(path, {
      namespace: section,
      organizationId,
      expectedUserId: userId,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, value });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof ApiError ? error.message : "فهرست دریافت نشد.",
          );
      });
    return () => controller.abort();
  }, [
    section,
    organizationId,
    userId,
    customerId,
    kind,
    page,
    revision,
    requestKey,
  ]);
  if (error)
    return (
      <LoadFailure
        title="فهرست مرتبط دریافت نشد"
        message={error}
        retry={() => setRevision((value) => value + 1)}
      />
    );
  if (!result || result.key !== requestKey)
    return <p role="status">در حال دریافت موارد مرتبط…</p>;
  const list = result.value;
  return (
    <div
      aria-label={
        section === "sales"
          ? "فهرست فرصت‌های پرونده"
          : "فهرست پیگیری‌های پرونده"
      }
    >
      <h3>{section === "sales" ? "فرصت‌های مرتبط" : "پیگیری‌های مرتبط"}</h3>
      {!list.results.length && (
        <p>مورد مرتبطی در دسترسی فعلی شما وجود ندارد.</p>
      )}
      <ul className="session-list">
        {list.results.map((item) => (
          <li key={item.id} className="session-item">
            <h4>
              <Link
                className="customer-link"
                href={`/${section === "sales" ? "opportunities" : "activities"}?record=${item.id}`}
              >
                {item.title}
              </Link>
            </h4>
            <p>مسئول: {item.owner_label}</p>
            {"amount" in item ? (
              <p>
                {item.stage_name} — {formatToman(item.amount)}
              </p>
            ) : (
              <p>
                {activityStatuses[item.status]} —{" "}
                {formatAccountDate(item.due_at)} —{" "}
                {item.target_type === "opportunity"
                  ? `فرصت: ${item.target_label}`
                  : "پیگیری مستقیم پرونده"}
              </p>
            )}
          </li>
        ))}
      </ul>
      <Pager
        page={page}
        count={list.count}
        previous={!!list.previous}
        next={!!list.next}
        onPage={setPage}
      />
      <ActionButton
        className="secondary"
        onClick={() => setRevision((value) => value + 1)}
      >
        تازه‌سازی موارد مرتبط
      </ActionButton>
    </div>
  );
}
