// src/components/Sidebar/Sidebar.jsx
import styles from "./Sidebar.module.css";
import {
  FaTachometerAlt,
  FaUsers,
  FaPiggyBank,
  FaHandHoldingUsd,
  FaShoppingCart,
  FaBoxOpen,
  FaBook,
  FaPlus,
  FaChartBar,
  FaCogs,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaFileInvoiceDollar,
  FaUndo,
  FaBolt,
  FaListUl,
  FaHandshake,
  FaPercent,
  FaMoneyBillWave,
  FaBalanceScale,
  FaSave,
  FaTable,
  FaCompressArrowsAlt,
  FaBars,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { canAccessModule } from "../../utils/access";

import { menuConfig } from "./menuConfig";

function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }) {
  const location = useLocation();
  const { user } = useAuth();

  const canReadMenuItem = (item) => {
    return canAccessModule(user, item.module, "read");
  };

  const canUseMenuItem = (item, parentModule) => {
    return canAccessModule(
      user,
      item.module || parentModule,
      item.action || "read"
    );
  };

  const visibleMenuConfig = useMemo(() => {
    return menuConfig
      .filter((item) => canReadMenuItem(item))
      .map((item) => {
        if (!item.dropdown) {
          return item;
        }

        const dropdown = item.dropdown.filter((sub) =>
          canAccessModule(user, sub.module || item.module, "read")
        );

        return {
          ...item,
          dropdown,
        };
      })
      .filter((item) => !item.dropdown || item.dropdown.length > 0);
  }, [user]);

  const initialOpen = useMemo(() => {
    const openedMenus = {};

    visibleMenuConfig.forEach((item) => {
      if (item.dropdown) {
        openedMenus[item.label] = item.dropdown.some((sub) =>
          location.pathname.startsWith(sub.path)
        );
      }
    });

    return openedMenus;
  }, [location.pathname, visibleMenuConfig]);

  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    setOpenMenus(initialOpen);
  }, [initialOpen]);

  const toggleDropdown = (label) => {
    setOpenMenus((prev) => {
      const nextState = {};

      visibleMenuConfig.forEach((item) => {
        if (item.dropdown) {
          nextState[item.label] = false;
        }
      });

      nextState[label] = !prev[label];

      return nextState;
    });
  };

  const isActiveStarts = (path) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const disabledTitle = "نقش کاربری شما اجازه انجام این عملیات را ندارد";

  const handleNavigate = () => {
    onMobileClose?.();
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.mobileBackdrop} ${mobileOpen ? styles.mobileBackdropVisible : ""}`}
        onClick={onMobileClose}
        aria-label="بستن منوی اصلی"
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${mobileOpen ? styles.mobileOpen : ""}`}
        aria-label="منوی اصلی سامانه"
      >
      <button
        className={styles.hamburgerBtn}
        onClick={onToggle}
        aria-label="Toggle sidebar"
        title="باز/بسته کردن منو"
      >
        <FaBars />
      </button>

      <div className={styles.logo}>
        <div className={styles.logoMark}>آ</div>
        {!collapsed && (
          <div className={styles.logoText}>
            <h2>حسابداری آرن</h2>
            <span>سامانه مدیریت مالی</span>
          </div>
        )}
      </div>

      <nav className={styles.nav} aria-label="ناوبری اصلی">
        {visibleMenuConfig.map((item) => {
          const key = item.label || item.path;

          if (item.dropdown) {
            const open = !!openMenus[item.label];
            const parentActive = item.dropdown.some((sub) =>
              isActiveStarts(sub.path)
            );

            return (
              <div key={key} className={styles.menuItemContainer}>
                <button
                  type="button"
                  onClick={() => toggleDropdown(item.label)}
                  className={`${styles.menuItem} ${styles.dropdownToggle} ${open ? styles.open : ""
                    } ${parentActive ? styles.activeParent : ""}`}
                  title={item.label}
                  aria-expanded={open}
                >
                  <span className={styles.icon}>{item.icon}</span>

                  {!collapsed && (
                    <>
                      <span className={styles.label}>{item.label}</span>

                      <span className={styles.arrow}>
                        {open ? (
                          <FaChevronUp size={12} />
                        ) : (
                          <FaChevronDown size={12} />
                        )}
                      </span>
                    </>
                  )}
                </button>

                {open && !collapsed && (
                  <div className={styles.dropdownMenu}>
                    {item.dropdown.map((sub) => {
                      const allowed = canUseMenuItem(sub, item.module);
                      const active = isActiveStarts(sub.path);

                      if (!allowed) {
                        return (
                          <span
                            key={sub.path}
                            className={`${styles.dropdownItem} ${styles.disabledItem}`}
                            title={disabledTitle}
                            aria-disabled="true"
                          >
                            <span className={styles.subLabel}>{sub.label}</span>
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={handleNavigate}
                          className={`${styles.dropdownItem} ${active ? styles.active : ""
                            }`}
                          title={sub.label}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className={styles.subLabel}>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const allowed = canUseMenuItem(item, item.module);

          if (!allowed) {
            return (
              <div key={key} className={styles.menuItemContainer}>
                <span
                  className={`${styles.menuItem} ${styles.disabledItem}`}
                  title={disabledTitle}
                  aria-disabled="true"
                >
                  <span className={styles.icon}>{item.icon}</span>

                  {!collapsed && (
                    <span className={styles.label}>{item.label}</span>
                  )}
                </span>
              </div>
            );
          }

          return (
            <div key={key} className={styles.menuItemContainer}>
              <Link
                to={item.path}
                onClick={handleNavigate}
                className={`${styles.menuItem} ${isActiveStarts(item.path) ? styles.active : ""
                  }`}
                title={item.label}
                aria-current={isActiveStarts(item.path) ? "page" : undefined}
              >
                <span className={styles.icon}>{item.icon}</span>

                {!collapsed && (
                  <span className={styles.label}>{item.label}</span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>
      </aside>
    </>
  );
}

export default Sidebar;
