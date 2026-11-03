import { adminDate } from "../../services/adminLabels";
import { Link, Navigate } from "react-router-dom";
import useOwnerDealer from "../../hooks/useOwnerDealer";
import QueryStatus from "../../components/shared/QueryStatus";
import "./DealerStatusPage.scss";
const labels = {
    pending: "درخواست در حال بررسی است",
    rejected: "درخواست شما رد شده است",
    suspended: "نمایشگاه تعلیق شده است",
    draft: "درخواست نمایشگاه ثبت شده است",
};
export default function DealerStatusPage() {
    const query = useOwnerDealer();
    if (!query.isSuccess) return <QueryStatus query={query} />;
    if (!query.data) return <Navigate to="/dealer/register" replace />;
    if (query.data.status === "approved")
        return <Navigate to="/dealer-dashboard" replace />;
    const profile = query.data;
    return (
        <div className="dealer-status-page">
            <section className="dealer-status-card">
                <h1>{labels[profile.status] ?? "وضعیت نمایشگاه"}</h1>
                <p>{profile.business_name}</p>
                <p>
                    {profile.rejection_reason ||
                        "وضعیت درخواست پس از بررسی مدیریت به‌روزرسانی می‌شود."}
                </p>
                <p>{profile.status === "rejected"
                    ? "با اصلاح و ذخیرهٔ اطلاعات، درخواست دوباره برای بررسی ارسال می‌شود."
                    : profile.status === "suspended"
                      ? "ویرایش اطلاعات باعث رفع تعلیق نمی‌شود. مدارک را اصلاح کنید و برای پیگیری با پشتیبانی تماس بگیرید."
                      : "پس از تصمیم مدیریت، نتیجه در همین صفحه و بخش اعلان‌های حساب شما نمایش داده می‌شود."}</p>
                <dl><dt>زمان ثبت درخواست</dt><dd>{adminDate(profile.created_at)}</dd><dt>آخرین به‌روزرسانی اطلاعات</dt><dd>{adminDate(profile.updated_at)}</dd></dl>
                {profile.status === "suspended" && <Link to="/contact" className="btn btn-outline-primary mb-3">پیگیری تعلیق از پشتیبانی</Link>}
                <div className="d-flex gap-3 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={query.isFetching}
                        onClick={() => query.refetch()}
                    >
                        دریافت وضعیت تازه
                    </button>
                    <Link
                        className="btn btn-outline-primary"
                        to="/dealer/register?edit=1"
                    >
                        اصلاح اطلاعات نمایشگاه
                    </Link>
                    <Link className="btn btn-outline-secondary" to="/dashboard">
                        بازگشت به پنل کاربری
                    </Link>
                </div>
            </section>
        </div>
    );
}
