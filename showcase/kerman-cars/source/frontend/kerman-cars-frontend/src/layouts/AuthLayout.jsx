import ThemeToggle from "../components/theme/ThemeToggle";
import { Link, Outlet } from "react-router-dom";
import {
    ArrowRight,
    BadgeCheck,
    CarFront,
    ShieldCheck,
} from "lucide-react";

import logo from "../assets/images/kerman-cars-logo.webp";

import "./AuthLayout.scss";

function AuthLayout() {
    return (
        <div className="auth-layout">
            <aside className="auth-layout__visual">
                <div className="auth-layout__visual-overlay" />

                <div className="auth-layout__brand">
                    <img
                        src={logo}
                        alt="KERMAN.CARS"
                    />

                    <div>
                        <strong>KERMAN.CARS</strong>
                        <span>بازار تخصصی خودرو کرمان</span>
                    </div>
                </div>

                <div className="auth-layout__message">
                    <span className="auth-layout__eyebrow">
                        خرید و فروش مطمئن خودرو
                    </span>

                    <p className="auth-layout__headline">
                        سریع، ساده و
                        <span> قابل اعتماد</span>
                    </p>

                    <p>
                        برای ثبت آگهی، مدیریت خودروها و ذخیره
                        علاقه‌مندی‌ها وارد حساب خود شوید.
                    </p>

                    <div className="auth-layout__features">
                        <span>
                            <BadgeCheck size={18} />
                            بررسی آگهی‌ها
                        </span>

                        <span>
                            <ShieldCheck size={18} />
                            امنیت اطلاعات
                        </span>

                        <span>
                            <CarFront size={18} />
                            ثبت آگهی سریع
                        </span>
                    </div>
                </div>
            </aside>

            <main id="main-content" className="auth-layout__main">
                <div className="auth-layout__theme"><ThemeToggle /></div>
                <Link
                    to="/"
                    className="auth-layout__back"
                >
                    <ArrowRight size={18} />
                    بازگشت به سایت
                </Link>

                <div className="auth-layout__content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default AuthLayout;