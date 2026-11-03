import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useDealerSubscription } from "../../hooks/useOwnerDealer";
import { getOwnerHistory } from "../../services/dealerOwnerService";
import {
    adminDate,
    subscriptionStatuses,
    paymentStatuses,
} from "../../services/adminLabels";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import { PlanDetails } from "./DealerPlansPage";
import { formatPrice, toPersianNumber } from "../../utils/formatters";
import "./DealerSubscriptionPage.scss";
function OwnerHistory({ resource }) {
    const [params, setParams] = useSearchParams();
    const key = resource === "payments" ? "payment_page" : "history_page";
    const page = Math.max(1, Number(params.get(key)) || 1);
    const query = useQuery({
        queryKey: ["dealer-history", resource, page],
        queryFn: ({ signal }) => getOwnerHistory(resource, page, signal),
        retry: false,
    });
    useEffect(() => {
        if (query.error?.response?.status === 404 && page > 1) {
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.set(key, "1");
                    return next;
                },
                { replace: true },
            );
        }
    }, [query.error, page, key, setParams]);
    const changePage = (next) => {
        const nextParams = new URLSearchParams(params);
        nextParams.set(key, String(next));
        setParams(nextParams);
    };
    return (
        <section className="mt-4">
            <h2>
                {resource === "payments" ? "سوابق پرداخت" : "تاریخچه اشتراک"}
            </h2>
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        <p>{toPersianNumber(query.data.count)} سابقه</p>
                        {!query.data.count ? (
                            <p role="status">سابقه‌ای ثبت نشده است.</p>
                        ) : (
                            <>
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>پلن</th>
                                                <th>وضعیت</th>
                                                <th>ثبت</th>
                                                {resource === "payments" ? (
                                                    <>
                                                        <th>مبلغ</th>
                                                        <th>نوع پرداخت</th>
                                                        <th>شماره پیگیری</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th>شروع</th>
                                                        <th>پایان</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {query.data.results.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        {resource === "payments"
                                                            ? row.plan_name
                                                            : row.plan.name}
                                                    </td>
                                                    <td>
                                                        {(resource ===
                                                        "payments"
                                                            ? paymentStatuses
                                                            : subscriptionStatuses)[
                                                            row.status
                                                        ] ?? row.status}
                                                    </td>
                                                    <td>
                                                        {adminDate(
                                                            row.created_at,
                                                        )}
                                                    </td>
                                                    {resource === "payments" ? (
                                                        <>
                                                            <td>
                                                                {formatPrice(
                                                                    row.amount,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {row.provider ===
                                                                "mock"
                                                                    ? "آزمایشی"
                                                                    : row.provider}
                                                            </td>
                                                            <td>
                                                                {row.ref_id ||
                                                                    "ثبت نشده"}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>
                                                                {adminDate(
                                                                    row.started_at,
                                                                )}
                                                            </td>
                                                            <td>
                                                                {adminDate(
                                                                    row.expires_at,
                                                                )}
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    page={page}
                                    data={query.data}
                                    onChange={changePage}
                                />
                            </>
                        )}
                    </>
                )}
            </QueryStatus>
        </section>
    );
}
export default function DealerSubscriptionPage() {
    const query = useDealerSubscription();
    const sub = query.data;
    return (
        <section className="dealer-subscription-page">
            <h1>اشتراک من</h1>
            <QueryStatus query={query}>
                {sub ? (
                    <>
                        <h2>{sub.plan.name}</h2>
                        <p>
                            {sub.is_valid
                                ? "اشتراک معتبر است"
                                : "اعتبار اشتراک پایان یافته است"}
                        </p>
                        <p>
                            شروع: {adminDate(sub.started_at)} — پایان:{" "}
                            {adminDate(sub.expires_at)}
                        </p>
                        <PlanDetails plan={sub.plan} />
                        <dl>
                            {[
                                [
                                    "سهمیه ثبت باقی‌مانده",
                                    sub.remaining_listing_quota,
                                ],
                                [
                                    "ویژه‌سازی باقی‌مانده",
                                    sub.remaining_featured_quota,
                                ],
                                ["نردبان باقی‌مانده", sub.remaining_bump_quota],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{toPersianNumber(value)}</dd>
                                </div>
                            ))}
                        </dl>
                        <p>
                            تمدید خودکار: {sub.auto_renew ? "فعال" : "غیرفعال"}
                        </p>
                    </>
                ) : (
                    <p role="status">اشتراک فعالی ندارید.</p>
                )}
            </QueryStatus>
            <Link to="/dealer-dashboard/plans">مشاهده پلن‌ها</Link>
            <OwnerHistory resource="subscriptions" />
            <OwnerHistory resource="payments" />
        </section>
    );
}
