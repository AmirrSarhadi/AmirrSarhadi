import ComparisonTray from "../components/comparison/ComparisonTray";
import useWorkspaceDrawer from "../hooks/useWorkspaceDrawer";
import ThemeToggle from "../components/theme/ThemeToggle";
import NotificationLink from "../components/activity/NotificationLink";
import { useState } from "react";
import {
    Bookmark,
    Flag,
    CarFront,
    Heart,
    Bell,
    History,
    Monitor,
    House,
    LayoutDashboard,
    LogOut,
    Menu,
    Plus,
    Store,
    UserRound,
    X,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import logo from "../assets/images/kerman-cars-logo.webp";

import useAuthStore from "../store/authStore";
import useOwnerDealer from "../hooks/useOwnerDealer";

import "./DashboardLayout.scss";

function DashboardLayout() {
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const user = useAuthStore((state) => state.user);

    const logout = useAuthStore((state) => state.logout);

    const { data: dealerProfile } = useOwnerDealer();
    const dealerStatus = dealerProfile?.status;

    const dealerRoute =
        dealerStatus === "approved"
            ? "/dealer-dashboard"
            : dealerStatus
              ? "/dealer/status"
              : "/dealer/register";

    const dealerLabel =
        dealerStatus === "approved"
            ? "پنل نمایشگاه"
            : dealerStatus === "pending"
              ? "وضعیت درخواست نمایشگاه"
              : dealerStatus === "rejected"
                ? "پیگیری درخواست نمایشگاه"
                : "حساب نمایشگاهی";

    const navigationItems = [
        {
            to: "/dashboard",
            label: "نمای کلی",
            icon: LayoutDashboard,
            end: true,
        },
        {
            to: "/dashboard/listings",
            label: "آگهی‌های من",
            icon: CarFront,
        },
        {
            to: "/dashboard/favorites",
            label: "علاقه‌مندی‌ها",
            icon: Heart,
        },
        { to: "/dashboard/saved-searches", label: "جست‌وجوهای ذخیره‌شده", icon: Bookmark },
        { to: "/dashboard/reports", label: "گزارش‌های من", icon: Flag },
        { to: "/dashboard/notifications", label: "اعلان‌ها", icon: Bell },
        { to: "/dashboard/history", label: "تاریخچه بازدید", icon: History },
        {
            to: "/listing/create",
            label: "ثبت آگهی جدید",
            icon: Plus,
        },
        {
            to: dealerRoute,
            label: dealerLabel,
            icon: Store,
        },
        { to: "/dashboard/sessions", label: "دستگاه‌های فعال", icon: Monitor },
        {
            to: "/dashboard/profile",
            label: "اطلاعات حساب",
            icon: UserRound,
        },
    ];

    useWorkspaceDrawer(isSidebarOpen, setIsSidebarOpen, "dashboard", "منوی پنل کاربری");

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const handleLogout = async () => {
        closeSidebar();
        try {
            await logout();
        } catch {
            toast.error("خروج محلی انجام شد، اما لغو نشست روی سرور تأیید نشد.");
            navigate("/auth/login", { replace: true });
            return;
        }

        toast.success("از حساب کاربری خارج شدید.");

        navigate("/", {
            replace: true,
        });
    };

    const fullName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="dashboard-layout">
            <button
                type="button"
                className={[
                    "dashboard-sidebar-overlay",
                    isSidebarOpen ? "dashboard-sidebar-overlay--visible" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
                onClick={closeSidebar}
                aria-label="بستن منوی پنل کاربری"
                tabIndex={isSidebarOpen ? 0 : -1}
            />

            <aside
                className={[
                    "dashboard-sidebar",
                    isSidebarOpen ? "dashboard-sidebar--open" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div className="dashboard-sidebar__top">
                    <Link
                        to="/"
                        className="dashboard-sidebar__brand"
                        onClick={closeSidebar}
                    >
                        <img src={logo} alt="لوگوی KERMAN.CARS" />

                        <div>
                            <strong>KERMAN.CARS</strong>
                            <span>پنل کاربری</span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        className="dashboard-sidebar__close"
                        onClick={closeSidebar}
                        aria-label="بستن منو"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav
                    className="dashboard-sidebar__navigation"
                    aria-label="منوی پنل کاربری"
                >
                    {navigationItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={`${item.label}-${item.to}`}
                                to={item.to}
                                end={item.end}
                                onClick={closeSidebar}
                                className={({ isActive }) =>
                                    isActive ? "active" : ""
                                }
                            >
                                <Icon size={19} />

                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    className="dashboard-sidebar__logout"
                    onClick={handleLogout}
                >
                    <LogOut size={19} />
                    <span>خروج از حساب</span>
                </button>
            </aside>

            <div className="dashboard-layout__content">
                <header className="dashboard-header">
                    <button
                        type="button"
                        className="dashboard-header__menu"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="بازکردن منوی پنل کاربری"
                        aria-expanded={isSidebarOpen}
                    >
                        <Menu size={22} />
                    </button>

                    <Link to="/" className="dashboard-header__home" aria-label="بازگشت به سایت">
                        <House size={18} />
                        <span>بازگشت به سایت</span>
                    </Link>

                    <ThemeToggle /><NotificationLink />
                    <div className="dashboard-header__user">
                        <div>
                            <strong>{fullName || "کاربر KERMAN.CARS"}</strong>

                            <span dir="ltr">{user?.phone || ""}</span>
                        </div>

                        <span className="dashboard-header__avatar">
                            <UserRound size={21} />
                        </span>
                    </div>
                </header>

                <main id="main-content" className="dashboard-main">
                    <Outlet />
                    <ComparisonTray />
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;
