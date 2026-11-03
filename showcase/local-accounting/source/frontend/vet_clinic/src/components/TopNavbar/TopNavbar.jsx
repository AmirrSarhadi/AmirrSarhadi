import styles from "./TopNavbar.module.css";
import {
    FaBars,
    FaBell,
    FaChevronLeft,
    FaSearch,
    FaSignOutAlt,
    FaUserCircle,
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { menuConfig } from "../Sidebar/menuConfig";
import { canAccessModule } from "../../utils/access";

const roleLabels = {
    super_admin: "مدیرکل",
    admin: "مدیر سیستم",
    accountant: "حسابدار",
    sales: "فروش",
    warehouse: "انبار",
    viewer: "مشاهده‌گر",
};

const flattenNavigation = (items) => items.flatMap((item) => {
    if (item.dropdown) {
        return item.dropdown.map((sub) => ({
            ...sub,
            module: sub.module || item.module,
            parent: item.label,
        }));
    }
    return [{ ...item, parent: "" }];
});

export default function TopNavbar({ onMenuOpen }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInputRef = useRef(null);

    const navItems = useMemo(
        () => flattenNavigation(menuConfig).filter((item) =>
            item.path &&
            canAccessModule(user, item.module, item.action || "read")
        ),
        [user]
    );

    const currentItem = useMemo(() => {
        const matches = navItems
            .filter((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
            .sort((a, b) => b.path.length - a.path.length);
        return matches[0] || { label: "داشبورد", parent: "مدیریت مالی" };
    }, [location.pathname, navItems]);

    const searchResults = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return [];
        return navItems
            .filter((item) => `${item.label} ${item.parent || ""}`.toLowerCase().includes(normalized))
            .slice(0, 7);
    }, [navItems, query]);

    const today = new Intl.DateTimeFormat("fa-IR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

    const role = user?.role || user?.roles?.[0];

    useEffect(() => {
        const handleShortcut = (event) => {
            const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
            if (isSearchShortcut) {
                event.preventDefault();
                setSearchOpen(true);
                window.requestAnimationFrame(() => searchInputRef.current?.focus());
            }
            if (event.key === "Escape") {
                setSearchOpen(false);
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    const goTo = (path) => {
        setQuery("");
        setSearchOpen(false);
        navigate(path);
    };

    return (
        <header className={styles.topNavbar}>
            <button
                type="button"
                className={`${styles.iconButton} ${styles.mobileMenuButton}`}
                onClick={onMenuOpen}
                aria-label="باز کردن منوی اصلی"
                title="منوی اصلی"
            >
                <FaBars />
            </button>

            <div className={styles.pageIdentity}>
                <div className={styles.breadcrumb}>
                    <span>{currentItem.parent || "سامانه مالی"}</span>
                    <FaChevronLeft />
                    <strong>{currentItem.label}</strong>
                </div>
                <h1>{currentItem.label}</h1>
            </div>

            <div className={styles.actions}>
                <div className={styles.dateChip}>{today}</div>

                <div className={styles.searchWrap}>
                    <div className={`${styles.searchBox} ${searchOpen ? styles.searchFocused : ""}`}>
                        <FaSearch />
                        <input
                            ref={searchInputRef}
                            type="search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                            placeholder="جستجو در صفحات..."
                            aria-label="جستجو در صفحات سامانه"
                            aria-expanded={searchOpen && Boolean(query.trim())}
                            aria-controls="global-search-results"
                            aria-autocomplete="list"
                        />
                        <kbd>⌘ K</kbd>
                    </div>

                    {searchOpen && query.trim() && (
                        <div id="global-search-results" className={styles.searchResults} role="listbox" aria-label="نتایج جستجوی صفحات">
                            {searchResults.length ? searchResults.map((item) => (
                                <button key={item.path} type="button" role="option" onMouseDown={() => goTo(item.path)}>
                                    <span>{item.label}</span>
                                    <small>{item.parent || "سامانه"}</small>
                                </button>
                            )) : (
                                <div className={styles.noResult}>صفحه‌ای با این عنوان پیدا نشد.</div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => navigate("/banking/cheque-dashboard")}
                    title="هشدارهای خزانه"
                    aria-label="هشدارهای خزانه"
                >
                    <FaBell />
                    <span className={styles.notificationDot} />
                </button>

                <div className={styles.profile}>
                    <div className={styles.avatar}><FaUserCircle /></div>
                    <div className={styles.profileText}>
                        <strong>{user?.full_name || user?.username || "کاربر"}</strong>
                        <span>{roleLabels[role] || role || "کاربر سامانه"}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className={`${styles.iconButton} ${styles.logoutButton}`}
                    onClick={logout}
                    title="خروج از حساب"
                    aria-label="خروج از حساب"
                >
                    <FaSignOutAlt />
                </button>
            </div>
        </header>
    );
}
