import { Link, useParams } from "react-router-dom";
import useCatalog from "../../hooks/useCatalog";
import QueryStatus from "../../components/shared/QueryStatus";
import { PlanDetails } from "./DealerPlansPage";
import { formatPrice } from "../../utils/formatters";
import "./DealerCheckoutPage.scss";
export default function DealerCheckoutPage() {
    const { planId } = useParams();
    const query = useCatalog("subscriptions/plans/");
    const plan = query.data?.find((row) => String(row.id) === planId);
    return (
        <section className="dealer-checkout-page">
            <div className="dealer-checkout-card">
                <Link to="/dealer-dashboard/plans">بازگشت به پلن‌ها</Link>
                <QueryStatus query={query}>
                    {plan ? (
                        <>
                            <h1>خرید پلن {plan.name}</h1>
                            <p>{formatPrice(plan.price)}</p>
                            <PlanDetails plan={plan} />
                            <p role="status">
                                خرید آنلاین اشتراک هنوز فعال نشده است. پس از
                                راه‌اندازی درگاه پرداخت می‌توانید از همین بخش
                                اقدام کنید.
                            </p>
                        </>
                    ) : (
                        <p role="status">
                            این پلن وجود ندارد یا دیگر فعال نیست.
                        </p>
                    )}
                </QueryStatus>
            </div>
        </section>
    );
}
