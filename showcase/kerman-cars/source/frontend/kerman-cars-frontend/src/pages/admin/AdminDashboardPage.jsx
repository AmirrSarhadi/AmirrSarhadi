import ActionQueue from "../../components/workspace/ActionQueue";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminSingleton } from "../../services/adminService";
import { adminDate } from "../../services/adminLabels";
import QueryStatus from "../../components/shared/QueryStatus";
import "./AdminPanel.scss";
import "./AdminDashboardPage.scss";

const groups = [
    [
        "users",
        "کاربران",
        "/admin/users",
        {
            total: "کل کاربران",
            active: "حساب فعال",
            banned: "مسدود",
            new_30_days: "جدید در ۳۰ روز",
        },
    ],
    [
        "dealers",
        "نمایشگاه‌ها",
        "/admin/dealers",
        {
            total: "کل",
            pending: "در انتظار بررسی",
            approved: "تأییدشده",
            rejected: "ردشده",
            suspended: "تعلیق‌شده",
        },
    ],
    [
        "listings",
        "آگهی‌ها",
        "/admin/listings",
        {
            total: "کل",
            draft: "پیش‌نویس",
            pending: "در انتظار بررسی",
            published: "منتشرشده",
            sold: "فروخته‌شده",
            inactive: "غیرفعال",
            new_30_days: "جدید در ۳۰ روز",
        },
    ],
    [
        "reports",
        "گزارش تخلف",
        "/admin/reports",
        {
            total: "کل",
            pending: "در انتظار رسیدگی",
            resolved: "رسیدگی‌شده",
            rejected: "ردشده",
        },
    ],
    [
        "subscriptions",
        "اشتراک کاربران",
        "/admin/subscriptions",
        { total: "کل", active: "فعال", pending: "در انتظار", expired: "منقضی" },
    ],
    [
        "payments",
        "پرداخت‌های ثبت‌شده",
        "/admin/payments",
        {
            total: "کل",
            paid: "پرداخت‌شده",
            pending: "در انتظار",
            failed: "ناموفق",
            total_revenue: "جمع مبالغ پرداخت‌شده (تومان)",
            revenue_30_days: "مبلغ پرداخت‌شده در ۳۰ روز (تومان)",
        },
    ],
];
export default function AdminDashboardPage() {
    const query = useQuery({
        queryKey: ["admin", "dashboard"],
        queryFn: ({ signal }) => getAdminSingleton("dashboard", signal),
    });
    return (
        <div className="admin-dashboard-page">
            <div className="admin-page-heading">
                <div>
                    <h1>داشبورد مدیریت</h1>
                    <p>آمار ثبت‌شده روی سرور</p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={query.isFetching}
                    onClick={() => query.refetch()}
                >
                    بروزرسانی آمار
                </button>
            </div>
            <QueryStatus query={query}>
                <ActionQueue title="صف بررسی مدیریت" items={[
                    { key: "listings", title: "آگهی‌های در انتظار بررسی", description: "اطلاعات و تصاویر آگهی را بررسی کنید و نتیجه را ثبت کنید.", count: query.data?.listings?.pending ?? 0, to: "/admin/listings?status=pending" },
                    { key: "dealers", title: "درخواست‌های نمایشگاه", description: "درخواست‌های عضویت نمایشگاه‌ها را بررسی کنید.", count: query.data?.dealers?.pending ?? 0, to: "/admin/dealers?status=pending" },
                    { key: "reports", title: "گزارش‌های نیازمند رسیدگی", description: "گزارش کاربران دربارهٔ آگهی‌ها را پیگیری کنید.", count: query.data?.reports?.pending ?? 0, to: "/admin/reports?status=pending" },
                ]} />
                <p>زمان دریافت: {adminDate(query.data?.generated_at)}</p>
                <div className="row g-3">
                    {groups.map(([key, title, path, labels]) => (
                        <section className="col-12 col-lg-6" key={key}>
                            <div className="admin-settings-card p-4">
                                <h2>
                                    <Link to={path}>{title}</Link>
                                </h2>
                                <dl>
                                    {Object.entries(labels).map(
                                        ([name, label]) => (
                                            <div
                                                className="d-flex gap-3 justify-content-between"
                                                key={name}
                                            >
                                                <dt>{label}</dt>
                                                <dd>
                                                    {query.data?.[key]?.[
                                                        name
                                                    ] == null
                                                        ? "—"
                                                        : new Intl.NumberFormat(
                                                              "fa-IR",
                                                          ).format(
                                                              query.data[key][
                                                                  name
                                                              ],
                                                          )}
                                                </dd>
                                            </div>
                                        ),
                                    )}
                                </dl>
                            </div>
                        </section>
                    ))}
                </div>
            </QueryStatus>
        </div>
    );
}
