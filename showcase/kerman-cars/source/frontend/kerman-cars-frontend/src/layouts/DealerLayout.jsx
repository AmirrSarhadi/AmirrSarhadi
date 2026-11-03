import useWorkspaceDrawer from "../hooks/useWorkspaceDrawer";
import ThemeToggle from "../components/theme/ThemeToggle";
import NotificationLink from "../components/activity/NotificationLink";
import {
    BadgeDollarSign,
    BarChart3,
    Flag,
    CarFront,
    CreditCard,
    House,
    LayoutDashboard,
    LogOut,
    Menu,
    Plus,
    Settings,
    Store,
    X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import logo from "../assets/images/kerman-cars-logo.webp";
import useAuthStore from "../store/authStore";
import useOwnerDealer from "../hooks/useOwnerDealer";

import "./DealerLayout.scss";

const dealerNavigation = [
    { to: "/dashboard/reports", label: "گزارش‌های من", icon: Flag },
    {
        to: "/dealer-dashboard",
        label: "نمای کلی",
        icon: LayoutDashboard,
        end: true,
    },
    {
        to: "/dealer-dashboard/listings",
        label: "آگهی‌های نمایشگاه",
        icon: CarFront,
    },
    {
        to: "/listing/create",
        label: "ثبت آگهی",
        icon: Plus,
    },
    {
        to: "/dealer-dashboard/analytics",
        label: "آمار و گزارش‌ها",
        icon: BarChart3,
    },
    {
        to: "/dealer-dashboard/plans",
        label: "پلن‌ها",
        icon: BadgeDollarSign,
    },
    {
        to: "/dealer-dashboard/subscription",
        label: "اشتراک من",
        icon: CreditCard,
    },
    {
        to: "/dealer-dashboard/profile",
        label: "پروفایل نمایشگاه",
        icon: Settings,
    },
];

function DealerLayout() {
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { data: dealerProfile } = useOwnerDealer();

    const logout = useAuthStore((state) => state.logout);

    useWorkspaceDrawer(isMenuOpen, setIsMenuOpen, "dealer", "منوی نمایشگاه");

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            toast.error("خروج محلی انجام شد، اما لغو نشست روی سرور تأیید نشد.");
            navigate("/auth/login", { replace: true });
            return;
        }
        closeMenu();

        toast.success("از حساب خارج شدید.");

        navigate("/", {
            replace: true,
        });
    };

    return (
        <div className="dealer-layout">
            <button
                type="button"
                className={`dealer-layout__overlay ${
                    isMenuOpen ? "dealer-layout__overlay--visible" : ""
                }`}
                onClick={closeMenu}
                aria-label="بستن منو"
                tabIndex={isMenuOpen ? 0 : -1}
            />

            <aside
                className={`dealer-sidebar ${
                    isMenuOpen ? "dealer-sidebar--open" : ""
                }`}
            >
                <div className="dealer-sidebar__top">
                    <Link
                        to="/"
                        className="dealer-sidebar__brand"
                        onClick={closeMenu}
                    >
                        <img src={logo} alt="KERMAN.CARS" />

                        <div>
                            <strong>KERMAN.CARS</strong>

                            <span>پنل نمایشگاه</span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        className="dealer-sidebar__close"
                        aria-label="بستن منوی نمایشگاه"
                        onClick={closeMenu}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="dealer-sidebar__profile">
                    <span>
                        <Store size={22} />
                    </span>

                    <div>
                        <strong>{dealerProfile?.business_name}</strong>

                        <small>نمایشگاه تأییدشده</small>
                    </div>
                </div>

                <nav
                    className="dealer-sidebar__navigation"
                    aria-label="پنل نمایشگاه"
                >
                    {dealerNavigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                onClick={closeMenu}
                                className={({ isActive }) =>
                                    isActive ? "active" : ""
                                }
                            >
                                <Icon size={19} />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    className="dealer-sidebar__logout"
                    onClick={handleLogout}
                >
                    <LogOut size={19} />
                    خروج از حساب
                </button>
            </aside>

            <div className="dealer-layout__content">
                <header className="dealer-header">
                    <button
                        type="button"
                        className="dealer-header__menu"
                        aria-label="بازکردن منوی نمایشگاه"
                        aria-expanded={isMenuOpen}
                        onClick={() => setIsMenuOpen(true)}
                    >
                        <Menu size={22} />
                    </button>

                    <Link to="/" className="dealer-header__home" aria-label="بازگشت به سایت">
                        <House size={18} />
                        بازگشت به سایت
                    </Link>

                    <ThemeToggle /><NotificationLink />
                    <Link to="/dashboard" className="dealer-header__switch">
                        پنل کاربری
                    </Link>
                </header>

                <main id="main-content" className="dealer-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default DealerLayout;
