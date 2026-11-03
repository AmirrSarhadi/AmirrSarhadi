import { API_BASE_URL } from "../../../api/http";
// src/Pages/BankTable/ChequeDashboard/ChequeDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./ChequeDashboard.module.css";

const API_BASE = API_BASE_URL;

const DASHBOARD_API = `${API_BASE}/banking/api/v2/cheques/dashboard/`;

function formatMoney(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString("fa-IR")} ریال`;
}

function formatDate(dateStr) {
    if (!dateStr) return "—";

    try {
        return new Date(dateStr).toLocaleDateString("fa-IR");
    } catch {
        return dateStr;
    }
}

function getCheckNumber(check) {
    return (
        check.cheque_number ||
        check.number ||
        check.sayad_number ||
        `چک #${check.id}`
    );
}

function getDueDate(check) {
    return check.due_date || check.date;
}

function getStatusText(status) {
    switch (status) {
        case "PENDING":
            return "در جریان";
        case "DEPOSITED":
            return "واگذار شده به بانک";
        case "CLEARED":
            return "وصول / پاس شده";
        case "SPENT":
            return "خرج شده";
        case "RETURNED":
            return "برگشتی";
        case "CANCELED":
            return "ابطال شده";
        default:
            return status || "—";
    }
}

function getChequeTypeText(check) {
    const value = check.cheque_type;

    if (value === "دریافتی" || value === "IN") return "دریافتی";
    if (value === "پرداختی" || value === "OUT") return "پرداختی";

    return check.cheque_type_label || value || "—";
}

function getStatusClass(status) {
    switch (status) {
        case "PENDING":
            return `${styles.statusBadge} ${styles.pending}`;
        case "DEPOSITED":
            return `${styles.statusBadge} ${styles.deposited}`;
        case "CLEARED":
            return `${styles.statusBadge} ${styles.cleared}`;
        case "SPENT":
            return `${styles.statusBadge} ${styles.spent}`;
        case "RETURNED":
            return `${styles.statusBadge} ${styles.returned}`;
        case "CANCELED":
            return `${styles.statusBadge} ${styles.canceled}`;
        default:
            return `${styles.statusBadge} ${styles.defaultStatus}`;
    }
}

function SummaryCard({ title, count, amount, tone }) {
    return (
        <div className={`${styles.summaryCard} ${styles[tone] || ""}`}>
            <span>{title}</span>
            <strong>{Number(count || 0).toLocaleString("fa-IR")}</strong>
            <p>{formatMoney(amount)}</p>
        </div>
    );
}

