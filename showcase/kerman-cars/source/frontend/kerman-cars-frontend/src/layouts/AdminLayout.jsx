import useWorkspaceDrawer from "../hooks/useWorkspaceDrawer";
import ThemeToggle from "../components/theme/ThemeToggle";
import NotificationLink from "../components/activity/NotificationLink";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, House, LayoutDashboard, CarFront, Store, Users, Flag, BookOpen, Layers, CreditCard, WalletCards, Image, Settings, CircleHelp } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import "./AdminLayout.scss";

const navIcons = [LayoutDashboard, CarFront, Store, Users, Flag, BookOpen, Layers, CreditCard, WalletCards, Image, Settings, BookOpen, CircleHelp];
const links = [
    ["/admin", "داشبورد"],
    ["/admin/listings", "آگهی‌ها"],
    ["/admin/dealers", "بنگاه‌ها"],
    ["/admin/users", "کاربران"],
    ["/admin/reports", "گزارش تخلف"],
    ["/admin/catalog/brands", "کاتالوگ و شهرها"],
    ["/admin/plans", "پلن‌ها"],
    ["/admin/subscriptions", "اشتراک کاربران"],
    ["/admin/payments", "پرداخت‌ها"],
    ["/admin/banners", "بنرها"],
    ["/admin/settings", "صفحه اصلی"],
    ["/admin/articles", "مجله"],
    ["/admin/faqs", "سؤال‌های متداول"],
];

export default function AdminLayout() {
    const [open, setOpen] = useState(false);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    useWorkspaceDrawer(open, setOpen, "admin", "منوی مدیریت");
    const leave = async () => {
        try {
            await logout();
        } catch {
            toast.error("خروج محلی انجام شد، اما لغو نشست روی سرور تأیید نشد.");
        }
        navigate("/auth/login", { replace: true });
    };
    return (
        <div className="admin-layout">
            <button
                type="button"
                className={`admin-layout__overlay ${open ? "admin-layout__overlay--visible" : ""}`}
                onClick={() => setOpen(false)}
                aria-label="بستن منوی مدیریت"
                tabIndex={open ? 0 : -1}
            />
            <aside
                className={`admin-sidebar ${open ? "admin-sidebar--open" : ""}`}
            >
                <div className="admin-sidebar__top">
                    <Link to="/" className="admin-sidebar__brand">
                        کرمان کارز
                    </Link>
                    <button
                        type="button"
                        className="admin-sidebar__close"
                        aria-label="بستن منو"
                        onClick={() => setOpen(false)}
                    >
                        <X />
                    </button>
                </div>
                <div className="admin-sidebar__identity">
                    <div>
                        <strong>
                            {user?.firstName} {user?.lastName}
                        </strong>
                        <small>{user?.phone}</small>
                    </div>
                </div>
                <nav
                    className="admin-sidebar__navigation"
                    aria-label="پنل مدیریت"
                >
                    {links.map(([to, label], index) => { const Icon = navIcons[index]; return (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/admin"}
                            onClick={() => setOpen(false)}
                        >
                            <Icon size={18} aria-hidden="true" />{label}
                        </NavLink>
                    ); })}
                </nav>
                <button
                    type="button"
                    className="admin-sidebar__logout"
                    onClick={leave}
                >
                    <LogOut />
                    خروج از حساب
                </button>
            </aside>
            <div className="admin-layout__content">
                <header className="admin-header">
                    <button
                        type="button"
                        className="admin-header__menu"
                        aria-label="بازکردن منوی مدیریت"
                        aria-expanded={open}
                        onClick={() => setOpen(true)}
                    >
                        <Menu />
                    </button>
                    <Link to="/" className="admin-header__home" aria-label="بازگشت به سایت">
                        <House />
                        بازگشت به سایت
                    </Link>
                    <ThemeToggle /><NotificationLink />
                    <span className="admin-header__user">مدیریت سامانه</span>
                </header>
                <main id="main-content" className="admin-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
