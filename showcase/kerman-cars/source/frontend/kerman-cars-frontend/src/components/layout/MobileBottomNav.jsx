import { NavLink } from "react-router-dom";
import {
    CarFront,
    Heart,
    House,
    Plus,
    UserRound,
} from "lucide-react";

import useAuthStore from "../../store/authStore";

import "./MobileBottomNav.scss";

function MobileBottomNav() {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated,
    );

    const user = useAuthStore(
        (state) => state.user,
    );

    const accountPath =
        user?.role === "ADMIN"
            ? "/admin"
            : "/dashboard";

    const navigationItems = [
        {
            to: "/",
            label: "خانه",
            icon: House,
            end: true,
        },
        {
            to: "/cars",
            label: "آگهی‌ها",
            icon: CarFront,
        },
        {
            to: "/listing/create",
            label: "ثبت آگهی",
            icon: Plus,
            primary: true,
        },
        {
            to: isAuthenticated
                ? "/dashboard/favorites"
                : "/auth/login",
            label: "ذخیره‌ها",
            icon: Heart,
        },
        {
            to: isAuthenticated
                ? accountPath
                : "/auth/login",
            label:
                user?.role === "ADMIN"
                    ? "مدیریت"
                    : "حساب من",
            icon: UserRound,
        },
    ];

    return (
        <nav className="mobile-bottom-nav">
            {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={`${item.label}-${item.to}`}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            [
                                "mobile-bottom-nav__item",
                                isActive
                                    ? "mobile-bottom-nav__item--active"
                                    : "",
                                item.primary
                                    ? "mobile-bottom-nav__item--primary"
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" ")
                        }
                    >
                        <span className="mobile-bottom-nav__icon">
                            <Icon size={21} />
                        </span>

                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}

export default MobileBottomNav;