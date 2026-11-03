import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import apiClient from "../../services/apiClient";
import queryClient from "../../services/queryClient";
import useAuthStore from "../../store/authStore";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ListingCard from "../../components/listing/ListingCard";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import useCatalog from "../../hooks/useCatalog";
import { getListings } from "../../services/listingService";
import { bodyStatuses, transmissions } from "../../services/listingData";
import "./ListingsPage.scss";

export default function ListingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const authenticated = useAuthStore(state => state.isAuthenticated);
    const save = useMutation({ mutationFn: filters => apiClient.post("engagement/saved-searches/", { filters }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] }) });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [composing, setComposing] = useState(false);
    const search = searchParams.get("search") || "";
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);
    const params = Object.fromEntries(searchParams);
    params.search = search ? debouncedSearch : "";
    const rawPage = Number(searchParams.get("page"));
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    params.page = page;
    params.page_size = 12;
    const listings = useQuery({
        queryKey: ["listings", params],
        queryFn: ({ signal }) => getListings(params, signal),
        enabled: !composing,
    });
    useEffect(() => {
        if (page > 1 && listings.error?.response?.status === 404) setSearchParams(previous => {
            const next = new URLSearchParams(previous); next.delete("page"); return next;
        }, { replace: true });
    }, [page, listings.error, setSearchParams]);
    const selectedBrand = searchParams.get("brand") || "";
    const models = useCatalog("cars/models/", { brand: selectedBrand }, Boolean(selectedBrand));
    const brands = useCatalog("cars/brands/");
    const cities = useCatalog("locations/cities/");
    const change = (name, value) =>
        setSearchParams(
            (old) => {
                const next = new URLSearchParams(old);
                if (value) next.set(name, value);
                else next.delete(name);
                if (name !== "page") next.delete("page");
                if (name === "brand") next.delete("car_model");
                return next;
            },
            { replace: name === "search" },
        );
    const select = (name, label, choices) => (
        <div className="listing-filters__section">
            <label htmlFor={`filter-${name}`} className="form-label">
                {label}
            </label>
            <select
                id={`filter-${name}`}
                className="form-select"
                value={searchParams.get(name) || ""}
                onChange={(e) => change(name, e.target.value)}
            >
                <option value="">همه</option>
                {choices.map(([value, text]) => (
                    <option key={value} value={value}>
                        {text}
                    </option>
                ))}
            </select>
        </div>
    );
    return (
        <div className="listings-page">
            <div className="kc-container">
                <div className="listings-page__heading">
                    <h1>آگهی‌های خرید و فروش خودرو</h1>
                    {authenticated ? <button type="button" className="btn btn-outline-primary" disabled={save.isPending} onClick={() => {
                        const filters = Object.fromEntries([...searchParams].filter(([key, value]) => key !== 'page' && value));
                        save.mutate(filters);
                    }}>ذخیره جست‌وجو</button> : <Link to="/auth/login" state={{ from: `/cars${searchParams.toString() ? `?${searchParams}` : ''}` }}>ورود برای ذخیره جست‌وجو</Link>}
                    {save.isSuccess && <p role="status">جست‌وجو ذخیره شد. <Link to="/dashboard/saved-searches">مشاهده جست‌وجوها</Link></p>}
                    {save.isError && <p role="alert">{save.error.message}</p>}
                    <p role="status">
                        {listings.data
                            ? `${new Intl.NumberFormat("fa-IR").format(listings.data.count)} آگهی`
                            : ""}
                    </p>
                </div>
                <div className="listings-page__layout">
                    <aside className="listing-filters p-3">
                        <button
                            type="button"
                            className="btn btn-outline-primary d-lg-none w-100"
                            aria-expanded={filtersOpen}
                            aria-controls="listing-filter-controls"
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            فیلترها و جست‌وجو
                        </button>
                        <div
                            id="listing-filter-controls"
                            className={`listing-filter-controls ${filtersOpen ? "listing-filter-controls--open" : ""}`}
                        >
                            <label
                                htmlFor="listing-search"
                                className="form-label"
                            >
                                جست‌وجوی خودرو
                            </label>
                            <div className="d-flex gap-2">
                                <input
                                    id="listing-search"
                                    type="search"
                                    className="form-control"
                                    value={search}
                                    onChange={(e) =>
                                        change("search", e.target.value)
                                    }
                                    onCompositionStart={() =>
                                        setComposing(true)
                                    }
                                    onCompositionEnd={() => setComposing(false)}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === "Enter" &&
                                            !e.nativeEvent.isComposing
                                        )
                                            setDebouncedSearch(search);
                                    }}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        aria-label="پاک کردن جست‌وجو"
                                        onClick={() => {
                                            change("search", "");
                                            document
                                                .getElementById(
                                                    "listing-search",
                                                )
                                                .focus();
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <QueryStatus query={brands}>
                                {select(
                                    "brand",
                                    "برند خودرو",
                                    (brands.data || []).map((v) => [
                                        v.id,
                                        v.name,
                                    ]),
                                )}
                            </QueryStatus>
                            {selectedBrand && <QueryStatus query={models}>
                                {select("car_model", "مدل خودرو", (models.data || []).map(model => [model.id, model.name]))}
                            </QueryStatus>}
                            <QueryStatus query={cities}>
                                {select(
                                    "city",
                                    "شهر",
                                    (cities.data || []).map((v) => [
                                        v.id,
                                        v.name,
                                    ]),
                                )}
                            </QueryStatus>
                            {[
                                ["min_price", "حداقل قیمت (تومان)"],
                                ["max_price", "حداکثر قیمت (تومان)"],
                                ["min_year", "از سال ساخت"],
                                ["max_year", "تا سال ساخت"],
                                ["min_mileage", "حداقل کارکرد (کیلومتر)"],
                                ["max_mileage", "حداکثر کارکرد (کیلومتر)"],
                            ].map(([name, label]) => (
                                <div
                                    className="listing-filters__section"
                                    key={name}
                                >
                                    <label htmlFor={name}>{label}</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        min="0"
                                        id={name}
                                        value={searchParams.get(name) || ""}
                                        onChange={(e) =>
                                            change(name, e.target.value)
                                        }
                                    />
                                </div>
                            ))}
                            {select(
                                "transmission",
                                "گیربکس",
                                Object.entries(transmissions),
                            )}
                            {select(
                                "body_status",
                                "وضعیت بدنه",
                                Object.entries(bodyStatuses),
                            )}
                            {select("seller_type", "نوع فروشنده", [
                                ["personal", "شخصی"],
                                ["dealer", "نمایشگاه"],
                            ])}
                            <label className="d-block py-3">
                                <input
                                    type="checkbox"
                                    checked={
                                        searchParams.get("is_featured") ===
                                        "true"
                                    }
                                    onChange={(e) =>
                                        change(
                                            "is_featured",
                                            e.target.checked ? "true" : "",
                                        )
                                    }
                                />{" "}
                                فقط آگهی‌های ویژه
                            </label>
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => setSearchParams({})}
                            >
                                پاک‌کردن فیلترها
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary d-lg-none w-100 mt-3"
                                onClick={() => {
                                    setFiltersOpen(false);
                                    document
                                        .getElementById("listing-results")
                                        .focus();
                                }}
                            >
                                مشاهده نتیجه‌ها
                            </button>
                        </div>
                    </aside>
                    <section
                        id="listing-results"
                        tabIndex={-1}
                        className="listings-page__results"
                    >
                        {select("ordering", "مرتب‌سازی آگهی‌ها", [
                            ["newest", "جدیدترین"],
                            ["oldest", "قدیمی‌ترین"],
                            ["price_asc", "ارزان‌ترین"],
                            ["price_desc", "گران‌ترین"],
                            ["mileage_asc", "کم‌کارکردترین"],
                            ["year_desc", "جدیدترین مدل"],
                            ["most_viewed", "پربازدیدترین"],
                        ])}
                        <QueryStatus query={listings}>
                            {listings.data?.results.length ? (
                                <div className="row g-3">
                                    {listings.data.results.map((listing) => (
                                        <div
                                            className="col-12 col-sm-6 col-xl-4"
                                            key={listing.id}
                                        >
                                            <ListingCard listing={listing} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="listings-page__empty">
                                    <h2>آگهی‌ای پیدا نشد</h2>
                                    <p>
                                        فیلترها را تغییر دهید یا بعداً دوباره
                                        بررسی کنید.
                                    </p>
                                </div>
                            )}
                        </QueryStatus>
                        <Pagination
                            page={page}
                            data={listings.data}
                            onChange={(value) => change("page", String(value))}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
}
