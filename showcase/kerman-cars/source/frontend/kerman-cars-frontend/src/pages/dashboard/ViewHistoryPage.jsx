import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getViewHistory } from "../../services/activityService";
import { historyLimit } from "../../services/activityData";
import { adminDate } from "../../services/adminLabels";
import { toPersianNumber } from "../../utils/formatters";
import QueryStatus from "../../components/shared/QueryStatus";
import ListingCard from "../../components/listing/ListingCard";
import "./AccountActivity.scss";
export default function ViewHistoryPage() {
    const [params, setParams] = useSearchParams();
    const limit = historyLimit(params.get("limit"));
    const query = useQuery({
        queryKey: ["view-history", limit],
        queryFn: ({ signal }) => getViewHistory(limit, signal),
        refetchOnWindowFocus: true,
    });
    return (
        <section className="account-activity">
            <div className="account-activity__heading">
                <div>
                    <h1>تاریخچه بازدید من</h1>
                    <p>
                        تا {toPersianNumber(limit)} آگهی اخیرِ قابل نمایش؛
                        آگهی‌های خارج از انتشار در این فهرست نمی‌آیند.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={query.isFetching}
                    onClick={() => query.refetch()}
                >
                    به‌روزرسانی
                </button>
            </div>
            <div className="mb-4">
                <label htmlFor="history-limit" className="form-label">
                    تعداد آگهی‌های اخیر
                </label>
                <select
                    className="form-select w-auto"
                    id="history-limit"
                    value={limit}
                    onChange={(event) =>
                        setParams({ limit: event.target.value })
                    }
                >
                    {[20, 50, 100].map((value) => (
                        <option key={value} value={value}>
                            {toPersianNumber(value)} آگهی
                        </option>
                    ))}
                </select>
            </div>
            <QueryStatus query={query}>
                {query.data &&
                    (query.data.length ? (
                        <>
                            <p>
                                {toPersianNumber(query.data.length)} آگهی در این
                                فهرست
                            </p>
                            <div className="row g-3">
                                {query.data.map((row) => (
                                    <div
                                        className="col-12 col-sm-6 col-xl-4"
                                        key={row.listing.id}
                                    >
                                        <div className="account-activity__visit">
                                            <span>
                                                آخرین بازدید:{" "}
                                                <time
                                                    dateTime={
                                                        row.last_viewed_at
                                                    }
                                                >
                                                    {adminDate(
                                                        row.last_viewed_at,
                                                    )}
                                                </time>
                                            </span>
                                            <span>
                                                {toPersianNumber(
                                                    row.view_count,
                                                )}{" "}
                                                بازدید با این حساب
                                            </span>
                                        </div>
                                        <ListingCard listing={row.listing} />
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="account-activity__empty">
                            <h2>هنوز آگهی قابل نمایشی در تاریخچه ندارید</h2>
                            <p>
                                آگهی‌هایی که با این حساب باز می‌کنید در این بخش
                                نمایش داده می‌شوند.
                            </p>
                            <Link to="/cars">مشاهده آگهی‌ها</Link>
                        </div>
                    ))}
            </QueryStatus>
        </section>
    );
}
