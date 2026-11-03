import { Link } from "react-router-dom";
import { FaStar, FaChartPie, FaFileInvoiceDollar, FaLayerGroup } from "react-icons/fa";
import { PageHero, StatGrid, StatCard } from "../../../components/ERP";
import styles from "./ReportsHub.module.css";

const reportGroups = [
    {
        title: "مالی",
        items: [
            { label: "ترازنامه", path: "/accounting/balance-sheet" },
            { label: "صورت سود و زیان", path: "/accounting/profit-loss" },
            { label: "صورت‌حساب سرمایه", disabled: true },
        ],
    },
    {
        title: "خرید و فروش",
        items: [
            { label: "خرید به تفکیک کالا", path: "/reports/purchases-by-item" },
            { label: "فروش به تفکیک کالا", path: "/reports/sales-by-item" },
            { label: "فروش به تفکیک فاکتور", path: "/reports/sales-by-invoice" },
            { label: "خرید به تفکیک فاکتور", path: "/reports/purchases-by-invoice" },
            { label: "گزارش مالیات", path: "/reports/tax" },
            { label: "سود فاکتور", path: "/reports/invoice-profit" },
            { label: "خلاصه فاکتور به تفکیک شخص", path: "/reports/invoice-summary-by-person" },
            { label: "فروش به تفکیک فروشنده", path: "/reports/sales-by-seller" },
            { label: "گزارش وضعیت اقساط", path: "/reports/installments" },
        ],
    },
    {
        title: "حسابداری",
        items: [
            { label: "دفتر روزنامه", path: "/accounting/journal" },
            { label: "دفتر حساب‌ها", path: "/accounting/accounts" },
            { label: "دفتر کل", path: "/accounting/ledger" },
            { label: "تراز آزمایشی", path: "/accounting/trial-balance" },
            { label: "مرور حساب‌ها", path: "/accounting/accounts" },
            { label: "مرور حساب‌های تفصیل", path: "/accounting/details" },
            { label: "دفتر روزنامه تجمیعی", path: "/accounting/document-summary" },
            { label: "دفتر کل تجمیعی", path: "/accounting/ledger" },
        ],
    },
    {
        title: "بانکداری",
        items: [
            { label: "گردش حساب بانک", path: "/reports/bank-ledger" },
            { label: "گردش حساب صندوق", path: "/reports/cashbox-ledger" },
            { label: "گردش حساب تنخواه‌گردان", path: "/reports/imprest-ledger" },
        ],
    },
    {
        title: "اشخاص",
        items: [
            { label: "بدهکاران و بستانکاران", path: "/persons/balances-report" },
            { label: "کارت حساب اشخاص", path: "/persons/detail-audit" },
        ],
    },
    {
        title: "سایر",
        items: [
            { label: "کارت پروژه", disabled: true },
            { label: "لاگ کاربران", path: "/settings/audit-logs" },
        ],
    },
    {
        title: "کالاها و خدمات",
        items: [
            { label: "موجودی کالا", path: "/inventory/stock/items" },
            { label: "کارت حساب کالا", path: "/reports/material-ledger" },
            { label: "گزارش شماره سریال", path: "/reports/serial-numbers" },
        ],
    },
];

function ReportItem({ item }) {
    const content = (
        <>
            <span className={styles.itemText}>{item.label}</span>

            <span className={styles.itemMeta}>
                {item.disabled && <small>به‌زودی</small>}
                <FaStar />
            </span>
        </>
    );

    if (item.disabled || !item.path) {
        return (
            <div className={`${styles.reportItem} ${styles.disabledItem}`}>
                {content}
            </div>
        );
    }

    return (
        <Link to={item.path} className={styles.reportItem}>
            {content}
        </Link>
    );
}

export default function ReportsHub() {
    return (
        <div className={styles.page}>
            <PageHero
                eyebrow="مرکز گزارش‌گیری"
                title="تمام گزارش‌ها"
                description="دسترسی متمرکز به گزارش‌های مالی، تجاری، خزانه، اشخاص و موجودی با ساختار یکپارچه."
                icon={<FaChartPie />}
            />

            <StatGrid>
                <StatCard label="گروه‌های گزارش" value={reportGroups.length.toLocaleString("fa-IR")} icon={<FaLayerGroup />} />
                <StatCard label="گزارش‌های فعال" value={reportGroups.reduce((sum, group) => sum + group.items.filter((item) => item.path && !item.disabled).length, 0).toLocaleString("fa-IR")} tone="success" icon={<FaFileInvoiceDollar />} />
                <StatCard label="در حال توسعه" value={reportGroups.reduce((sum, group) => sum + group.items.filter((item) => item.disabled).length, 0).toLocaleString("fa-IR")} tone="warning" />
            </StatGrid>

            <div className={styles.groupsGrid}>
                {reportGroups.map((group) => (
                    <section key={group.title} className={styles.groupCard}>
                        <div className={styles.groupHeader}>
                            <h3>{group.title}</h3>
                        </div>

                        <div className={styles.groupBody}>
                            {group.items.map((item) => (
                                <ReportItem key={`${group.title}-${item.label}`} item={item} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}