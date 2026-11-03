import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import ListingCard from "../../components/listing/ListingCard";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { getFavorites, clearFavorites } from "../../services/engagementService";
import "./FavoritesPage.scss";

export default function FavoritesPage() {
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const [confirm, setConfirm] = useState(false);
    const query = useQuery({
        queryKey: ["favorites", page],
        queryFn: ({ signal }) => getFavorites({ page, page_size: 12 }, signal),
    });
    useEffect(() => {
        if (page > 1 && query.error?.response?.status === 404) setParams({});
    }, [page, query.error, setParams]);
    const clear = useMutation({
        mutationFn: clearFavorites,
        onSuccess: () => {
            setConfirm(false);
            setParams({});
        },
    });
    return (
        <div className="favorites-page">
            <div className="favorites-page__heading">
                <h1>علاقه‌مندی‌های من</h1>
                {Boolean(query.data?.count) && (
                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => setConfirm(true)}
                    >
                        حذف همه
                    </button>
                )}
            </div>
            <QueryStatus query={query}>
                {query.data?.results.length ? (
                    <div className="row g-3">
                        {query.data.results.map((listing) => (
                            <div
                                className="col-12 col-sm-6 col-xl-4"
                                key={listing.id}
                            >
                                <ListingCard listing={listing} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="favorites-page__empty">
                        <h2>هنوز خودرویی ذخیره نکرده‌اید</h2>
                        <Link to="/cars">مشاهده آگهی‌ها</Link>
                    </div>
                )}
            </QueryStatus>
            <Pagination
                page={page}
                data={query.data}
                onChange={(next) => setParams({ page: String(next) })}
            />
            {confirm && (
                <ConfirmDialog
                    title="حذف همه علاقه‌مندی‌ها؟"
                    pending={clear.isPending}
                    onCancel={() => setConfirm(false)}
                    onConfirm={() => clear.mutate()}
                    confirmLabel="حذف همه"
                >
                    <p>همه خودروهای ذخیره‌شده از فهرست شما حذف می‌شوند.</p>
                    {clear.isError && <p role="alert">{clear.error.message}</p>}
                </ConfirmDialog>
            )}
        </div>
    );
}
