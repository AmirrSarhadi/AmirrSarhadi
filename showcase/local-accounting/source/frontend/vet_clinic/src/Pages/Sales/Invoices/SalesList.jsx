import { downloadAuthenticated } from "../../../utils/download";
import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import styles from "./SalesList.module.css";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaHourglassHalf,
    FaSearch,
    FaMoneyBillWave,
    FaEye,
    FaPlus,
    FaFileInvoiceDollar,
    FaUndoAlt,
    FaHandshake,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useModulePermission from "../../../hooks/useModulePermission";
import { PageHero, StatGrid, StatCard, FilterBar, PrimaryButton } from "../../../components/ERP";
import { FiShoppingCart, FiFileText, FiCheckCircle, FiClock, FiCreditCard } from "react-icons/fi";

const API = API_BASE_URL;

const STATUS_ORDER = ["پیش نویس", "تایید شده", "دریافت شده", "مرجوع شده"];

const RECEIVER_TYPES = [
    { value: "bank", label: "بانک" },
    { value: "cashbox", label: "صندوق" },
    { value: "imprest", label: "تنخواه‌گردان" },
];

function formatMoney(v) {
    const n = Number(v || 0);
    return n.toLocaleString("fa-IR");
}

function formatDate(s) {
    if (!s) return "-";
    try {
        return new Date(s).toLocaleDateString("fa-IR");
    } catch {
        return s;
    }
}

