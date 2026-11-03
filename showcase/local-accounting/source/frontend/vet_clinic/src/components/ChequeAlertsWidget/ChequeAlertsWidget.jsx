import { API_BASE_URL } from "../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./ChequeAlertsWidget.module.css";

const API_BASE = API_BASE_URL;
const ALERTS_API = `${API_BASE}/banking/api/v2/cheques/alerts/`;

function formatMoney(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString("fa-IR")} ریال`;
}

function formatDate(value) {
    if (!value) return "—";

    try {
        return new Date(value).toLocaleDateString("fa-IR");
    } catch {
        return value;
    }
}

function getCheckNumber(check) {
    return (
        check?.cheque_number ||
        check?.number ||
        check?.sayad_number ||
        `#${check?.id}`
    );
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
    const value = check?.cheque_type;

    if (value === "دریافتی" || value === "IN") return "دریافتی";
    if (value === "پرداختی" || value === "OUT") return "پرداختی";

    return check?.cheque_type_label || value || "—";
}

function SummaryCard({ title, count, amount, tone, onClick }) {
    return (
        <button
            type="button"
            className={`${styles.summaryCard} ${styles[tone] || ""}`}
            onClick={onClick}
        >
            <span>{title}</span>
            <strong>{Number(count || 0).toLocaleString("fa-IR")}</strong>
            {amount !== undefined && <p>{formatMoney(amount)}</p>}
        </button>
    );
}

function MiniChequeList({ title, items, emptyText, onOpenList }) {
    return (
        <div className={styles.miniSection}>
            <div className={styles.miniHeader}>
                <h4>{title}</h4>

                <button type="button" onClick={onOpenList}>
                    مشاهده همه
                </button>
            </div>

            {!items || items.length === 0 ? (
                <div className={styles.emptyMini}>
                    {emptyText}
                </div>
            ) : (
                <div className={styles.miniList}>
                    {items.slice(0, 5).map((check) => (
                        <button
                            type="button"
                            key={`${title}-${check.id}`}
                            className={styles.miniItem}
                            onClick={onOpenList}
                        >
                            <div>
                                <strong>{getCheckNumber(check)}</strong>
                                <span>
                                    {getChequeTypeText(check)} — {check.status_label || getStatusText(check.status)}
                                </span>
                            </div>

                            <div>
                                <b>{formatMoney(check.amount)}</b>
                                <small>{formatDate(check.due_date || check.date)}</small>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function AccountingProblemList({ items, onOpenAudit }) {
    return (
        <div className={styles.miniSection}>
            <div className={styles.miniHeader}>
                <h4>مشکلات حسابداری چک‌ها</h4>

                <button type="button" onClick={onOpenAudit}>
                    کنترل اسناد
                </button>
            </div>

            {!items || items.length === 0 ? (
                <div className={styles.okMini}>
                    مشکل حسابداری برای چک‌ها پیدا نشد.
                </div>
            ) : (
                <div className={styles.problemList}>
                    {items.slice(0, 5).map((item) => (
                        <button
                            type="button"
                            key={`problem-${item.id}`}
                            className={styles.problemItem}
                            onClick={onOpenAudit}
                        >
                            <div>
                                <strong>چک {item.cheque_number}</strong>
                                <span>{item.reason}</span>
                            </div>

                            <small>{formatMoney(item.amount)}</small>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChequeAlertsWidget({
    days = 7,
    title = "هشدارهای چک",
    compact = false,
}) {
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [selectedDays, setSelectedDays] = useState(days);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(ALERTS_API, {
                params: { days: selectedDays },
            });

            setData(res.data);
        } catch (err) {
            console.error("Cheque alerts error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت هشدارهای چک"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [selectedDays]);

    const summary = data?.summary || {};
    const sections = data?.sections || {};
    const severity = data?.severity || "normal";

    const openDashboard = () => {
        navigate("/banking/cheque-dashboard");
    };

    const openReceived = () => {
        navigate("/banking/received-checks");
    };

    const openPaid = () => {
        navigate("/banking/paid-checks");
    };

    const openAudit = () => {
        navigate("/banking/cheque-accounting-audit");
    };

    const hasCritical = useMemo(() => {
        return (
            Number(summary.overdue_count || 0) > 0 ||
            Number(summary.accounting_problem_count || 0) > 0
        );
    }, [summary]);

    if (loading) {
        return (
            <div className={styles.widget}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonGrid}>
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
            <div className={styles.widget}>
                <div className={styles.errorBox}>
                    <strong>خطا</strong>
                    <p>{error}</p>
                    <button type="button" onClick={fetchAlerts}>
                        تلاش دوباره
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.widget} ${styles[severity] || ""}`}>
            <div className={styles.header}>
                <div>
                    <h3>{title}</h3>

                    <p>
                        امروز {formatDate(data?.today)} — بازه آینده تا{" "}
                        {formatDate(data?.future_date)}
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <select
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(Number(e.target.value))}
                    >
                        <option value={7}>۷ روز</option>
                        <option value={14}>۱۴ روز</option>
                        <option value={30}>۳۰ روز</option>
                        <option value={60}>۶۰ روز</option>
                    </select>

                    <button type="button" onClick={fetchAlerts}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            {hasCritical && (
                <div className={styles.criticalBanner}>
                    <strong>نیاز به پیگیری</strong>
                    <span>
                        {Number(summary.overdue_count || 0).toLocaleString("fa-IR")} چک معوق،{" "}
                        {Number(summary.accounting_problem_count || 0).toLocaleString("fa-IR")} چک مشکل‌دار حسابداری
                    </span>
                </div>
            )}

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="سررسید امروز"
                    count={summary.today_count}
                    amount={summary.today_amount}
                    tone="green"
                    onClick={openDashboard}
                />

                <SummaryCard
                    title="معوق"
                    count={summary.overdue_count}
                    amount={summary.overdue_amount}
                    tone="red"
                    onClick={openDashboard}
                />

                <SummaryCard
                    title={`آینده ${selectedDays} روزه`}
                    count={summary.upcoming_count}
                    amount={summary.upcoming_amount}
                    tone="yellow"
                    onClick={openDashboard}
                />

                <SummaryCard
                    title="مشکل حسابداری"
                    count={summary.accounting_problem_count}
                    tone="purple"
                    onClick={openAudit}
                />
            </div>

            {!compact && (
                <div className={styles.sectionsGrid}>
                    <MiniChequeList
                        title="چک‌های معوق"
                        items={sections.overdue}
                        emptyText="چک معوق ندارید."
                        onOpenList={openDashboard}
                    />

                    <MiniChequeList
                        title="سررسید امروز"
                        items={sections.today}
                        emptyText="چک سررسید امروز ندارید."
                        onOpenList={openDashboard}
                    />

                    <AccountingProblemList
                        items={sections.accounting_problems}
                        onOpenAudit={openAudit}
                    />
                </div>
            )}

            <div className={styles.footerActions}>
                <button type="button" onClick={openDashboard}>
                    داشبورد چک‌ها
                </button>

                <button type="button" onClick={openReceived}>
                    چک‌های دریافتی
                </button>

                <button type="button" onClick={openPaid}>
                    چک‌های پرداختی
                </button>

                <button type="button" onClick={openAudit}>
                    کنترل اسناد
                </button>
            </div>
        </div>
    );
}

export default ChequeAlertsWidget;