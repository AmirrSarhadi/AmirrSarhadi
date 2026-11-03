import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminList } from "../../services/adminService";
import { adminDate } from "../../services/adminLabels";
import QueryStatus from "../shared/QueryStatus";
import Pagination from "../shared/Pagination";

export default function ListingReviewHistory({ listingId }) {
    const [page, setPage] = useState(1);
    const query = useQuery({
        queryKey: ["admin", "listing-history", listingId, page],
        queryFn: ({ signal }) => getAdminList(`listings/${listingId}/history`, { page, page_size: 10 }, signal),
    });
    return <section className="admin-settings-card p-4 my-4" aria-label="تاریخچه بررسی آگهی">
        <h2>تاریخچه بررسی آگهی</h2>
        <QueryStatus query={query}>
            {query.data?.results.length ? <ol className="list-unstyled mb-0">
                {query.data.results.map(item => <li key={item.id} className="py-3 border-bottom">
                    <strong>{item.action_label}</strong>
                    <p className="my-2">{item.reviewer || "مدیر حذف‌شده"} · <time dateTime={item.created_at}>{adminDate(item.created_at)}</time></p>
                    {item.note && <p className="mb-0 text-break" style={{ whiteSpace: "pre-wrap" }}>{item.note}</p>}
                </li>)}
            </ol> : <p>هنوز تصمیمی برای این آگهی ثبت نشده است.</p>}
            <Pagination page={page} data={query.data} onChange={setPage} />
        </QueryStatus>
    </section>;
}
