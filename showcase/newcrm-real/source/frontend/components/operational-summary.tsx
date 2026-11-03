"use client";
import { useEffect, useState } from "react";
import {
  Banknote,
  CalendarCheck2,
  ChartNoAxesCombined,
  CircleHelp,
  Clock3,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import { formatAccountDate } from "../lib/format";
import { LoadFailure } from "./account-ui";

type Snapshot = {
  generated_at: string;
  open_opportunities: {
    count: number;
    known_amount: string;
    unknown_amount_count: number;
  };
  my_activities: { today: number; overdue: number };
};
const count = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
export function OperationalSummary({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: number;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null);
    setError("");
    api<Snapshot>("dashboard/", {
      namespace: "sales",
      organizationId,
      expectedUserId: userId,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setSnapshot(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof ApiError ? error.message : "خلاصه دریافت نشد.",
          );
      });
    return () => controller.abort();
  }, [organizationId, userId, revision]);
  return (
    <section
      className="crm-summary"
      aria-labelledby="operational-summary-title"
    >
      <h2 id="operational-summary-title">خلاصهٔ فروش و پیگیری</h2>
      <p className="crm-summary-description">
        فروش در محدودهٔ دسترسی شما؛ پیگیری‌ها فقط کارهای خودتان هستند.
      </p>
      {error ? (
        <LoadFailure
          title="خلاصه بارگذاری نشد"
          message={error}
          retry={() => setRevision((value) => value + 1)}
        />
      ) : !snapshot ? (
        <p role="status">در حال دریافت خلاصه…</p>
      ) : (
        <>
          <dl className="crm-metrics">
            <div>
              <dt>
                <span className="crm-card-icon">
                  <ChartNoAxesCombined size={21} aria-hidden="true" />
                </span>
                فرصت‌های باز
              </dt>
              <dd>{count(snapshot.open_opportunities.count)}</dd>
            </div>
            <div>
              <dt>
                <span className="crm-card-icon">
                  <Banknote size={21} aria-hidden="true" />
                </span>
                جمع مبلغ معلوم فرصت‌های باز
              </dt>
              <dd>
                {new Intl.NumberFormat("fa-IR").format(
                  BigInt(snapshot.open_opportunities.known_amount),
                )}{" "}
                تومان
              </dd>
            </div>
            <div>
              <dt>
                <span className="crm-card-icon">
                  <CircleHelp size={21} aria-hidden="true" />
                </span>
                فرصت باز با مبلغ نامشخص
              </dt>
              <dd>{count(snapshot.open_opportunities.unknown_amount_count)}</dd>
            </div>
            <div>
              <dt>
                <span className="crm-card-icon">
                  <CalendarCheck2 size={21} aria-hidden="true" />
                </span>
                پیگیری‌های امروز من
              </dt>
              <dd>{count(snapshot.my_activities.today)}</dd>
            </div>
            <div>
              <dt>
                <span className="crm-card-icon">
                  <Clock3 size={21} aria-hidden="true" />
                </span>
                پیگیری‌های عقب‌افتادهٔ من
              </dt>
              <dd>{count(snapshot.my_activities.overdue)}</dd>
            </div>
          </dl>
          <p className="crm-context-note">
            امروز بر اساس ساعت تهران است؛ کار عقب‌افتادهٔ امروز در هر دو شمارش
            می‌آید. موارد بایگانی‌شده محاسبه نمی‌شوند.
          </p>
          <p className="crm-context-note">
            به‌روزرسانی: {formatAccountDate(snapshot.generated_at)}
          </p>
          <button
            className="account-button secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            تازه‌سازی خلاصه
          </button>
        </>
      )}
    </section>
  );
}
