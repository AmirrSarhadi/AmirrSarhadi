import { Link } from "react-router-dom";
import useCatalog from "../../hooks/useCatalog";
import QueryStatus from "../../components/shared/QueryStatus";
import { formatPrice, toPersianNumber } from "../../utils/formatters";
import "./DealerPlansPage.scss";
export function PlanDetails({ plan }) {
    return (
        <dl>
            {[
                ["مدت اعتبار (روز)", plan.duration_days],
                ["ظرفیت آگهی فعال", plan.max_active_listings],
                ["سهمیه ثبت آگهی", plan.monthly_listing_quota],
                ["سهمیه ویژه‌سازی", plan.featured_quota],
                ["مدت ویژه‌سازی (روز)", plan.feature_duration_days],
                ["سهمیه نردبان", plan.bump_quota],
                ["فاصله نردبان (ساعت)", plan.bump_cooldown_hours],
            ].map(([label, value]) => (
                <div
                    className="d-flex justify-content-between gap-3 py-2"
                    key={label}
                >
                    <dt>{label}</dt>
                    <dd>{toPersianNumber(value)}</dd>
                </div>
            ))}
        </dl>
    );
}
export default function DealerPlansPage() {
    const query = useCatalog("subscriptions/plans/");
    return (
        <section className="dealer-plans-page">
            <h1>پلن‌های نمایشگاه</h1>
            <p>شرایط و قیمت از اطلاعات ثبت‌شدهٔ سایت دریافت می‌شوند.</p>
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        {!query.data.length && (
                            <p role="status">پلن فعالی ثبت نشده است.</p>
                        )}
                        <div className="dealer-plans-grid">
                            {query.data.map((plan) => (
                                <article
                                    className="dealer-plan-card"
                                    key={plan.id}
                                >
                                    <h2>{plan.name}</h2>
                                    <p className="dealer-plan-card__price">
                                        {formatPrice(plan.price)}
                                    </p>
                                    <PlanDetails plan={plan} />
                                    <Link
                                        className="btn btn-primary"
                                        to={`/dealer/checkout/${plan.id}`}
                                    >
                                        جزئیات خرید
                                    </Link>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </QueryStatus>
        </section>
    );
}
