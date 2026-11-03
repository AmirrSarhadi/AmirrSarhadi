import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { adminDate, reportReasons } from "../../services/adminLabels";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import "./AccountActivity.scss";

const statuses = { pending: "در انتظار رسیدگی", resolved: "رسیدگی‌شده", rejected: "تأیید نشد" };
export default function MyReportsPage() {
    const [params, setParams] = useSearchParams();
    const rawPage = Number(params.get("page"));
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const status = Object.hasOwn(statuses, params.get("status")) ? params.get("status") : "";
    const query = useQuery({
        queryKey: ["my-reports", { page, status }],
        queryFn: async ({ signal }) => (await apiClient.get("moderation/my-reports/", { signal, params: { page, page_size: 12, ...(status ? { status } : {}) } })).data,
        retry: (count, error) => error.response?.status !== 404 && count < 1,
        refetchOnWindowFocus: true,
    });
    useEffect(() => {
        if (page > 1 && query.error?.response?.status === 404) setParams(previous => {
            const next = new URLSearchParams(previous); next.delete("page"); return next;
        }, { replace: true });
    }, [page, query.error, setParams]);
    return <section className="account-activity">
        <div className="account-activity__heading"><div><h1>گزارش‌های من</h1><p>وضعیت گزارش‌هایی که دربارهٔ آگهی‌ها ثبت کرده‌اید.</p></div>
            <button type="button" className="btn btn-outline-primary" disabled={query.isFetching} onClick={() => query.refetch()}>دریافت وضعیت تازه</button>
        </div>
        <label htmlFor="my-reports-status" className="form-label">وضعیت گزارش</label>
        <select id="my-reports-status" className="form-select mb-4" value={status} onChange={event => setParams(event.target.value ? { status: event.target.value } : {})}>
            <option value="">همه وضعیت‌ها</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <QueryStatus query={query}>
            {query.data?.results.length ? <ul className="account-activity__list">
                {query.data.results.map(report => <li key={report.id} className="account-activity__notification">
                    <h2>{report.listing_title}</h2>
                    <p>کد پیگیری: {new Intl.NumberFormat("fa-IR").format(report.id)} · {statuses[report.status]}</p>
                    <p>موضوع: {reportReasons[report.reason] || report.reason}</p>
                    {report.description && <p className="account-activity__message">{report.description}</p>}
                    <p>ثبت: <time dateTime={report.created_at}>{adminDate(report.created_at)}</time></p>
                    {report.reviewed_at && <p>بررسی: <time dateTime={report.reviewed_at}>{adminDate(report.reviewed_at)}</time></p>}
                    {report.status === "resolved" && <p>گزارش بررسی و رسیدگی شده است؛ این وضعیت الزاماً به معنی حذف آگهی نیست.</p>}
                    {report.status === "rejected" && <p>گزارش شما بررسی شد و مورد تأیید قرار نگرفت.</p>}
                </li>)}
            </ul> : <div className="account-activity__empty"><h2>{status ? "گزارشی با این وضعیت ندارید" : "هنوز گزارشی ثبت نکرده‌اید"}</h2><p>برای ثبت گزارش، در صفحهٔ آگهی گزینهٔ «گزارش مشکل یا تخلف» را انتخاب کنید.</p><Link to="/cars">مشاهده آگهی‌ها</Link></div>}
            <Pagination page={page} data={query.data} onChange={nextPage => setParams({ ...(status ? { status } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) })} />
        </QueryStatus>
    </section>;
}
