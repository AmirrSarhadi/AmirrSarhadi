import ReportDownloads from "../../../components/ReportDownloads/ReportDownloads";
import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "../../Sales/Invoices/SalesList.module.css";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaHourglassHalf,
    FaSearch,
    FaMoneyBillWave,
    FaEye,
    FaPlus,
    FaFileInvoiceDollar,
    FaUndo,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useModulePermission from "../../../hooks/useModulePermission";
import { PageHero, StatGrid, StatCard, FilterBar, PrimaryButton } from "../../../components/ERP";
import { FiShoppingBag, FiFileText, FiCheckCircle, FiClock, FiCreditCard } from "react-icons/fi";

const API = API_BASE_URL;

const STATUS_ORDER = ["DRAFT", "PENDING", "APPROVED", "PAID", "REVERSED"];
const STATUS_LABELS = {
    DRAFT: "پیش نویس",
    PENDING: "در انتظار تایید",
    APPROVED: "تایید شده",
    PAID: "پرداخت شده",
    REVERSED: "مرجوع شده",
};
const LEGACY_STATUS_MAP = {
    "پیش نویس": "DRAFT",
    "پیش‌نویس": "DRAFT",
    "در انتظار تایید": "PENDING",
    "تایید شده": "APPROVED",
    "تأیید شده": "APPROVED",
    "پرداخت شده": "PAID",
    "مرجوع شده": "REVERSED",
};

function normalizePurchaseStatus(value) {
    return LEGACY_STATUS_MAP[value] || value || "DRAFT";
}

