import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDealers } from "../../services/dealerService";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import "./DealersPage.scss";

export default function DealersPage() {
    const [params, setParams] = useSearchParams();
    const search = params.get("search") || "";
    const page = Math.max(1, Number(params.get("page")) || 1);
    const [debounced, setDebounced] = useState(search);
    const [composing, setComposing] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(timer);
    }, [search]);
    const query = useQuery({
        queryKey: ["dealers", search ? debounced : "", page],
        queryFn: ({ signal }) =>
            getDealers(
                { ...(search ? { search: debounced } : {}), page },
                signal,
            ),
        enabled: !composing,
    });
    const changeSearch = (value) =>
        setParams(value ? { search: value } : {}, { replace: true });
    return (
        <div className="dealers-page">
            <section className="dealers-page__hero">
                <div className="kc-container">
                    <h1>نمایشگاه‌های خودرو در کرمان</h1>
                    <p>نمایشگاه‌های تأییدشده و خودروهای فعال آن‌ها</p>
                    <div className="dealers-search">
                        <label
                            className="visually-hidden"
                            htmlFor="dealer-search"
                        >
                            جست‌وجوی نمایشگاه
                        </label>
                        <input
                            id="dealer-search"
                            type="search"
                            className="form-control"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                            onCompositionStart={() => setComposing(true)}
                            onCompositionEnd={() => setComposing(false)}
                            onKeyDown={(e) => {
                                if (
                                    e.key === "Enter" &&
                                    !e.nativeEvent.isComposing
                                )
                                    setDebounced(search);
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="پاک کردن جست‌وجوی نمایشگاه"
                                onClick={() => {
                                    changeSearch("");
                                    document
                                        .getElementById("dealer-search")
                                        .focus();
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </section>
            <section className="kc-container dealers-page__content">
                <p role="status">
                    {query.data
                        ? `${new Intl.NumberFormat("fa-IR").format(query.data.count)} نمایشگاه`
                        : ""}
                </p>
                <QueryStatus query={query}>
                    {query.data?.results.length ? (
                        <div className="row g-3">
                            {query.data.results.map((dealer) => (
                                <div
                                    key={dealer.id}
                                    className="col-12 col-md-6 col-xl-4"
                                >
                                    <article className="dealer-public-card">
                                        <Link
                                            to={`/dealers/${dealer.slug}`}
                                            className="dealer-public-card__cover"
                                        >
                                            <img
                                                src={dealer.coverImage}
                                                alt={dealer.businessName}
                                            />
                                        </Link>
                                        <div className="p-3">
                                            <h2>{dealer.businessName}</h2>
                                            <p>
                                                {dealer.city}{" "}
                                                {dealer.neighborhood}
                                            </p>
                                            <p>
                                                {new Intl.NumberFormat(
                                                    "fa-IR",
                                                ).format(
                                                    dealer.listingsCount,
                                                )}{" "}
                                                آگهی فعال
                                            </p>
                                            <Link
                                                to={`/dealers/${dealer.slug}`}
                                                className="btn btn-outline-primary w-100"
                                            >
                                                مشاهده نمایشگاه
                                            </Link>
                                        </div>
                                    </article>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="dealers-page__empty">
                            <h2>نمایشگاهی پیدا نشد</h2>
                            <p>
                                عبارت جست‌وجو را تغییر دهید یا بعداً بررسی کنید.
                            </p>
                        </div>
                    )}
                </QueryStatus>
                <Pagination
                    page={page}
                    data={query.data}
                    onChange={(next) =>
                        setParams({
                            ...(search ? { search } : {}),
                            page: String(next),
                        })
                    }
                />
            </section>
        </div>
    );
}
