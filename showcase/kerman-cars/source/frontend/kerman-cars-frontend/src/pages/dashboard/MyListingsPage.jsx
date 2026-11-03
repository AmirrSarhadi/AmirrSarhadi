import useAuthStore from "../../store/authStore";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getMyListings,
    listingAction,
    deleteListing,
} from "../../services/listingService";
import { emptyImage, statusLabels } from "../../services/listingData";
import { formatPrice } from "../../utils/formatters";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import "./MyListingsPage.scss";

export default function MyListingsPage() {
    const [params, setParams] = useSearchParams();
    const heading = useRef(null);
    const rawPage = Number(params.get("page"));
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const search = params.get("search") || "";
    const orderOptions = ["newest", "oldest", "price_low", "price_high", "most_viewed"];
    const ordering = orderOptions.includes(params.get("ordering")) ? params.get("ordering") : "newest";
    const changeFilter = (name, value) => setParams(previous => {
        const next = new URLSearchParams(previous);
        next.delete("page");
        if (value) next.set(name, value); else next.delete(name);
        return next;
    });
    const selectedStatus = [...Object.keys(statusLabels), "expired"].includes(params.get("status")) ? params.get("status") : "";
    const updatePage = (next) =>
        setParams((previous) => {
            const updated = new URLSearchParams(previous);
            if (next > 1) updated.set("page", String(next));
            else updated.delete("page");
            return updated;
        });
    const [deleting, setDeleting] = useState(null);
    const [selling, setSelling] = useState(null);
    const [visibilityAction, setVisibilityAction] = useState(null);
    const dealer = useAuthStore((s) => s.user?.role === "DEALER");
    const [actionError, setActionError] = useState("");
    const listings = useQuery({
        queryKey: ["my-listings", page, selectedStatus, search, ordering],
        queryFn: ({ signal }) =>
            getMyListings(
                {
                    page,
                    page_size: 12,
                    search,
                    ordering,
                    ...(selectedStatus ? { status: selectedStatus } : {}),
                },
                signal,
            ),
    });
    useEffect(() => {
        if (page > 1 && listings.error?.response?.status === 404) {
            setParams(
                (previous) => {
                    const updated = new URLSearchParams(previous);
                    updated.delete("page");
                    return updated;
                },
                { replace: true },
            );
        }
    }, [page, listings.error, setParams]);
    const action = useMutation({
        mutationFn: async ({ id, name }) => {
            if (name === "delete") await deleteListing(id);
            else await listingAction(id, name);
        },
        onMutate: () => {
            setActionError("");
            return { previousCount: listings.data?.results.length };
        },
        onSuccess: (_, variables, context) => {
            toast.success(
                {
                    delete: "آگهی حذف شد.",
                    submit: "آگهی برای بررسی ارسال شد.",
                    sold: "وضعیت آگهی به فروخته‌شده تغییر کرد.",
                    feature: "آگهی ویژه شد.",
                    bump: "آگهی بروزرسانی شد.",
                    pause: "نمایش آگهی متوقف شد.",
                    resume: "آگهی برای بررسی دوباره ارسال شد.",
                }[variables.name],
            );
            setDeleting(null);
            setSelling(null);
            setVisibilityAction(null);
            requestAnimationFrame(() => heading.current?.focus());
            if (
                variables.name === "delete" &&
                context?.previousCount === 1 &&
                page > 1
            )
                updatePage(page - 1);
        },
        onError: (error) => setActionError(error.message),
    });
    return (
        <div className="my-listings-page">
            <div className="my-listings-page__heading">
                <div>
                    <h1 ref={heading} tabIndex={-1}>آگهی‌های من</h1>
                    <p>وضعیت بررسی و تغییرات آگهی‌ها از سرور دریافت می‌شود.</p>
                </div>
                <Link to="/listing/create" className="btn btn-primary">
                    ثبت آگهی جدید
                </Link>
            </div>
            <form className="my-listings-search" onSubmit={event => {
                event.preventDefault();
                changeFilter("search", new FormData(event.currentTarget).get("search").trim());
            }}>
                <label htmlFor="my-listings-search">جست‌وجوی آگهی‌های من</label>
                <div className="d-flex gap-2">
                    <input key={search} id="my-listings-search" name="search" type="search" maxLength={150} defaultValue={search} className="form-control" placeholder="عنوان، برند، مدل یا کد آگهی" />
                    <button type="submit" className="btn btn-primary">جست‌وجو</button>
                </div>
            </form>
            <div className="my-listings-filter mb-4">
                <label htmlFor="my-listings-status" className="form-label">
                    وضعیت آگهی
                </label>
                <select
                    id="my-listings-status"
                    className="form-select"
                    value={selectedStatus}
                    onChange={event => changeFilter("status", event.target.value)}
                >
                    <option value="">همه وضعیت‌ها</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                    <option value="expired">منقضی‌شده</option>
                </select>
            </div>
            <div className="my-listings-filter mb-4">
                <label htmlFor="my-listings-order" className="form-label">مرتب‌سازی</label>
                <select id="my-listings-order" className="form-select" value={ordering} onChange={event => changeFilter("ordering", event.target.value)}>
                    <option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option>
                    <option value="price_low">کمترین قیمت</option><option value="price_high">بیشترین قیمت</option>
                    <option value="most_viewed">بیشترین بازدید</option>
                </select>
            </div>
            {(search || selectedStatus || ordering !== "newest") && <button type="button" className="btn btn-outline-primary mb-4" onClick={() => setParams({})}>پاک کردن فیلترها</button>}
            {listings.isSuccess && <p role="status">{new Intl.NumberFormat("fa-IR").format(listings.data.count)} آگهی پیدا شد</p>}
            {actionError && !selling && !deleting && !visibilityAction && <p role="alert">{actionError}</p>}
            <QueryStatus query={listings}>
                {listings.data?.results.length ? (
                    <div className="my-listings-list">
                        {listings.data.results.map((listing) => (
                            <article
                                key={listing.id}
                                className="my-listing-card"
                            >
                                <div className="my-listing-card__image">
                                    <img
                                        src={listing.image}
                                        alt={listing.title}
                                        onError={event => { if (!event.currentTarget.src.endsWith(emptyImage)) event.currentTarget.src = emptyImage; }}
                                    />
                                    <span className="my-listing-card__status">
                                        {listing.statusLabel}
                                    </span>
                                </div>
                                <div className="my-listing-card__content">
                                    <div className="my-listing-card__top">
                                        <h2>{listing.title}</h2>
                                        <strong>
                                            {listing.priceType === "contact"
                                                ? "تماس بگیرید"
                                                : formatPrice(listing.price)}
                                        </strong>
                                    </div>
                                    <p>
                                        {listing.publicCode} — {listing.city}
                                    </p>
                                    <p className="my-listing-card__guidance">{listing.is_expired
                                        ? "این آگهی منقضی شده است؛ ویرایش اطلاعات به‌تنهایی باعث تمدید یا انتشار دوباره نمی‌شود."
                                        : listing.paused_by_owner ? "نمایش آگهی متوقف است. برای انتشار دوباره آن را به بررسی بفرستید؛ انقضای قبلی تغییر نمی‌کند." : {
                                            draft: "پیش‌نویس فقط برای شما قابل مشاهده است. اطلاعات و تصاویر را کامل کنید و برای بررسی بفرستید.",
                                            pending: "آگهی در صف بررسی است و هنوز در نتایج عمومی نمایش داده نمی‌شود.",
                                            needs_edit: "توضیح مدیریت را بخوانید، آگهی را ویرایش کنید و دوباره برای بررسی بفرستید.",
                                            rejected: "آگهی رد شده است. ویرایش، به معنی تأیید یا ارسال دوباره نیست؛ برای پیگیری با پشتیبانی تماس بگیرید.",
                                            inactive: "این آگهی در نتایج عمومی نمایش داده نمی‌شود. برای پیگیری وضعیت با پشتیبانی تماس بگیرید.",
                                            published: "آگهی منتشر شده است. تغییر مشخصات اصلی یا تصاویر، آن را دوباره وارد صف بررسی می‌کند.",
                                            sold: "فروش ثبت شده و آگهی از نتایج عمومی خارج شده است.",
                                        }[listing.status]}</p>
                                    {listing.rejection_reason && (
                                        <div
                                            className="my-listing-card__review"
                                            role="note"
                                        >
                                            <strong>توضیح بررسی آگهی</strong>
                                            <p>{listing.rejection_reason}</p>
                                        </div>
                                    )}
                                    {listing.is_expired && (
                                        <p>
                                            زمان نمایش این آگهی به پایان رسیده و
                                            در نتایج عمومی نمایش داده نمی‌شود.
                                        </p>
                                    )}
                                    {["inactive", "rejected"].includes(listing.status) || listing.is_expired ? <Link to="/contact">پیگیری از پشتیبانی</Link> : null}
                                    <div className="d-flex gap-2 flex-wrap">
                                        <Link
                                            className="btn btn-outline-primary"
                                            to={`/cars/${listing.slug}`}
                                        >
                                            {listing.status === "published" && !listing.is_expired ? "مشاهده آگهی" : "پیش‌نمایش آگهی"}
                                        </Link>
                                        {listing.status !== "sold" && (
                                            <Link
                                                className="btn btn-outline-primary"
                                                to={`/listing/${listing.id}/edit`}
                                            >
                                                ویرایش
                                            </Link>
                                        )}
                                        {["draft", "needs_edit"].includes(
                                            listing.status,
                                        ) && (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                disabled={action.isPending}
                                                onClick={() =>
                                                    action.mutate({
                                                        id: listing.id,
                                                        name: "submit",
                                                    })
                                                }
                                            >
                                                ارسال برای بررسی
                                            </button>
                                        )}
                                        {listing.status === "published" && !listing.is_expired && <button type="button" className="btn btn-outline-secondary" disabled={action.isPending} onClick={() => { setActionError(""); setVisibilityAction({ listing, name: "pause" }); }}>توقف نمایش</button>}
                                        {listing.status === "inactive" && listing.paused_by_owner && !listing.is_expired && <button type="button" className="btn btn-primary" disabled={action.isPending} onClick={() => { setActionError(""); setVisibilityAction({ listing, name: "resume" }); }}>ارسال دوباره برای بررسی</button>}
                                        {listing.status === "published" && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={action.isPending}
                                                    onClick={() =>
                                                        (setActionError(""), setSelling(listing))
                                                    }
                                                >
                                                    فروخته شد
                                                </button>
                                                {dealer && !listing.is_expired && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            action.isPending
                                                        }
                                                        onClick={() =>
                                                            action.mutate({
                                                                id: listing.id,
                                                                name: "feature",
                                                            })
                                                        }
                                                    >
                                                        ویژه کردن
                                                    </button>
                                                )}
                                                {dealer && !listing.is_expired && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            action.isPending
                                                        }
                                                        onClick={() =>
                                                            action.mutate({
                                                                id: listing.id,
                                                                name: "bump",
                                                            })
                                                        }
                                                    >
                                                        بروزرسانی آگهی
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger"
                                            disabled={action.isPending}
                                            onClick={() => { setActionError(""); setDeleting(listing); }}
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="my-listings-empty">
                        <h2>
                            {search ? "آگهی‌ای با این جست‌وجو پیدا نشد" : selectedStatus
                                ? "آگهی‌ای با این وضعیت ندارید"
                                : "هنوز آگهی ثبت نکرده‌اید"}
                        </h2>
                        <Link to="/listing/create">{selectedStatus ? "ثبت آگهی جدید" : "ثبت اولین آگهی"}</Link>
                    </div>
                )}
            </QueryStatus>
            {listings.isSuccess && <Pagination
                page={page}
                data={listings.data}
                onChange={updatePage}
            />}
            {visibilityAction && <ConfirmDialog
                title={visibilityAction.name === "pause" ? "توقف نمایش آگهی؟" : "ارسال دوباره برای بررسی؟"}
                pending={action.isPending}
                confirmLabel={visibilityAction.name === "pause" ? "توقف نمایش" : "ارسال برای بررسی"}
                onCancel={() => { setActionError(""); setVisibilityAction(null); }}
                onConfirm={() => action.mutate({ id: visibilityAction.listing.id, name: visibilityAction.name })}
            ><p>{visibilityAction.name === "pause" ? "آگهی از نتایج عمومی خارج می‌شود؛ زمان انقضا و مدت باقی‌ماندهٔ خدمات متوقف نمی‌شود." : "آگهی پیش از نمایش دوباره بررسی می‌شود. زمان انقضا تمدید نمی‌شود."}</p>{actionError && <p role="alert">{actionError}</p>}</ConfirmDialog>}
            {selling && (
                <ConfirmDialog
                    title={`ثبت فروش «${selling.title}»؟`}
                    pending={action.isPending}
                    onCancel={() => { setActionError(""); setSelling(null); }}
                    onConfirm={() =>
                        action.mutate({ id: selling.id, name: "sold" })
                    }
                    confirmLabel="ثبت فروش"
                >
                    <p>
                        آگهی از نتایج عمومی خارج می‌شود و وضعیت آن به فروخته‌شده
                        تغییر می‌کند.
                    </p>
                    {actionError && <p role="alert">{actionError}</p>}
                </ConfirmDialog>
            )}
            {deleting && (
                <ConfirmDialog
                    title={`حذف «${deleting.title}»؟`}
                    pending={action.isPending}
                    onCancel={() => { setActionError(""); setDeleting(null); }}
                    onConfirm={() =>
                        action.mutate({ id: deleting.id, name: "delete" })
                    }
                    confirmLabel="حذف آگهی"
                >
                    <p>
                        این آگهی از نمایش عمومی و فهرست آگهی‌های شما حذف می‌شود.
                    </p>
                    {actionError && <p role="alert">{actionError}</p>}
                </ConfirmDialog>
            )}
        </div>
    );
}
