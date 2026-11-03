import { toPersianNumber } from "../../utils/formatters";
export default function DealerMetrics({ summary }) {
    const labels = {
        total_views: "بازدید",
        unique_views: "بازدید یکتا",
        phone_reveals: "نمایش شماره",
        call_clicks: "کلیک تماس",
        whatsapp_clicks: "کلیک واتساپ",
        shares: "اشتراک‌گذاری",
        favorite_events: "افزودن به علاقه‌مندی",
        current_favorites: "علاقه‌مندی فعلی",
        conversion_rate: "نرخ تبدیل (درصد)",
    };
    return (
        <div className="row g-3">
            {Object.entries(labels).map(([key, label]) => (
                <div className="col-12 col-sm-6 col-xl-4" key={key}>
                    <article className="dealer-summary-card">
                        <div>
                            <h2 className="h6">{label}</h2>
                            <strong>{toPersianNumber(summary[key])}</strong>
                        </div>
                    </article>
                </div>
            ))}
        </div>
    );
}
