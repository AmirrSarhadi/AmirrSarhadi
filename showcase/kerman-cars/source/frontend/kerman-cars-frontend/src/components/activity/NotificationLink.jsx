import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import useAuthStore from "../../store/authStore";
import useUnreadNotifications from "../../hooks/useUnreadNotifications";
import { toPersianNumber } from "../../utils/formatters";
import "./NotificationLink.scss";
export default function NotificationLink({ onClick, showLabel = false }) {
    const authenticated = useAuthStore((s) => s.isAuthenticated);
    const query = useUnreadNotifications();
    if (!authenticated) return null;
    const count = query.data?.unread_count;
    return (
        <Link
            className="notification-link"
            to="/dashboard/notifications"
            onClick={onClick}
            aria-label={
                query.isError
                    ? "اعلان‌ها؛ شمارنده در دسترس نیست"
                    : count == null
                      ? "اعلان‌ها؛ در حال دریافت شمارنده"
                      : `اعلان‌ها؛ ${toPersianNumber(count)} خوانده‌نشده`
            }
            title={
                query.isError
                    ? "دریافت شمارنده ناموفق بود؛ اعلان‌ها را باز کنید."
                    : "اعلان‌ها"
            }
        >
            <Bell size={20} aria-hidden="true" />
            {showLabel && <span>اعلان‌ها</span>}
            <span className="notification-link__count" aria-hidden="true">
                {query.isError
                    ? "!"
                    : count == null
                      ? "…"
                      : toPersianNumber(count)}
            </span>
        </Link>
    );
}
