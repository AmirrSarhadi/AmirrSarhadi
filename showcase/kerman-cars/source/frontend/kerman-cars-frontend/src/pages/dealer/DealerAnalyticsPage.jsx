import { Link, useSearchParams } from "react-router-dom";
import { useDealerAnalytics } from "../../hooks/useOwnerDealer";
import QueryStatus from "../../components/shared/QueryStatus";
import DealerMetrics from "../../components/dealer/DealerMetrics";
import { toPersianNumber } from "../../utils/formatters";
import { adminDate } from "../../services/adminLabels";
import "./DealerDashboardPage.scss";
import "./DealerAnalyticsPage.scss";
export default function DealerAnalyticsPage() {
    const [params, setParams] = useSearchParams();
    const days = [7, 30, 90].includes(Number(params.get("days")))
        ? Number(params.get("days"))
        : 30;
    const query = useDealerAnalytics(days);
    return (
        <section className="dealer-analytics-page">
            <h1>آمار و گزارش‌های نمایشگاه</h1>
            <div className="d-flex gap-3 align-items-center mb-4">
                <label htmlFor="dealer-analytics-period">بازهٔ گزارش</label>
                <select
                    id="dealer-analytics-period"
                    className="form-select w-auto"
                    value={days}
                    onChange={(event) =>
                        setParams({ days: event.target.value })
                    }
                >
                    {[7, 30, 90].map((day) => (
                        <option key={day} value={day}>
                            {toPersianNumber(day)} روز
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={query.isFetching}
                    onClick={() => query.refetch()}
                >
                    به‌روزرسانی
                </button>
            </div>
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        <p>
                            {adminDate(query.data.period.start_date)} تا{" "}
                            {adminDate(query.data.period.end_date)}
                        </p>
                        <DealerMetrics summary={query.data.summary} />
                        <h2 className="h4 mt-4">روند روزانه</h2>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>تاریخ</th>
                                        <th>بازدید</th>
                                        <th>بازدید یکتا</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {query.data.trend.map((row) => (
                                        <tr key={row.date}>
                                            <td>{adminDate(row.date)}</td>
                                            <td>
                                                {toPersianNumber(row.views)}
                                            </td>
                                            <td>
                                                {toPersianNumber(
                                                    row.unique_views,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <h2 className="h4 mt-4">آگهی‌های پربازدید</h2>
                        {!query.data.top_listings.length && (
                            <p role="status">
                                آگهی‌ای برای این گزارش وجود ندارد.
                            </p>
                        )}
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>آگهی</th>
                                        <th>بازدید</th>
                                        <th>کلیک تماس</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {query.data.top_listings.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.title}</td>
                                            <td>
                                                {toPersianNumber(
                                                    row.analytics_views,
                                                )}
                                            </td>
                                            <td>
                                                {toPersianNumber(
                                                    row.analytics_calls,
                                                )}
                                            </td>
                                            <td>
                                                <Link
                                                    to={`/listing/${row.id}/edit`}
                                                >
                                                    ویرایش آگهی
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </QueryStatus>
        </section>
    );
}