export default function SalesList() {
    const { canWrite, disabledReason } = useModulePermission("sales");
    const [rows, setRows] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [banks, setBanks] = useState([]);
    const [cashboxes, setCashboxes] = useState([]);
    const [imprests, setImprests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState("همه");

    const [sortKey, setSortKey] = useState("date");
    const [sortDir, setSortDir] = useState("desc");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const paymentRequestKey = useRef("");
    const [payInvoice, setPayInvoice] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        date: new Date().toISOString().split("T")[0],
        payment_amount: "",
        receiver_type: "bank",
        receiver_id: "",
        reference: "",
        description: "",
    });

    const [paymentsInvoice, setPaymentsInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [
                { data: invoices },
                { data: custs },
                bankRes,
                cashboxRes,
                imprestRes,
            ] = await Promise.all([
                getAllPages(`${API}/incomes/api/v2/sell_invoices/`),
                getAllPages(`${API}/incomes/api/v2/customers/`),
                getAllPages(`${API}/banking/api/v2/bank_list/`).catch(() => ({ data: [] })),
                getAllPages(`${API}/banking/api/v2/cashbox_list/`).catch(() => ({ data: [] })),
                getAllPages(`${API}/banking/api/v2/imprest_list/`).catch(() => ({ data: [] })),
            ]);

            setRows(extractList(invoices));
            setCustomers(extractList(custs));
            setBanks(extractList(bankRes.data));
            setCashboxes(extractList(cashboxRes.data));
            setImprests(extractList(imprestRes.data));
        } catch (error) {
            console.error("Fetch sales list error:", error);
            toast.error("خطا در دریافت لیست فاکتورهای فروش");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const customerNameById = useMemo(() => {
        const map = new Map();
        customers.forEach((c) =>
            map.set(c.id, `${c.first_name || ""} ${c.last_name || ""}`.trim())
        );
        return map;
    }, [customers]);

    const counters = useMemo(() => {
        const c = { همه: rows.length };
        STATUS_ORDER.forEach((s) => {
            c[s] = rows.filter((r) => r.invoice_type === s).length;
        });
        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        let data = [...rows];

        if (status !== "همه") {
            data = data.filter((r) => r.invoice_type === status);
        }

        if (q.trim()) {
            const qq = q.trim();
            data = data.filter((r) => {
                const customerLabel = customerNameById.get(r.customer_name) || "";
                return (
                    String(r.code || "").includes(qq) ||
                    String(r.reference || "").includes(qq) ||
                    (r.title || "").includes(qq) ||
                    customerLabel.includes(qq)
                );
            });
        }

        return data;
    }, [rows, status, q, customerNameById]);

    const sorted = useMemo(() => {
        const data = [...filtered];

        data.sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];

            if (["date", "expiry_date", "payment_date"].includes(sortKey)) {
                av = av ? new Date(av).getTime() : 0;
                bv = bv ? new Date(bv).getTime() : 0;
            }

            if (["total_amount", "paid_amount"].includes(sortKey)) {
                av = Number(av || 0);
                bv = Number(bv || 0);
            }

            if (sortKey === "invoice_type") {
                av = STATUS_ORDER.indexOf(a.invoice_type);
                bv = STATUS_ORDER.indexOf(b.invoice_type);
            }

            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    const pageData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, page, pageSize]);

    const setSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const getReceiverList = () => {
        if (paymentForm.receiver_type === "bank") return banks;
        if (paymentForm.receiver_type === "cashbox") return cashboxes;
        if (paymentForm.receiver_type === "imprest") return imprests;
        return [];
    };

    const getReceiverName = (type, id) => {
        const list =
            type === "bank" ? banks : type === "cashbox" ? cashboxes : type === "imprest" ? imprests : [];

        const item = list.find((x) => Number(x.id) === Number(id));
        return item?.name || item?.title || item?.account_number || `#${id}`;
    };

    const getRemaining = (invoice) =>
        Number(invoice?.total_amount || 0) - Number(invoice?.paid_amount || 0);

    const openPayModal = (invoice) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        const remaining = getRemaining(invoice);

        paymentRequestKey.current = crypto.randomUUID();
        setPayInvoice(invoice);
        setPaymentForm({
            date: new Date().toISOString().split("T")[0],
            payment_amount: remaining > 0 ? remaining : "",
            receiver_type: "bank",
            receiver_id: "",
            reference: "",
            description: `دریافت وجه فاکتور فروش ${invoice.code}`,
        });
    };

    const handleApprove = async (invoice) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (invoice.accounting_document) {
            toast.info("این فاکتور قبلاً سند حسابداری دارد.");
            return;
        }

        const ok = window.confirm(`فاکتور فروش شماره ${invoice.code} تایید شود؟`);
        if (!ok) return;

        try {
            setActionLoading(true);

            await axios.post(`${API}/incomes/api/${invoice.id}/v2/sell_invoices/approve/`);

            toast.success("فاکتور تایید شد و سند حسابداری ساخته شد.");
            fetchAll();
        } catch (error) {
            console.error("Approve invoice error:", error);
            const apiError = error?.response?.data;

            console.error("Approve invoice error:", apiError);

            toast.error(
                apiError?.error ||
                apiError?.detail ||
                (Array.isArray(apiError) ? apiError[0] : null) ||
                "تایید فاکتور انجام نشد."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleReverseInvoice = async (invoice) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!invoice.accounting_document || invoice.is_reversed) {
            toast.info(invoice.is_reversed ? "این فاکتور قبلاً ابطال شده است." : "فاکتور هنوز تایید نشده است.");
            return;
        }

        const ok = window.confirm(
            `آیا از ابطال کامل فاکتور فروش شماره ${invoice.code} مطمئن هستی؟ پرداخت‌ها و اثر انبار نیز معکوس می‌شوند.`
        );
        if (!ok) return;

        try {
            setActionLoading(true);
            await axios.post(`${API}/incomes/api/${invoice.id}/v2/sell_invoices/reverse/`);
            toast.success("فاکتور فروش با موفقیت ابطال شد.");
            await fetchAll();
        } catch (error) {
            console.error("Reverse sales invoice error:", error?.response?.data || error);
            toast.error(
                error?.response?.data?.error ||
                error?.response?.data?.detail ||
                "ابطال فاکتور فروش انجام نشد."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();

        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!payInvoice) return;

        const amount = Number(paymentForm.payment_amount || 0);
        const remaining = getRemaining(payInvoice);

        if (amount <= 0) {
            toast.warning("مبلغ دریافت نامعتبر است.");
            return;
        }

        if (amount > remaining) {
            toast.warning("مبلغ دریافت از مانده فاکتور بیشتر است.");
            return;
        }

        if (!paymentForm.receiver_id) {
            toast.warning("مقصد دریافت وجه را انتخاب کن.");
            return;
        }

        try {
            setActionLoading(true);

            await axios.post(`${API}/incomes/api/${payInvoice.id}/v2/sell_invoices/pay/`, {
                payment_amount: amount,
                receiver_type: paymentForm.receiver_type,
                receiver_id: Number(paymentForm.receiver_id),
                date: paymentForm.date,
                reference: paymentForm.reference,
                description: paymentForm.description,
            }, { headers: { "Idempotency-Key": paymentRequestKey.current } });

            toast.success("دریافت وجه ثبت شد و سند حسابداری ساخته شد.");
            setPayInvoice(null);
            fetchAll();
        } catch (error) {
            console.error("Payment error:", error);
            const apiError = error?.response?.data;

            console.error("Payment error:", apiError);

            toast.error(
                apiError?.error ||
                apiError?.detail ||
                (Array.isArray(apiError) ? apiError[0] : null) ||
                "ثبت دریافت وجه انجام نشد."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ثبت پرداخت → سند دریافت وجه ساخته می‌شود
    // ابطال پرداخت → سند معکوس ساخته می‌شود، موجودی بانک/صندوق کم می‌شود، paid_amount فاکتور کم می‌شود.
    const handleReversePayment = async (payment) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        const ok = window.confirm("آیا از ابطال این پرداخت مطمئن هستی؟");
        if (!ok) return;

        try {
            setActionLoading(true);

            await axios.post(
                `${API}/incomes/api/${payment.id}/v2/sell_invoices/payments/reverse/`
            );

            toast.success("پرداخت با موفقیت ابطال شد.");

            if (paymentsInvoice) {
                await openPaymentsModal(paymentsInvoice);
            }

            fetchAll();
        } catch (error) {
            console.error("Reverse payment error:", error);
            toast.error(error?.response?.data?.error || "ابطال پرداخت انجام نشد.");
        } finally {
            setActionLoading(false);
        }
    };
    const openPaymentsModal = async (invoice) => {
        setPaymentsInvoice(invoice);
        setPayments([]);
        setPaymentsLoading(true);

        try {
            const { data } = await getAllPages(
                `${API}/incomes/api/${invoice.id}/v2/sell_invoices/payments/`
            );

            setPayments(extractList(data));
        } catch (error) {
            console.error("Fetch payments error:", error);
            toast.error("خطا در دریافت پرداخت‌های فاکتور");
        } finally {
            setPaymentsLoading(false);
        }
    };

    const StatusBadge = ({ s }) => {
        if (s === "دریافت شده") {
            return (
                <span className={`${styles.badge} ${styles.badgeOk}`}>
                    <FaCheckCircle /> دریافت شده
                </span>
            );
        }

        if (s === "تایید شده") {
            return (
                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                    <FaHourglassHalf /> تایید شده
                </span>
            );
        }

        if (s === "مرجوع شده") {
            return (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                    <FaTimesCircle /> مرجوع شده
                </span>
            );
        }

        return <span className={styles.badge}>پیش نویس</span>;
    };

    return (
        <div className={styles.container}>
            <PageHero
                eyebrow="فروش / فاکتورها"
                title="فاکتورهای فروش"
                description="فاکتورها، وضعیت حسابداری، دریافت وجه و مانده مشتریان را از یک نمای متمرکز مدیریت کنید."
                icon={<FiShoppingCart />}
                actions={canWrite ? <Link to="/sales/new" style={{ textDecoration: "none" }}><PrimaryButton type="button"><FaPlus /> فاکتور فروش جدید</PrimaryButton></Link> : null}
            />

            <StatGrid>
                <StatCard label="کل فاکتورها" value={rows.length.toLocaleString("fa-IR")} icon={<FiFileText />} />
                <StatCard label="پیش‌نویس" value={(counters["پیش نویس"] || 0).toLocaleString("fa-IR")} icon={<FiClock />} tone="warning" />
                <StatCard label="تأیید شده" value={(counters["تایید شده"] || 0).toLocaleString("fa-IR")} icon={<FiCheckCircle />} tone="info" />
                <StatCard label="دریافت شده" value={(counters["دریافت شده"] || 0).toLocaleString("fa-IR")} icon={<FiCreditCard />} tone="success" />
            </StatGrid>

            <FilterBar search={q} onSearch={(value) => { setQ(value); setPage(1); }} searchPlaceholder="جستجو بر اساس شماره، ارجاع، عنوان یا مشتری..." resultText={`${filtered.length.toLocaleString("fa-IR")} فاکتور`} />

            <div className={styles.tabs}>
                {["همه", ...STATUS_ORDER].map((t) => (
                    <button
                        key={t}
                        className={`${styles.tab} ${status === t ? styles.active : ""}`}
                        onClick={() => {
                            setStatus(t);
                            setPage(1);
                        }}
                    >
                        {t}
                        <span className={styles.count}>{counters[t] || 0}</span>
                    </button>
                ))}
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <Th onClick={() => setSort("code")} active={sortKey === "code"} dir={sortDir}>
                                شماره
                            </Th>
                            <Th onClick={() => setSort("date")} active={sortKey === "date"} dir={sortDir}>
                                تاریخ
                            </Th>
                            <Th onClick={() => setSort("reference")} active={sortKey === "reference"} dir={sortDir}>
                                ارجاع
                            </Th>
                            <Th onClick={() => setSort("title")} active={sortKey === "title"} dir={sortDir}>
                                عنوان
                            </Th>
                            <Th>شخص</Th>
                            <Th onClick={() => setSort("total_amount")} active={sortKey === "total_amount"} dir={sortDir}>
                                مبلغ
                            </Th>
                            <Th onClick={() => setSort("paid_amount")} active={sortKey === "paid_amount"} dir={sortDir}>
                                دریافت شده
                            </Th>
                            <Th>باقیمانده</Th>
                            <Th onClick={() => setSort("invoice_type")} active={sortKey === "invoice_type"} dir={sortDir}>
                                وضعیت
                            </Th>
                            <Th>سند</Th>
                            <Th>عملیات</Th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={11} className={styles.center}>
                                    در حال بارگذاری...
                                </td>
                            </tr>
                        ) : pageData.length === 0 ? (
                            <tr>
                                <td colSpan={11} className={styles.center}>
                                    فاکتوری یافت نشد
                                </td>
                            </tr>
                        ) : (
                            pageData.map((r) => {
                                const remain = getRemaining(r);
                                const canPay = !r.is_reversed && r.invoice_type === "تایید شده" && remain > 0 && !r.has_active_installment_contract;

                                return (
                                    <tr key={r.id}>
                                        <td className={styles.code}>{r.code ?? "-"}</td>
                                        <td>{formatDate(r.date)}</td>
                                        <td>{r.reference || "-"}</td>
                                        <td className={styles.titleCell}>{r.title || "-"}</td>
                                        <td className={styles.person}>
                                            {customerNameById.get(r.customer_name) || "-"}
                                        </td>
                                        <td>{formatMoney(r.total_amount)} ریال</td>
                                        <td>{formatMoney(r.paid_amount)} ریال</td>
                                        <td className={remain > 0 ? styles.red : styles.green}>
                                            {formatMoney(remain)} ریال
                                        </td>
                                        <td>
                                            <StatusBadge s={r.invoice_type} />
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${r.accounting_document ? styles.badgeOk : ""}`}>
                                                {r.accounting_document ? "ثبت شده" : "ندارد"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button type="button" onClick={() => downloadAuthenticated(`${API}/incomes/api/${r.id}/v2/invoice-export/?export_format=pdf`, `invoice-${r.code}.pdf`).catch(e => toast.error(e.message))}>{r.invoice_type === "پیش نویس" ? "پیش‌فاکتور PDF" : "فاکتور PDF"}</button>
                                                <button type="button" onClick={() => downloadAuthenticated(`${API}/incomes/api/${r.id}/v2/invoice-export/?export_format=xlsx`, `invoice-${r.code}.xlsx`).catch(e => toast.error(e.message))}>Excel</button>
                                                <button
                                                    type="button"
                                                    className={styles.approveBtn}
                                                    disabled={actionLoading || !canWrite || r.accounting_document || r.invoice_type !== "پیش نویس"}
                                                    onClick={() => handleApprove(r)}
                                                    title={!canWrite ? disabledReason : "تایید و ثبت سند"}
                                                >
                                                    <FaFileInvoiceDollar />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.payBtn}
                                                    disabled={actionLoading || !canWrite || !canPay}
                                                    onClick={() => openPayModal(r)}
                                                    title={!canWrite ? disabledReason : r.has_active_installment_contract ? "دریافت این فاکتور از برنامه اقساط ثبت می‌شود" : "دریافت وجه"}
                                                >
                                                    <FaMoneyBillWave />
                                                </button>

                                                {r.installment_contract_id ? (
                                                    <Link
                                                        className={styles.viewBtn}
                                                        to={`/sales/installment/contracts/${r.installment_contract_id}`}
                                                        title="مشاهده قرارداد اقساطی"
                                                    >
                                                        <FaHandshake />
                                                    </Link>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    className={styles.viewBtn}
                                                    onClick={() => openPaymentsModal(r)}
                                                    title="مشاهده پرداخت‌ها"
                                                >
                                                    <FaEye />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.reversePayBtn}
                                                    disabled={actionLoading || !canWrite || !r.accounting_document || r.is_reversed}
                                                    onClick={() => handleReverseInvoice(r)}
                                                    title={!canWrite ? disabledReason : r.is_reversed ? "ابطال شده" : "ابطال کامل فاکتور"}
                                                >
                                                    <FaUndoAlt />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.pager}>
                <div className={styles.pageSize}>
                    نمایش:
                    {[5, 10, 15, 20, 50, 100].map((ps) => (
                        <button
                            key={ps}
                            className={`${styles.psBtn} ${pageSize === ps ? styles.activePs : ""}`}
                            onClick={() => {
                                setPageSize(ps);
                                setPage(1);
                            }}
                        >
                            {ps}
                        </button>
                    ))}
                </div>

                <div className={styles.pages}>
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        ‹
                    </button>
                    <span>
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        ›
                    </button>
                </div>
            </div>

            {payInvoice && (
                <div className={styles.modalOverlay}>
                    <form className={styles.paymentModal} onSubmit={handleSubmitPayment}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>ثبت دریافت وجه</h3>
                                <p>فاکتور شماره {payInvoice.code}</p>
                            </div>

                            <button type="button" onClick={() => setPayInvoice(null)}>
                                ×
                            </button>
                        </div>

                        <div className={styles.paymentSummary}>
                            <div>
                                <span>مبلغ فاکتور</span>
                                <strong>{formatMoney(payInvoice.total_amount)} ریال</strong>
                            </div>
                            <div>
                                <span>دریافت شده</span>
                                <strong>{formatMoney(payInvoice.paid_amount)} ریال</strong>
                            </div>
                            <div>
                                <span>مانده</span>
                                <strong>{formatMoney(getRemaining(payInvoice))} ریال</strong>
                            </div>
                        </div>

                        <div className={styles.formGrid}>
                            <label>
                                تاریخ
                                <input
                                    type="date"
                                    value={paymentForm.date}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({ ...p, date: e.target.value }))
                                    }
                                />
                            </label>

                            <label>
                                مبلغ دریافت
                                <input
                                    type="number"
                                    value={paymentForm.payment_amount}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({
                                            ...p,
                                            payment_amount: e.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                نوع مقصد
                                <select
                                    value={paymentForm.receiver_type}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({
                                            ...p,
                                            receiver_type: e.target.value,
                                            receiver_id: "",
                                        }))
                                    }
                                >
                                    {RECEIVER_TYPES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                مقصد دریافت
                                <select
                                    value={paymentForm.receiver_id}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({
                                            ...p,
                                            receiver_id: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">انتخاب کنید</option>
                                    {getReceiverList().map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name || item.title || item.account_number || `#${item.id}`}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                ارجاع
                                <input
                                    value={paymentForm.reference}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({ ...p, reference: e.target.value }))
                                    }
                                />
                            </label>

                            <label className={styles.fullField}>
                                توضیحات
                                <textarea
                                    value={paymentForm.description}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({
                                            ...p,
                                            description: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setPayInvoice(null)}
                            >
                                انصراف
                            </button>

                            <button
                                type="submit"
                                className={styles.confirmPayBtn}
                                disabled={actionLoading || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                ثبت دریافت وجه
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {paymentsInvoice && (
                <div className={styles.modalOverlay}>
                    <div className={styles.paymentsModal}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>پرداخت‌های فاکتور</h3>
                                <p>فاکتور شماره {paymentsInvoice.code}</p>
                            </div>

                            <button type="button" onClick={() => setPaymentsInvoice(null)}>
                                ×
                            </button>
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>تاریخ</th>
                                        <th>مبلغ</th>
                                        <th>نوع دریافت</th>
                                        <th>مقصد</th>
                                        <th>ارجاع</th>
                                        <th>سند</th>
                                        <th>شرح</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {paymentsLoading ? (
                                        <tr>
                                            <td colSpan="8" className={styles.center}>
                                                در حال بارگذاری...
                                            </td>
                                        </tr>
                                    ) : payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className={styles.center}>
                                                پرداختی ثبت نشده است.
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((p) => (
                                            <tr key={p.id}>
                                                <td>{formatDate(p.date)}</td>
                                                <td>{formatMoney(p.amount)} ریال</td>
                                                <td>{p.receiver_type_label || p.receiver_type}</td>
                                                <td>{p.receiver_name || getReceiverName(p.receiver_type, p.receiver_id)}</td>
                                                <td>{p.reference || "-"}</td>
                                                <td>{p.accounting_document ? "ثبت شده" : "ندارد"}</td>
                                                <td>{p.description || "-"}</td>
                                                <td>
                                                    {p.is_reversed ? (
                                                        <span className={`${styles.badge} ${styles.badgeDanger}`}>ابطال شده</span>
                                                    ) : p.installment_payment_id ? (
                                                        <Link
                                                            className={styles.viewBtn}
                                                            to={`/sales/installment/contracts/${p.installment_contract_id}`}
                                                            title="این وصول از قرارداد اقساطی مدیریت می‌شود"
                                                        >
                                                            قرارداد اقساطی
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={styles.reversePayBtn}
                                                            disabled={actionLoading || !canWrite}
                                                            title={!canWrite ? disabledReason : "ابطال پرداخت"}
                                                            onClick={() => handleReversePayment(p)}
                                                        >
                                                            ابطال
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Th({ children, onClick, active, dir }) {
    return (
        <th onClick={onClick}>
            <span style={{ cursor: onClick ? "pointer" : "default" }}>
                {children} {active ? (dir === "asc" ? "▲" : "▼") : ""}
            </span>
        </th>
    );
}