function ChequeTable({ items, emptyText, onGoToList }) {
    if (!items || items.length === 0) {
        return (
            <div className={styles.emptyState}>
                <strong>{emptyText}</strong>
                <p>در این بخش چکی برای نمایش وجود ندارد.</p>
            </div>
        );
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>ردیف</th>
                        <th>شماره چک</th>
                        <th>نوع</th>
                        <th>تاریخ سررسید</th>
                        <th>مبلغ</th>
                        <th>طرف حساب</th>
                        <th>بانک</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>

                <tbody>
                    {items.map((check, index) => (
                        <tr key={check.id}>
                            <td>{index + 1}</td>

                            <td>
                                <span className={styles.code}>
                                    {getCheckNumber(check)}
                                </span>
                            </td>

                            <td>{getChequeTypeText(check)}</td>

                            <td>{formatDate(getDueDate(check))}</td>

                            <td>
                                <span className={styles.amountBadge}>
                                    {formatMoney(check.amount)}
                                </span>
                            </td>

                            <td>{check.payer_name || check.spent_to_name || "—"}</td>

                            <td>{check.bank_name || check.settlement_bank_name || "—"}</td>

                            <td>
                                <span className={getStatusClass(check.status)}>
                                    {check.status_label || getStatusText(check.status)}
                                </span>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    className={styles.viewBtn}
                                    onClick={() => onGoToList(check)}
                                >
                                    مشاهده
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ChequeDashboard() {
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [days, setDays] = useState(7);
    const [activeTab, setActiveTab] = useState("today");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(DASHBOARD_API, {
                params: { days },
            });

            setData(res.data);
        } catch (err) {
            console.error("Cheque dashboard error:", err);
            setError("خطا در دریافت داشبورد چک‌ها");
            toast.error("خطا در دریافت داشبورد چک‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [days]);

    const summary = data?.summary || {};
    const sections = data?.sections || {};

    const tabs = useMemo(
        () => [
            {
                key: "today",
                label: "سررسید امروز",
                count: sections.today?.count || 0,
                items: sections.today?.items || [],
                emptyText: "چک سررسید امروز ندارید",
            },
            {
                key: "overdue",
                label: "معوق",
                count: sections.overdue?.count || 0,
                items: sections.overdue?.items || [],
                emptyText: "چک معوق ندارید",
            },
            {
                key: "upcoming",
                label: `آینده ${days} روزه`,
                count: sections.upcoming?.count || 0,
                items: sections.upcoming?.items || [],
                emptyText: "در بازه آینده چکی ندارید",
            },
            {
                key: "received_open",
                label: "دریافتی باز",
                count: sections.received_open?.count || 0,
                items: sections.received_open?.items || [],
                emptyText: "چک دریافتی باز ندارید",
            },
            {
                key: "paid_open",
                label: "پرداختی باز",
                count: sections.paid_open?.count || 0,
                items: sections.paid_open?.items || [],
                emptyText: "چک پرداختی باز ندارید",
            },
        ],
        [sections, days]
    );

    const activeTabData = tabs.find((tab) => tab.key === activeTab) || tabs[0];

    const handleGoToList = (check) => {
        const type = check.cheque_type;

        if (type === "دریافتی" || type === "IN") {
            navigate("/banking/received-checks");
            return;
        }

        if (type === "پرداختی" || type === "OUT") {
            navigate("/banking/paid-checks");
            return;
        }

        navigate("/banking/received-checks");
    };

    if (loading) {
        return (
            <div className={styles.skeletonWrapper}>
                <div className={styles.skeletonHeader} />
                <div className={styles.skeletonCards}>
                    <span />
                    <span />
                    <span />
                    <span />
                </div>
                <div className={styles.skeletonTable}>
                    <span />
                    <span />
                    <span />
                    <span />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorBox}>
                <strong>خطا</strong>
                <p>{error}</p>
                <button type="button" onClick={fetchDashboard}>
                    تلاش دوباره
                </button>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.header}>
                <div>
                    <h3>داشبورد سررسید چک‌ها</h3>
                    <p>
                        امروز {formatDate(data?.today)} — بازه آینده تا{" "}
                        {formatDate(data?.future_date)}
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                    >
                        <option value={7}>۷ روز آینده</option>
                        <option value={14}>۱۴ روز آینده</option>
                        <option value={30}>۳۰ روز آینده</option>
                        <option value={60}>۶۰ روز آینده</option>
                        <option value={90}>۹۰ روز آینده</option>
                    </select>

                    <button type="button" onClick={fetchDashboard}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="کل چک‌های باز"
                    count={summary.open_count}
                    amount={summary.open_amount}
                    tone="blue"
                />

                <SummaryCard
                    title="سررسید امروز"
                    count={summary.today_count}
                    amount={summary.today_amount}
                    tone="green"
                />

                <SummaryCard
                    title="چک‌های معوق"
                    count={summary.overdue_count}
                    amount={summary.overdue_amount}
                    tone="red"
                />

                <SummaryCard
                    title={`آینده ${days} روزه`}
                    count={summary.upcoming_count}
                    amount={summary.upcoming_amount}
                    tone="yellow"
                />

                <SummaryCard
                    title="دریافتی باز"
                    count={summary.received_open_count}
                    amount={summary.received_open_amount}
                    tone="purple"
                />

                <SummaryCard
                    title="پرداختی باز"
                    count={summary.paid_open_count}
                    amount={summary.paid_open_amount}
                    tone="gray"
                />
            </div>

            <div className={styles.splitStats}>
                <div>
                    <span>دریافتی‌های امروز</span>
                    <strong>{formatMoney(summary.received_today_amount)}</strong>
                    <p>{Number(summary.received_today_count || 0).toLocaleString("fa-IR")} چک</p>
                </div>

                <div>
                    <span>پرداختی‌های امروز</span>
                    <strong>{formatMoney(summary.paid_today_amount)}</strong>
                    <p>{Number(summary.paid_today_count || 0).toLocaleString("fa-IR")} چک</p>
                </div>

                <div>
                    <span>دریافتی‌های معوق</span>
                    <strong>{formatMoney(summary.received_overdue_amount)}</strong>
                    <p>{Number(summary.received_overdue_count || 0).toLocaleString("fa-IR")} چک</p>
                </div>

                <div>
                    <span>پرداختی‌های معوق</span>
                    <strong>{formatMoney(summary.paid_overdue_amount)}</strong>
                    <p>{Number(summary.paid_overdue_count || 0).toLocaleString("fa-IR")} چک</p>
                </div>
            </div>

            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={activeTab === tab.key ? styles.activeTab : ""}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                        <span>{Number(tab.count || 0).toLocaleString("fa-IR")}</span>
                    </button>
                ))}
            </div>

            <ChequeTable
                items={activeTabData.items}
                emptyText={activeTabData.emptyText}
                onGoToList={handleGoToList}
            />
        </div>
    );
}

export default ChequeDashboard;