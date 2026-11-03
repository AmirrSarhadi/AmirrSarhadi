import OwnerActionQueue from "../../components/workspace/OwnerActionQueue";
import { Link } from "react-router-dom";
import useOwnerDealer, {
    useDealerSubscription,
    useDealerAnalytics,
} from "../../hooks/useOwnerDealer";
import QueryStatus from "../../components/shared/QueryStatus";
import DealerMetrics from "../../components/dealer/DealerMetrics";
import { toPersianNumber } from "../../utils/formatters";
import "./DealerDashboardPage.scss";
export default function DealerDashboardPage() {
    const { data: profile } = useOwnerDealer();
    const subscription = useDealerSubscription();
    const analytics = useDealerAnalytics();
    return (
        <div className="dealer-dashboard-page">
            <div className="dealer-dashboard-page__heading">
                <div>
                    <h1>{profile?.business_name}</h1>
                    <p>مدیریت آگهی‌ها، اشتراک و عملکرد نمایشگاه</p>
                </div>
                <Link to="/listing/create" className="btn btn-primary">
                    ثبت آگهی جدید
                </Link>
            </div>
            <QueryStatus query={subscription}>
                {subscription.data ? (
                    <section className="dealer-active-plan">
                        <div>
                            <span>پلن ثبت‌شده</span>
                            <strong>{subscription.data.plan.name}</strong>
                            <p>
                                {subscription.data.is_valid
                                    ? "اشتراک معتبر است"
                                    : "اعتبار اشتراک پایان یافته است"}
                            </p>
                        </div>
                        <div>
                            <span>ویژه‌سازی باقی‌مانده</span>
                            <strong>
                                {toPersianNumber(
                                    subscription.data.remaining_featured_quota,
                                )}
                            </strong>
                        </div>
                        <div>
                            <span>نردبان باقی‌مانده</span>
                            <strong>
                                {toPersianNumber(
                                    subscription.data.remaining_bump_quota,
                                )}
                            </strong>
                        </div>
                        <Link to="/dealer-dashboard/subscription">
                            جزئیات اشتراک
                        </Link>
                    </section>
                ) : (
                    <section className="dealer-subscription-alert">
                        <h2>اشتراک فعالی ندارید</h2>
                        <Link to="/dealer-dashboard/plans">مشاهده پلن‌ها</Link>
                    </section>
                )}
            </QueryStatus>
            <OwnerActionQueue basePath="/dealer-dashboard" />
            <h2 className="h4 my-4">عملکرد ۳۰ روز اخیر</h2>
            <QueryStatus query={analytics}>
                {analytics.data && (
                    <DealerMetrics summary={analytics.data.summary} />
                )}
            </QueryStatus>
            <div className="d-flex flex-wrap gap-3 mt-4">
                <Link to="/dealer-dashboard/listings">مدیریت آگهی‌ها</Link>
                <Link to="/dealer-dashboard/analytics">گزارش کامل</Link>
                {profile?.slug && (
                    <Link to={`/dealers/${encodeURIComponent(profile.slug)}`}>
                        صفحه عمومی نمایشگاه
                    </Link>
                )}
            </div>
        </div>
    );
}
