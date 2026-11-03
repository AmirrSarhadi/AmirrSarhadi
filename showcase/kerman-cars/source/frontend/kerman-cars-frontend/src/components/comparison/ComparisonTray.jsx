import { Link, useLocation } from "react-router-dom";
import useComparisonStore from "../../store/comparisonStore";
import { toPersianNumber } from "../../utils/formatters";
import "./Comparison.scss";
export default function ComparisonTray() {
    const ids = useComparisonStore((state) => state.ids);
    const clear = useComparisonStore((state) => state.clear);
    const { pathname } = useLocation();
    // Detail pages own their mobile contact action; never cover it with a tray.
    if (!ids.length || pathname === "/compare" || pathname.startsWith("/listing/") || /^\/cars\/.+/.test(pathname))
        return null;
    return (
        <div className="comparison-tray-space">
            <aside
                className={`comparison-tray ${pathname.startsWith("/dashboard") ? "comparison-tray--workspace" : ""}`}
                aria-label="خودروهای انتخاب‌شده برای مقایسه"
            >
                <span role="status">
                    {toPersianNumber(ids.length)} خودرو از ۳ انتخاب شده
                </span>
                <Link
                    className="btn btn-primary"
                    to={`/compare?ids=${ids.join(",")}`}
                >
                    مشاهده مقایسه
                </Link>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={clear}
                >
                    پاک کردن انتخاب‌ها
                </button>
            </aside>
        </div>
    );
}
