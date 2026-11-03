import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    FaCheck,
    FaExchangeAlt,
    FaPlus,
    FaRedo,
    FaSearch,
    FaTimes,
    FaRegEnvelopeOpen ,
} from "react-icons/fa";

import styles from "./TreasuryVoucherList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const API_URL = `${API_BASE_URL}/banking/api/v2/treasury-vouchers/`;

export default function TreasuryVoucherList() {
    const { canWrite, disabledReason } = useModulePermission("banking");

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }
        return false;
    };

    const [loading, setLoading] = useState(true);

    const [items, setItems] = useState([]);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    useEffect(() => {
        fetchData();
    }, []);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            return {};
        }
    };

    const fetchData = async () => {

        try {

            setLoading(true);

            const response = await authFetch(API_URL);

            const data = await response.json();

            if (Array.isArray(data)) {
                setItems(data);
            } else if (Array.isArray(data.results)) {
                setItems(data.results);
            } else {
                setItems([]);
            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    const filteredItems = useMemo(() => {

        let data = [...items];

        if (statusFilter !== "ALL") {

            data = data.filter(
                (item) =>
                    item.status === statusFilter
            );

        }

        if (search.trim()) {

            const value = search
                .toLowerCase()
                .trim();

            data = data.filter((item) => {

                return (
                    String(item.voucher_number || "").includes(value) ||

                    String(item.reference || "")
                        .toLowerCase()
                        .includes(value) ||

                    String(item.description || "")
                        .toLowerCase()
                        .includes(value)
                );

            });

        }

        return data;

    }, [items, search, statusFilter]);

    const statusClass = (status) => {

        if (status === "APPROVED") {
            return styles.badgeOk;
        }

        if (status === "PENDING") {
            return styles.badgeInfo;
        }

        if (status === "REJECTED") {
            return styles.badgeDanger;
        }

        return styles.badgeDraft;
    };

    const submitVoucher = async (id) => {
        if (guardWrite()) return;


        try {

            await authFetch(
                `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/submit/`,
                {
                    method: "POST",
                }
            );

            fetchData();

        } catch (error) {

            console.error(error);

        }

    };

    const approveVoucher = async (id) => {
        if (guardWrite()) return;

        try {
            await authFetch(
                `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/approve/`,
                { method: "POST" }
            );

            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const reverseVoucher = async (id) => {
        if (guardWrite()) return;

        const confirmReverse = window.confirm("آیا از معکوس کردن سند مطمئن هستید؟");

        if (!confirmReverse) return;

        try {
            await authFetch(
                `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/reverse/`,
                { method: "POST" }
            );

            fetchData();
        } catch (error) {
            console.error(error);
        }
    };
    const rejectVoucher = async (id) => {
        if (guardWrite()) return;

        const reason = window.prompt("دلیل رد سند را وارد کنید:");

        if (reason === null) return;

        try {
            const res = await authFetch(
                `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/reject/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ reason }),
                }
            );

            const data = await safeJson(res);

            if (!res.ok) {
                alert(data?.error || "رد سند انجام نشد");
                return;
            }

            fetchData();
        } catch (error) {
            console.error(error);
            alert("خطا در رد سند");
        }
    };
    const handleReopen = async (id) => {
        if (guardWrite()) return;

        const ok = window.confirm("آیا از بازگشایی این سند خزانه اطمینان دارید؟");

        if (!ok) return;

        try {
            const res = await authFetch(
                `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/reopen/`,
                {
                    method: "POST",
                }
            );

            const data = await safeJson(res);

            if (!res.ok) {
                alert(data?.error || "بازگشایی سند انجام نشد");
                return;
            }

            alert("سند با موفقیت بازگشایی شد");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("خطا در بازگشایی سند");
        }
    };

    return (

        <div className={styles.container}>

            {/* header */}

            <div className={styles.header}>

                <div>

                    <h2>
                        اسناد خزانه
                    </h2>

                    <p>
                        مدیریت دریافت و پرداخت‌های
                        خزانه و اسناد حسابداری مرتبط
                    </p>

                </div>

                {canWrite ? (
                    <Link
                        to="/treasury/vouchers/new"
                        className={styles.addBtn}
                    >
                        <FaPlus />
                        <span>سند جدید</span>
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={styles.addBtn}
                        disabled
                        title={disabledReason}
                    >
                        <FaPlus />
                        <span>سند جدید</span>
                    </button>
                )}

            </div>

            {/* toolbar */}

            <div className={styles.toolbar}>

                <div className={styles.searchBox}>

                    <FaSearch />

                    <input
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                        placeholder="جستجو..."
                    />

                </div>

                <div className={styles.resultCount}>

                    {filteredItems.length}
                    {" "}
                    سند

                </div>

            </div>

            {/* tabs */}

            <div className={styles.tabs}>

                <button
                    className={`${styles.tab} ${statusFilter === "ALL"
                        ? styles.active
                        : ""
                        }`}
                    onClick={() =>
                        setStatusFilter("ALL")
                    }
                >
                    همه
                </button>

                <button
                    className={`${styles.tab} ${statusFilter === "DRAFT"
                        ? styles.active
                        : ""
                        }`}
                    onClick={() =>
                        setStatusFilter("DRAFT")
                    }
                >
                    پیش نویس
                </button>

                <button
                    className={`${styles.tab} ${statusFilter === "PENDING"
                        ? styles.active
                        : ""
                        }`}
                    onClick={() =>
                        setStatusFilter("PENDING")
                    }
                >
                    در انتظار تایید
                </button>

                <button
                    className={`${styles.tab} ${statusFilter === "APPROVED"
                        ? styles.active
                        : ""
                        }`}
                    onClick={() =>
                        setStatusFilter("APPROVED")
                    }
                >
                    تایید شده
                </button>

                <button
                    className={`${styles.tab} ${statusFilter === "REJECTED"
                        ? styles.active
                        : ""
                        }`}
                    onClick={() =>
                        setStatusFilter("REJECTED")
                    }
                >
                    رد شده
                </button>

            </div>

            {/* table */}

            <div className={styles.tableWrap}>

                <table className={styles.table}>

                    <thead>

                        <tr>

                            <th>
                                شماره
                            </th>

                            <th>
                                نوع
                            </th>

                            <th>
                                تاریخ
                            </th>

                            <th>
                                مبلغ
                            </th>

                            <th>
                                وضعیت
                            </th>

                            <th>
                                شرح
                            </th>

                            <th>
                                عملیات
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {!loading &&
                            filteredItems.length === 0 && (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className={styles.empty}
                                    >

                                        سندی یافت نشد

                                    </td>

                                </tr>

                            )}

                        {filteredItems.map((item) => (

                            <tr key={item.id}>

                                <td>
                                    {item.voucher_number}
                                </td>

                                <td>

                                    <span
                                        className={`${styles.badge} ${item.voucher_type ===
                                            "RECEIPT"
                                            ? styles.badgeOk
                                            : styles.badgeDanger
                                            }`}
                                    >

                                        {item.voucher_type ===
                                            "RECEIPT"
                                            ? "دریافت"
                                            : "پرداخت"}

                                    </span>

                                </td>

                                <td>
                                    {item.date}
                                </td>

                                <td>

                                    <span
                                        className={
                                            styles.amountBadge
                                        }
                                    >

                                        {Number(
                                            item.amount || 0
                                        ).toLocaleString(
                                            "fa-IR"
                                        )}

                                    </span>

                                </td>

                                <td>

                                    <span
                                        className={`${styles.badge} ${statusClass(
                                            item.status
                                        )}`}
                                    >

                                        {item.status_display ||
                                            item.status}

                                    </span>

                                </td>

                                <td>
                                    {item.description || "-"}
                                </td>

                                <td>

                                    <div
                                        className={
                                            styles.inlineActions
                                        }
                                    >

                                        <Link
                                            to={`/treasury/vouchers/${item.id}`}
                                            className={
                                                styles.linkBtn
                                            }
                                        >
                                            مشاهده
                                        </Link>

                                        {item.status ===
                                            "DRAFT" && (

                                                <button
                                                    className={`${styles.actionBtn} ${styles.submitBtn}`}
                                                    onClick={() =>
                                                        submitVoucher(
                                                            item.id
                                                        )
                                                    }
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >

                                                    <FaExchangeAlt />

                                                    ارسال

                                                </button>

                                            )}

                                        {item.status === "PENDING" && (
                                            <>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                                                    onClick={() => approveVoucher(item.id)}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    <FaCheck />
                                                    -
                                                    تایید
                                                </button>

                                                <button
                                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                    onClick={() => rejectVoucher(item.id)}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    <FaTimes />
                                                    -
                                                    رد
                                                </button>
                                            </>
                                        )}

                                        {item.status === "APPROVED" && !item.is_reversed && !item.is_reverse_entry && (
                                            <button
                                                className={`${styles.actionBtn} ${styles.reverseBtn}`}
                                                onClick={() => reverseVoucher(item.id)}
                                                disabled={!canWrite}
                                                title={!canWrite ? disabledReason : undefined}
                                            >
                                                <FaRedo />
                                                -
                                                برگشت
                                            </button>
                                        )}
                                        {item.is_reversed && (
                                            <span className={`${styles.badge} ${styles.badgeWarning}`}>
                                                برگشت خورده
                                            </span>
                                        )}
                                        {item.status === "REJECTED" && (
                                            <button
                                                className={`${styles.actionBtn} ${styles.reopenBtn}`}
                                                onClick={() => handleReopen(item.id)}
                                                disabled={!canWrite}
                                                title={!canWrite ? disabledReason : undefined}
                                            >
                                                <FaRegEnvelopeOpen />
                                                -
                                                بازگشایی
                                            </button>
                                        )}

                                    </div>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}