const PAYER_TYPES = [
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

function getApiError(error, fallback) {
    const apiError = error?.response?.data;

    return (
        apiError?.error ||
        apiError?.detail ||
        (Array.isArray(apiError) ? apiError[0] : null) ||
        fallback
    );
}

export default function PurchaseInvoiceList({
    title,
    description,
    apiPath,
    createPath,
    returned = false,
}) {
    const { canWrite, disabledReason } = useModulePermission("purchases");

    const [rows, setRows] = useState([]);
    const [vendors, setVendors] = useState([]);
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

    const [payInvoice, setPayInvoice] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        date: new Date().toISOString().split("T")[0],
        payment_amount: "",
        payer_type: "bank",
        payer_id: "",
        reference: "",
        description: "",
    });

    const [paymentsInvoice, setPaymentsInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    const fetchAll = async () => {
        setLoading(true);

        try {
            const [invoiceRes, vendorRes, bankRes, cashboxRes, imprestRes] = await Promise.all([
                getAllPages(`${API}${apiPath}`),
                getAllPages(`${API}/costs/api/v2/vendors/`),
                getAllPages(`${API}/banking/api/v2/bank_list/`).catch(() => ({ data: [] })),
                getAllPages(`${API}/banking/api/v2/cashbox_list/`).catch(() => ({ data: [] })),
                getAllPages(`${API}/banking/api/v2/imprest_list/`).catch(() => ({ data: [] })),
            ]);

            setRows(extractList(invoiceRes.data));
            setVendors(extractList(vendorRes.data));
            setBanks(extractList(bankRes.data));
            setCashboxes(extractList(cashboxRes.data));
            setImprests(extractList(imprestRes.data));
        } catch (error) {
            console.error("Fetch purchase invoices error:", error);
            toast.error("خطا در دریافت لیست فاکتورهای خرید");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [apiPath]);

    const vendorNameById = useMemo(() => {
        const map = new Map();

        vendors.forEach((v) => {
            map.set(
                v.id,
                v.company ||
                `${v.first_name || ""} ${v.last_name || ""}`.trim() ||
                `#${v.id}`
            );
        });

        return map;
    }, [vendors]);

    const counters = useMemo(() => {
        const c = { همه: rows.length };

        STATUS_ORDER.forEach((s) => {
            c[s] = rows.filter((r) => normalizePurchaseStatus(r.invoice_type) === s).length;
        });

        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        let data = [...rows];

        if (status !== "همه") {
            data = data.filter((r) => normalizePurchaseStatus(r.invoice_type) === status);
        }

        if (q.trim()) {
            const qq = q.trim();

            data = data.filter((r) => {
                const vendorLabel = vendorNameById.get(r.vendor) || "";

                return (
                    String(r.code || "").includes(qq) ||
                    String(r.reference || "").includes(qq) ||
                    (r.title || "").includes(qq) ||
                    vendorLabel.includes(qq)
                );
            });
        }

        return data;
    }, [rows, status, q, vendorNameById]);

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
                av = STATUS_ORDER.indexOf(normalizePurchaseStatus(a.invoice_type));
                bv = STATUS_ORDER.indexOf(normalizePurchaseStatus(b.invoice_type));
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

    const getPayerList = () => {
        if (paymentForm.payer_type === "bank") return banks;
        if (paymentForm.payer_type === "cashbox") return cashboxes;
        if (paymentForm.payer_type === "imprest") return imprests;
        return [];
    };

    const getPayerName = (type, id) => {
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

        setPayInvoice(invoice);
        setPaymentForm({
            date: new Date().toISOString().split("T")[0],
            payment_amount: remaining > 0 ? remaining : "",
            payer_type: "bank",
            payer_id: "",
            reference: "",
            description: `پرداخت فاکتور خرید ${invoice.code}`,
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

        const ok = window.confirm(`فاکتور خرید شماره ${invoice.code} تایید شود؟`);
        if (!ok) return;

        try {
            setActionLoading(true);

            await axios.post(`${API}/costs/api/${invoice.id}/v2/buy_invoices/approve/`);

            toast.success("فاکتور خرید تایید شد و سند حسابداری ساخته شد.");
            fetchAll();
        } catch (error) {
            console.error("Approve purchase invoice error:", error?.response?.data || error);
            toast.error(getApiError(error, "تایید فاکتور خرید انجام نشد."));
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
            toast.warning("مبلغ پرداخت نامعتبر است.");
            return;
        }

        if (amount > remaining) {
            toast.warning("مبلغ پرداخت از مانده فاکتور بیشتر است.");
            return;
        }

        if (!paymentForm.payer_id) {
            toast.warning("پرداخت‌کننده را انتخاب کن.");
            return;
        }

        try {
            setActionLoading(true);

            await axios.post(`${API}/costs/api/${payInvoice.id}/v2/buy_invoices/pay/`, {
                payment_amount: amount,
                payer_type: paymentForm.payer_type,
                payer_id: Number(paymentForm.payer_id),
                date: paymentForm.date,
                reference: paymentForm.reference,
                description: paymentForm.description,
            });

            toast.success("پرداخت فاکتور خرید ثبت شد و سند حسابداری ساخته شد.");
            setPayInvoice(null);
            fetchAll();
        } catch (error) {
            console.error("Purchase payment error:", error?.response?.data || error);
            toast.error(getApiError(error, "ثبت پرداخت فاکتور خرید انجام نشد."));
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
                `${API}/costs/api/${invoice.id}/v2/buy_invoices/payments/`
            );

            setPayments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch purchase payments error:", error?.response?.data || error);
            toast.error("خطا در دریافت پرداخت‌های فاکتور خرید");
        } finally {
            setPaymentsLoading(false);
        }
    };

    const handleReversePayment = async (payment) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        const ok = window.confirm("آیا از ابطال این پرداخت مطمئن هستی؟");
        if (!ok) return;

        try {
            setActionLoading(true);

            await axios.post(`${API}/costs/api/v2/buy_invoices/payments/${payment.id}/reverse/`);

            toast.success("پرداخت با موفقیت ابطال شد.");

            if (paymentsInvoice) {
                await openPaymentsModal(paymentsInvoice);
            }

            fetchAll();
        } catch (error) {
            console.error("Reverse purchase payment error:", error?.response?.data || error);
            toast.error(getApiError(error, "ابطال پرداخت انجام نشد."));
        } finally {
            setActionLoading(false);
        }
    };

    const handleReverseInvoice = async (invoice) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        const ok = window.confirm(
            `آیا از ابطال کامل فاکتور خرید شماره ${invoice.code} مطمئن هستی؟`
        );
        if (!ok) return;

        try {
            setActionLoading(true);

            await axios.post(`${API}/costs/api/${invoice.id}/v2/buy_invoices/reverse/`);

            toast.success("فاکتور خرید با موفقیت ابطال شد.");
            fetchAll();
        } catch (error) {
            console.error("Reverse purchase invoice error:", error?.response?.data || error);
            toast.error(getApiError(error, "ابطال فاکتور خرید انجام نشد."));
        } finally {
            setActionLoading(false);
        }
    };

    const StatusBadge = ({ s }) => {
        const normalized = normalizePurchaseStatus(s);

        if (normalized === "PAID") {
            return (
                <span className={`${styles.badge} ${styles.badgeOk}`}>
                    <FaCheckCircle /> پرداخت شده
                </span>
            );
        }

        if (normalized === "APPROVED" || normalized === "PENDING") {
            return (
                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                    <FaHourglassHalf /> {STATUS_LABELS[normalized]}
                </span>
            );
        }

        if (normalized === "REVERSED") {
            return (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                    <FaTimesCircle /> مرجوع شده
                </span>
            );
        }

        return <span className={styles.badge}>{STATUS_LABELS[normalized] || s || "-"}</span>;
    };

    return (
        <div className={styles.container}>
            <PageHero
                eyebrow={returned ? "خرید / برگشت‌ها" : "خرید / فاکتورها"}
                title={title}
                description={description}
                icon={<FiShoppingBag />}
                actions={canWrite && createPath ? <Link to={createPath} style={{ textDecoration: "none" }}><PrimaryButton type="button"><FaPlus /> ثبت سند جدید</PrimaryButton></Link> : null}
            />

            <StatGrid>
                <StatCard label="کل اسناد" value={rows.length.toLocaleString("fa-IR")} icon={<FiFileText />} />
                <StatCard label="پیش‌نویس" value={(counters.DRAFT || 0).toLocaleString("fa-IR")} icon={<FiClock />} tone="warning" />
                <StatCard label="تأیید شده" value={(counters.APPROVED || 0).toLocaleString("fa-IR")} icon={<FiCheckCircle />} tone="info" />
                <StatCard label="پرداخت شده" value={(counters.PAID || 0).toLocaleString("fa-IR")} icon={<FiCreditCard />} tone="success" />
            </StatGrid>

            <FilterBar search={q} onSearch={(value) => { setQ(value); setPage(1); }} searchPlaceholder="جستجو بر اساس شماره، ارجاع، عنوان یا تأمین‌کننده..." resultText={`${filtered.length.toLocaleString("fa-IR")} سند`} />

            <div className={styles.tabs}>
                {["همه", ...STATUS_ORDER].map((t) => (
                    <button
                        key={t}
                        type="button"
                        className={`${styles.tab} ${status === t ? styles.active : ""}`}
                        onClick={() => {
                            setStatus(t);
                            setPage(1);
                        }}
                    >
                        {t === "همه" ? "همه" : STATUS_LABELS[t]}
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
                            <Th>تأمین‌کننده</Th>
                            <Th onClick={() => setSort("total_amount")} active={sortKey === "total_amount"} dir={sortDir}>
                                مبلغ
                            </Th>
                            <Th onClick={() => setSort("paid_amount")} active={sortKey === "paid_amount"} dir={sortDir}>
                                پرداخت شده
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
                                const invoiceStatus = normalizePurchaseStatus(r.invoice_type);
                                const canPay = invoiceStatus === "APPROVED" && remain > 0;
                                const canReverse =
                                    !returned &&
                                    invoiceStatus !== "DRAFT" &&
                                    invoiceStatus !== "REVERSED" &&
                                    r.accounting_document;

                                return (
                                    <tr key={r.id}>
                                        <td className={styles.code}>{r.code ?? "-"}</td>
                                        <td>{formatDate(r.date)}</td>
                                        <td>{r.reference || "-"}</td>
                                        <td className={styles.titleCell}>{r.title || "-"}</td>
                                        <td className={styles.person}>{vendorNameById.get(r.vendor) || "-"}</td>
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
                                            <div className={styles.rowActions}><ReportDownloads url={`${API_BASE_URL}/costs/api/${r.id}/v2/invoice-export/`} filename={`purchase-${r.code}`} />
                                                <button
                                                    type="button"
                                                    className={styles.approveBtn}
                                                    disabled={
                                                        actionLoading ||
                                                        !canWrite ||
                                                        returned ||
                                                        r.accounting_document ||
                                                        invoiceStatus !== "DRAFT"
                                                    }
                                                    onClick={() => handleApprove(r)}
                                                    title={!canWrite ? disabledReason : "تایید و ثبت سند"}
                                                >
                                                    <FaFileInvoiceDollar />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.payBtn}
                                                    disabled={actionLoading || !canWrite || returned || !canPay}
                                                    onClick={() => openPayModal(r)}
                                                    title={!canWrite ? disabledReason : "پرداخت"}
                                                >
                                                    <FaMoneyBillWave />
                                                </button>

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
                                                    disabled={actionLoading || !canWrite || !canReverse}
                                                    onClick={() => handleReverseInvoice(r)}
                                                    title={!canWrite ? disabledReason : "ابطال فاکتور"}
                                                >
                                                    <FaUndo />
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
                            type="button"
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
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        ‹
                    </button>
                    <span>
                        {page} / {totalPages}
                    </span>
                    <button
                        type="button"
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
                                <h3>ثبت پرداخت فاکتور خرید</h3>
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
                                <span>پرداخت شده</span>
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
                                    onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))}
                                />
                            </label>

                            <label>
                                مبلغ پرداخت
                                <input
                                    type="number"
                                    value={paymentForm.payment_amount}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({ ...p, payment_amount: e.target.value }))
                                    }
                                />
                            </label>

                            <label>
                                نوع پرداخت‌کننده
                                <select
                                    value={paymentForm.payer_type}
                                    onChange={(e) =>
                                        setPaymentForm((p) => ({
                                            ...p,
                                            payer_type: e.target.value,
                                            payer_id: "",
                                        }))
                                    }
                                >
                                    {PAYER_TYPES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                پرداخت از
                                <select
                                    value={paymentForm.payer_id}
                                    onChange={(e) => setPaymentForm((p) => ({ ...p, payer_id: e.target.value }))}
                                >
                                    <option value="">انتخاب کنید</option>
                                    {getPayerList().map((item) => (
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
                                    onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                                />
                            </label>

                            <label className={styles.fullField}>
                                توضیحات
                                <textarea
                                    value={paymentForm.description}
                                    onChange={(e) => setPaymentForm((p) => ({ ...p, description: e.target.value }))}
                                />
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setPayInvoice(null)}>
                                انصراف
                            </button>

                            <button
                                type="submit"
                                className={styles.confirmPayBtn}
                                disabled={actionLoading || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                ثبت پرداخت
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
                                <h3>پرداخت‌های فاکتور خرید</h3>
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
                                        <th>نوع پرداخت</th>
                                        <th>پرداخت از</th>
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
                                                <td>{p.payer_type_label || p.payer_type}</td>
                                                <td>{p.payer_name || getPayerName(p.payer_type, p.payer_id)}</td>
                                                <td>{p.reference || "-"}</td>
                                                <td>{p.accounting_document ? "ثبت شده" : "ندارد"}</td>
                                                <td>{p.description || "-"}</td>
                                                <td>
                                                    {p.is_reversed ? (
                                                        <span className={`${styles.badge} ${styles.badgeDanger}`}>
                                                            ابطال شده
                                                        </span>
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
