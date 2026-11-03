"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatToman, displayPersianDate } from "../lib/sales-entry";
import { quantityDisplay } from "../lib/products";
import { LoadFailure } from "./account-ui";
import { RecordStatus } from "./record-fields";
import { Pager } from "./customer-controls";
import type { Page } from "../lib/customers";
type Row = {
  id: number;
  order_id: string;
  number: string;
  quantity: string;
  unit_price: string;
  total: string;
  date: string;
  status: string;
  customer_label: string;
};
type Sales = Page<Row> & {
  summary: {
    orders: number;
    quantity: string;
    total: string;
    last_sale_date: string | null;
  };
};
export function ProductSales({
  id,
  org,
  user,
}: {
  id: string;
  org: string;
  user: number;
}) {
  const [data, setData] = useState<Sales | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError("");
    api<Sales>(`${id}/sales/?page=${page}`, {
      namespace: "products",
      organizationId: org,
      expectedUserId: user,
      signal: ctrl.signal,
    })
      .then((v) => {
        if (!ctrl.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [id, org, user, page, retry]);
  if (error)
    return <LoadFailure message={error} retry={() => setRetry((v) => v + 1)} />;
  return (
    <section className="account-panel customer-editor product-sales">
      <h2>آمار و فروش‌های این محصول</h2>
      {!data ? (
        <p role="status">در حال دریافت فروش‌ها…</p>
      ) : (
        <>
          <div className="product-metrics">
            <div>
              <strong>
                {new Intl.NumberFormat("fa-IR").format(data.summary.orders)}
              </strong>
              <span>تعداد فروش</span>
            </div>
            <div>
              <strong>{quantityDisplay(data.summary.quantity)}</strong>
              <span>تعداد فروخته‌شده</span>
            </div>
            <div>
              <strong>{formatToman(data.summary.total)}</strong>
              <span>جمع اقلام پیش از مالیات و تخفیف کلی</span>
            </div>
          </div>
          <p className="crm-context-note">
            فقط فروش‌های متصل، لغونشده و قابل مشاهدهٔ شما. آخرین فروش:{" "}
            {data.summary.last_sale_date
              ? displayPersianDate(data.summary.last_sale_date)
              : "ثبت نشده"}
          </p>
          {data.count ? (
            <>
              <div
                className="customer-table-scroll"
                role="region"
                aria-label="فروش‌های محصول"
                tabIndex={0}
              >
                <table className="customer-table">
                  <thead>
                    <tr>
                      {[
                        "شماره فروش",
                        "مشتری",
                        "تعداد",
                        "قیمت واحد",
                        "جمع",
                        "تاریخ",
                        "وضعیت",
                      ].map((v) => (
                        <th key={v} scope="col">
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <a
                            className="customer-link"
                            href={"/sales?record=" + r.order_id}
                          >
                            {r.number}
                          </a>
                        </td>
                        <td>{r.customer_label}</td>
                        <td>{quantityDisplay(r.quantity)}</td>
                        <td>{formatToman(r.unit_price)}</td>
                        <td>{formatToman(r.total)}</td>
                        <td>{displayPersianDate(r.date)}</td>
                        <td>
                          <RecordStatus>
                            {
                              (
                                {
                                  pending: "در انتظار",
                                  confirmed: "تأیید شده",
                                  delivered: "تحویل شده",
                                  cancelled: "لغو شده",
                                } as Record<string, string>
                              )[r.status]
                            }
                          </RecordStatus>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={page}
                count={data.count}
                previous={!!data.previous}
                next={!!data.next}
                busy={false}
                onPage={setPage}
              />
            </>
          ) : (
            <p>هنوز فروش متصلی در محدودهٔ دسترسی شما ثبت نشده است.</p>
          )}
        </>
      )}
    </section>
  );
}
