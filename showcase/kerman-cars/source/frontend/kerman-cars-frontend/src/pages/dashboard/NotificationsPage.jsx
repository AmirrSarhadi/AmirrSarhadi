import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getNotifications,
    markNotificationsRead,
} from "../../services/activityService";
import { notificationDestination } from "../../services/activityData";
import useUnreadNotifications from "../../hooks/useUnreadNotifications";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { adminDate } from "../../services/adminLabels";
import { toPersianNumber } from "../../utils/formatters";
import "./AccountActivity.scss";
export default function NotificationsPage() {
    const [params, setParams] = useSearchParams();
    const requestedPage = Number(params.get("page"));
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const unread = params.get("unread") === "1";
    const [confirmAll, setConfirmAll] = useState(false);
    const counter = useUnreadNotifications();
    const query = useQuery({
        queryKey: ["notifications", "list", { page, unread }],
        queryFn: ({ signal }) =>
            getNotifications(
                { page, page_size: 12, ...(unread ? { unread: 1 } : {}) },
                signal,
            ),
        retry: (count, error) =>
            ![401, 403, 404].includes(error.response?.status) && count < 1,
        refetchOnWindowFocus: true,
    });
    useEffect(() => {
        if (page > 1 && query.error?.response?.status === 404)
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.delete("page");
                    return next;
                },
                { replace: true },
            );
    }, [query.error, page, setParams]);
    const action = useMutation({
        mutationFn: markNotificationsRead,
        onSuccess: (data, id) => {
            setConfirmAll(false);
            toast.success(
                id == null
                    ? `${toPersianNumber(data.updated_count)} اعلان خوانده شد.`
                    : "اعلان خوانده شد.",
            );
        },
    });
    return (
        <section className="account-activity">
            <div className="account-activity__heading">
                <div>
                    <h1>اعلان‌های من</h1>
                    {counter.isError ? (
                        <p role="status">
                            شمارنده دریافت نشد؛ برای دریافت دوباره، به‌روزرسانی
                            را بزنید.
                        </p>
                    ) : (
                        counter.data && (
                            <p aria-live="polite">
                                {toPersianNumber(counter.data.unread_count)}{" "}
                                اعلان خوانده‌نشده
                            </p>
                        )
                    )}
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={query.isFetching || action.isPending}
                        onClick={() => {
                            query.refetch();
                            counter.refetch();
                        }}
                    >
                        به‌روزرسانی
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={
                            action.isPending ||
                            counter.isError ||
                            !counter.data?.unread_count
                        }
                        onClick={() => {
                            action.reset();
                            setConfirmAll(true);
                        }}
                    >
                        خواندن همه
                    </button>
                </div>
            </div>
            <div className="mb-4">
                <label htmlFor="notification-filter" className="form-label">
                    نمایش اعلان‌ها
                </label>
                <select
                    id="notification-filter"
                    className="form-select w-auto"
                    value={unread ? "unread" : "all"}
                    onChange={(event) => {
                        action.reset();
                        setParams(
                            event.target.value === "unread"
                                ? { unread: "1" }
                                : {},
                        );
                    }}
                >
                    <option value="all">همه اعلان‌ها</option>
                    <option value="unread">فقط خوانده‌نشده</option>
                </select>
            </div>
            {!confirmAll && action.isError && (
                <p role="alert">{action.error.message}</p>
            )}
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        <p>{toPersianNumber(query.data.count)} نتیجه</p>
                        {query.data.results.length ? (
                            <ul className="account-activity__list">
                                {query.data.results.map((notification) => {
                                    const target =
                                        notificationDestination(notification);
                                    return (
                                        <li
                                            className="account-activity__notification"
                                            key={notification.id}
                                        >
                                            <article>
                                                <div className="d-flex justify-content-between gap-3 flex-wrap">
                                                    <h2>
                                                        {notification.title}
                                                    </h2>
                                                    <span>
                                                        {notification.is_read
                                                            ? "خوانده‌شده"
                                                            : "خوانده‌نشده"}
                                                    </span>
                                                </div>
                                                <time
                                                    dateTime={
                                                        notification.created_at
                                                    }
                                                >
                                                    {adminDate(
                                                        notification.created_at,
                                                    )}
                                                </time>
                                                <p className="account-activity__message">
                                                    {notification.message}
                                                </p>
                                                <div className="d-flex gap-3 flex-wrap">
                                                    {target && (
                                                        <Link to={target}>
                                                            {notification.kind === "report_reviewed" ? "پیگیری گزارش" : notification.kind.startsWith("dealer_") ? "مشاهده وضعیت نمایشگاه" : notification.kind.startsWith(
                                                                "subscription_",
                                                            )
                                                                ? "مشاهده اشتراک"
                                                                : ["listing_approved", "saved_search_match"].includes(notification.kind)
                                                                  ? "مشاهده آگهی"
                                                                  : "ویرایش آگهی"}
                                                        </Link>
                                                    )}
                                                    {!notification.is_read && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary account-activity__read-button"
                                                            disabled={
                                                                action.isPending
                                                            }
                                                            onClick={() => {
                                                                action.reset();
                                                                action.mutate(
                                                                    notification.id,
                                                                );
                                                            }}
                                                        >
                                                            <span
                                                                className={
                                                                    action.isPending &&
                                                                    action.variables ===
                                                                        notification.id
                                                                        ? "invisible"
                                                                        : undefined
                                                                }
                                                            >
                                                                علامت‌گذاری
                                                                به‌عنوان
                                                                خوانده‌شده
                                                            </span>
                                                            {action.isPending &&
                                                                action.variables ===
                                                                    notification.id && (
                                                                    <span>
                                                                        در حال
                                                                        ثبت…
                                                                    </span>
                                                                )}
                                                        </button>
                                                    )}
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="account-activity__empty">
                                <h2>
                                    {unread
                                        ? "اعلان خوانده‌نشده‌ای ندارید"
                                        : "هنوز اعلانی ثبت نشده است"}
                                </h2>
                                <p>
                                    اعلان‌های وضعیت آگهی، گزارش، نمایشگاه و اشتراک در این بخش نمایش داده می‌شوند.
                                </p>
                            </div>
                        )}
                        <Pagination
                            page={page}
                            data={query.data}
                            onChange={(next) => {
                                const nextParams = new URLSearchParams(params);
                                nextParams.set("page", String(next));
                                setParams(nextParams);
                            }}
                        />
                    </>
                )}
            </QueryStatus>
            {confirmAll && (
                <ConfirmDialog
                    title="خواندن همه اعلان‌ها؟"
                    intent="primary"
                    pending={action.isPending}
                    confirmLabel="خواندن همه"
                    onCancel={() => {
                        setConfirmAll(false);
                        action.reset();
                    }}
                    onConfirm={() => action.mutate(null)}
                >
                    <p>
                        تمام اعلان‌های خوانده‌نشده در همهٔ صفحه‌ها خوانده‌شده
                        علامت می‌خورند. متن اعلان‌ها باقی می‌ماند.
                    </p>
                    {action.isError && (
                        <p role="alert">{action.error.message}</p>
                    )}
                </ConfirmDialog>
            )}
        </section>
    );
}
