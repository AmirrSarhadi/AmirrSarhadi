import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import QueryStatus from "../../components/shared/QueryStatus";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import Pagination from "../../components/shared/Pagination";
import {
    getAccountSessions,
    revokeAccountSessions,
} from "../../services/sessionService";
import { adminDate } from "../../services/adminLabels";
import { toPersianNumber } from "../../utils/formatters";
import "./AccountActivity.scss";
export default function SessionsPage() {
    const [params, setParams] = useSearchParams();
    const requestedPage = Number(params.get("page"));
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const [target, setTarget] = useState(null);
    const navigate = useNavigate();
    const query = useQuery({
        queryKey: ["account-sessions"],
        queryFn: ({ signal }) => getAccountSessions(signal),
        retry: false,
        refetchOnWindowFocus: true,
    });
    const pageSize = 12;
    const total = query.data?.length ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => {
        if (query.isSuccess && page > lastPage)
            setParams({ page: String(lastPage) }, { replace: true });
    }, [query.isSuccess, page, lastPage, setParams]);
    const revoke = useMutation({
        mutationFn: revokeAccountSessions,
        onSuccess: (result) => {
            setTarget(null);
            if (result.signedOut) {
                toast.success(
                    "نشست شما پایان یافت؛ برای ادامه دوباره وارد شوید.",
                );
                navigate("/auth/login", { replace: true });
            } else toast.success("دسترسی دستگاه پایان یافت.");
        },
    });
    return (
        <section className="account-activity">
            <div className="account-activity__heading">
                <div>
                    <h1>دستگاه‌های فعال</h1>
                    <p>نشست‌هایی که در حال حاضر به حساب شما دسترسی دارند.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={query.isFetching || revoke.isPending}
                        onClick={() => query.refetch()}
                    >
                        به‌روزرسانی
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        disabled={!total || revoke.isPending || query.isError}
                        onClick={() => {
                            revoke.reset();
                            setTarget({ all: true });
                        }}
                    >
                        خروج از همه دستگاه‌ها
                    </button>
                </div>
            </div>
            {query.isSuccess && total > 0 && (
                <p className="d-md-none small">
                    برای دیدن همهٔ ستون‌ها، جدول را افقی جابه‌جا کنید.
                </p>
            )}
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        <p>{toPersianNumber(total)} دستگاه فعال</p>
                        {total ? (
                            <div
                                className="table-responsive account-activity__sessions"
                                role="region"
                                aria-label="فهرست دستگاه‌های فعال"
                                tabIndex={0}
                            >
                                <table className="table align-middle account-activity__sessions-table">
                                    <thead>
                                        <tr>
                                            <th>دستگاه</th>
                                            <th>آخرین فعالیت</th>
                                            <th>ورود</th>
                                            <th>پایان اعتبار</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {query.data
                                            .slice(
                                                (page - 1) * pageSize,
                                                page * pageSize,
                                            )
                                            .map((session) => (
                                                <tr key={session.id}>
                                                    <td>
                                                        <strong>
                                                            {session.device_name ||
                                                                "دستگاه بدون نام"}
                                                        </strong>
                                                        {session.is_current && (
                                                            <p className="small mb-1">
                                                                این دستگاه
                                                            </p>
                                                        )}
                                                        <p
                                                            className="small mb-1"
                                                            dir="ltr"
                                                        >
                                                            {session.ip_address ||
                                                                "نشانی ثبت نشده"}
                                                        </p>
                                                        {session.user_agent && (
                                                            <details>
                                                                <summary>
                                                                    مشخصات
                                                                    مرورگر
                                                                </summary>
                                                                <p
                                                                    className="small text-break"
                                                                    dir="ltr"
                                                                >
                                                                    {
                                                                        session.user_agent
                                                                    }
                                                                </p>
                                                            </details>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {adminDate(
                                                            session.last_seen_at,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {adminDate(
                                                            session.created_at,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {adminDate(
                                                            session.expires_at,
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            disabled={
                                                                revoke.isPending
                                                            }
                                                            onClick={() => {
                                                                revoke.reset();
                                                                setTarget({
                                                                    session,
                                                                });
                                                            }}
                                                        >
                                                            {session.is_current
                                                                ? "خروج از این دستگاه"
                                                                : "قطع دسترسی دستگاه"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p role="status">نشست فعالی وجود ندارد.</p>
                        )}
                        <Pagination
                            page={page}
                            data={{ previous: page > 1, next: page < lastPage }}
                            onChange={(next) =>
                                setParams({ page: String(next) })
                            }
                        />
                    </>
                )}
            </QueryStatus>
            {target && (
                <ConfirmDialog
                    title={
                        target.all
                            ? "خروج از همه دستگاه‌ها؟"
                            : target.session.is_current
                              ? "خروج از این دستگاه؟"
                              : "قطع دسترسی دستگاه؟"
                    }
                    pending={revoke.isPending}
                    confirmLabel={
                        target.all
                            ? "خروج از همه دستگاه‌ها"
                            : target.session.is_current
                              ? "خروج از این دستگاه"
                              : "قطع دسترسی دستگاه"
                    }
                    onCancel={() => {
                        setTarget(null);
                        revoke.reset();
                    }}
                    onConfirm={() => revoke.mutate(target)}
                >
                    <p>
                        {target.all
                            ? "دسترسی تمام دستگاه‌ها، شامل همین مرورگر، پایان می‌یابد و باید دوباره وارد شوید."
                            : `دسترسی «${target.session.device_name || "دستگاه بدون نام"}» پایان می‌یابد.${target.session.is_current ? " از همین مرورگر نیز خارج می‌شوید." : " ورود دوباره با کد تأیید امکان‌پذیر است."}`}
                    </p>
                    {revoke.isError && (
                        <p role="alert">
                            {revoke.error.message} اگر پاسخ قطع شده است، انصراف
                            دهید و وضعیت را به‌روزرسانی کنید؛ درخواست ممکن است
                            روی سرور انجام شده باشد.
                        </p>
                    )}
                </ConfirmDialog>
            )}
        </section>
    );
}
