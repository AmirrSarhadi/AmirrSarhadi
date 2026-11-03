import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toPersianNumber } from "../../utils/formatters";
import "./ActionQueue.scss";

export default function ActionQueue({ items, title = "نیازمند پیگیری" }) {
    return (
        <section className="action-queue" aria-label={title}>
            <h2>{title}</h2>
            <p>برای دیدن جزئیات و انجام مرحلهٔ بعد، یکی از موارد را انتخاب کنید.</p>
            <ul>
                {items.map(({ key, title: label, description, count, to }) => (
                    <li key={key}>
                        <Link to={to}>
                            <span className="action-queue__count">{toPersianNumber(count)}</span>
                            <span className="action-queue__copy"><strong>{label}</strong><small>{description}</small></span>
                            <ArrowLeft size={18} aria-hidden="true" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
