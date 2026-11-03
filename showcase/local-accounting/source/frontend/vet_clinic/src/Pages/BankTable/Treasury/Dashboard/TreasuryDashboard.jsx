import { API_BASE_URL } from "../../../../api/http";
// src/pages/BankTable/Treasury/Dashboard/TreasuryDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
    FaUniversity,
    FaWallet,
    FaMoneyBillWave,
    FaArrowDown,
    FaArrowUp,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
} from "react-icons/fa";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

import styles from "./TreasuryDashboard.module.css";

const API =
    `${API_BASE_URL}/banking/api/v2/dashboard/`;

export default function TreasuryDashboard() {

    const [loading, setLoading] = useState(true);

    const [data, setData] = useState({
        summary: {},
        recent_vouchers: [],
    });

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {

        try {

            setLoading(true);

            const res = await axios.get(API);

            setData(res.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);
        }
    };

    const summary = useMemo(() => {
        return data.summary || {};
    }, [data]);

    const treasuryData = [
        {
            name: "بانک",
            value: Number(summary.total_bank_balance || 0),
        },
        {
            name: "صندوق",
            value: Number(summary.total_cashbox_balance || 0),
        },
        {
            name: "تنخواه",
            value: Number(summary.total_imprest_balance || 0),
        },
    ];

    const flowData = [
        {
            name: "دریافت",
            value: Number(summary.receipt_total || 0),
        },
        {
            name: "پرداخت",
            value: Number(summary.payment_total || 0),
        },
    ];

    const formatMoney = (value) => {

        return Number(value || 0)
            .toLocaleString("fa-IR");
    };

    if (loading) {

        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    در حال دریافت اطلاعات خزانه...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* header */}

            <div className={styles.header}>

                <div>
                    <h2>داشبورد خزانه داری</h2>

                    <p>
                        وضعیت کلی خزانه، گردش نقدی و آخرین عملیات‌ها
                    </p>
                </div>

                <button
                    className={styles.refreshBtn}
                    onClick={fetchDashboard}
                >
                    بروزرسانی
                </button>

            </div>

            {/* summary cards */}

            <div className={styles.cardsGrid}>

                <div className={styles.card}>
                    <div className={styles.cardIcon}>
                        <FaUniversity />
                    </div>

                    <div>
                        <span>موجودی بانک‌ها</span>

                        <strong>
                            {formatMoney(summary.total_bank_balance)}
                        </strong>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardIcon}>
                        <FaWallet />
                    </div>

                    <div>
                        <span>موجودی صندوق‌ها</span>

                        <strong>
                            {formatMoney(summary.total_cashbox_balance)}
                        </strong>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardIcon}>
                        <FaMoneyBillWave />
                    </div>

                    <div>
                        <span>تنخواه‌ها</span>

                        <strong>
                            {formatMoney(summary.total_imprest_balance)}
                        </strong>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.mainCard}`}>
                    <div className={styles.cardIcon}>
                        <FaMoneyBillWave />
                    </div>

                    <div>
                        <span>کل خزانه</span>

                        <strong>
                            {formatMoney(summary.total_treasury)}
                        </strong>
                    </div>
                </div>

            </div>

            {/* flow section */}

            <div className={styles.flowGrid}>

                <div className={`${styles.flowCard} ${styles.income}`}>

                    <div className={styles.flowHeader}>
                        <FaArrowDown />
                        <span>دریافت‌ها</span>
                    </div>

                    <strong>
                        {formatMoney(summary.receipt_total)}
                    </strong>

                </div>

                <div className={`${styles.flowCard} ${styles.expense}`}>

                    <div className={styles.flowHeader}>
                        <FaArrowUp />
                        <span>پرداخت‌ها</span>
                    </div>

                    <strong>
                        {formatMoney(summary.payment_total)}
                    </strong>

                </div>

                <div className={`${styles.flowCard} ${styles.balance}`}>

                    <div className={styles.flowHeader}>
                        <FaMoneyBillWave />
                        <span>خالص جریان نقدی</span>
                    </div>

                    <strong>
                        {formatMoney(summary.net_cashflow)}
                    </strong>

                </div>

            </div>

            {/* workflow */}

            <div className={styles.workflowGrid}>

                <div className={styles.workflowCard}>
                    <FaClock />

                    <div>
                        <span>در انتظار تایید</span>

                        <strong>
                            {summary.pending_count || 0}
                        </strong>
                    </div>
                </div>

                <div className={styles.workflowCard}>
                    <FaCheckCircle />

                    <div>
                        <span>تایید شده</span>

                        <strong>
                            {summary.approved_count || 0}
                        </strong>
                    </div>
                </div>

                <div className={styles.workflowCard}>
                    <FaTimesCircle />

                    <div>
                        <span>رد شده</span>

                        <strong>
                            {summary.rejected_count || 0}
                        </strong>
                    </div>
                </div>

            </div>

            {/* charts */}

            <div className={styles.chartsGrid}>

                {/* pie chart */}

                <div className={styles.chartCard}>

                    <div className={styles.chartHeader}>
                        <h3>ترکیب خزانه</h3>

                        <p>
                            نسبت موجودی بانک، صندوق و تنخواه
                        </p>
                    </div>

                    <div className={styles.chartWrapper}>

                        <ResponsiveContainer width="100%" height={320}>

                            <PieChart>

                                <Pie
                                    data={treasuryData}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={110}
                                >

                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#10b981" />
                                    <Cell fill="#f59e0b" />

                                </Pie>

                                <Tooltip />

                            </PieChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                {/* bar chart */}

                <div className={styles.chartCard}>

                    <div className={styles.chartHeader}>
                        <h3>گردش نقدی</h3>

                        <p>
                            مقایسه دریافت و پرداخت
                        </p>
                    </div>

                    <div className={styles.chartWrapper}>

                        <ResponsiveContainer width="100%" height={320}>

                            <BarChart data={flowData}>

                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis dataKey="name" />

                                <YAxis />

                                <Tooltip />

                                <Bar
                                    dataKey="value"
                                    fill="#4f46e5"
                                    radius={[12, 12, 0, 0]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>

            {/* recent vouchers */}

            <div className={styles.tableCard}>

                <div className={styles.tableHeader}>
                    <div>
                        <h3>آخرین اسناد خزانه</h3>

                        <p>
                            جدیدترین عملیات دریافت و پرداخت
                        </p>
                    </div>
                </div>

                <div className={styles.tableWrapper}>

                    <table className={styles.table}>

                        <thead>

                            <tr>
                                <th>شماره</th>
                                <th>نوع</th>
                                <th>تاریخ</th>
                                <th>طرف حساب</th>
                                <th>مبلغ</th>
                                <th>وضعیت</th>
                                <th>برگشت</th>
                            </tr>

                        </thead>

                        <tbody>

                            {data.recent_vouchers.map((item) => (

                                <tr key={item.id}>

                                    <td>
                                        {item.voucher_number}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                item.voucher_type === "RECEIPT"
                                                    ? styles.receiptBadge
                                                    : styles.paymentBadge
                                            }
                                        >
                                            {
                                                item.voucher_type === "RECEIPT"
                                                    ? "دریافت"
                                                    : "پرداخت"
                                            }
                                        </span>

                                    </td>

                                    <td>
                                        {item.date}
                                    </td>

                                    <td>
                                        {item.detail_account}
                                    </td>

                                    <td>
                                        {
                                            formatMoney(item.amount)
                                        }
                                    </td>

                                    <td>

                                        <span className={styles.statusBadge}>
                                            {item.status}
                                        </span>

                                    </td>

                                    <td>

                                        {
                                            item.is_reversed
                                                ? (
                                                    <span className={styles.reversed}>
                                                        برگشت شده
                                                    </span>
                                                )
                                                : (
                                                    <span className={styles.normal}>
                                                        فعال
                                                    </span>
                                                )
                                        }

                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}