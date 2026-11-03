import { authFetch } from "../../../api/http";
import { extractList, API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaEye, FaPlus, FaSearch, FaTimes, FaTrashAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./Expense.module.css";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../../components/ERP/ERP";
import { FiTrendingUp, FiTrendingDown, FiSearch, FiDollarSign } from "react-icons/fi";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;

const DESTINATION_LABELS = {
    bank: "بانک",
    cashbox: "صندوق",
    imprest: "تنخواه‌گردان",
    cheque: "چک",
};

export default function ExpenseList() {
    const { canWrite, disabledReason } = useModulePermission("purchases");

    const [expenses, setExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const navigate = useNavigate();

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/costs/api/v2/expense_list/`);
            const data = await res.json();
            setExpenses(extractList(data));
        } catch (error) {
            console.error("Fetch expenses error:", error);
            toast.error("خطا در دریافت لیست هزینه‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleDelete = async (expense) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        const message = expense.accounting_document
            ? "این هزینه سند حسابداری دارد. با حذف آن، سند معکوس و هزینه ابطال می‌شود. ادامه می‌دهی؟"
            : "آیا از حذف این هزینه مطمئن هستی؟";

        const ok = window.confirm(message);
        if (!ok) return;

        try {
            const res = await authFetch(`${API_BASE}/costs/api/${expense.id}/v2/expense_list/`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json().catch(() => null);
                console.error("Delete expense error:", error);
                toast.error(Array.isArray(error) ? error[0] : "حذف/ابطال هزینه انجام نشد.");
                return;
            }

            toast.success(expense.accounting_document ? "هزینه ابطال شد." : "هزینه حذف شد.");
            fetchExpenses();
        } catch (error) {
            console.error("Delete expense connection error:", error);
            toast.error("خطا در ارتباط با سرور.");
        }
    };

    const filteredExpenses = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return expenses;

        return expenses.filter((expense) =>
            [
                expense.expense_number,
                expense.date,
                expense.currency,
                expense.amount,
                expense.description,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [expenses, searchTerm]);

    return (
        <div className={styles.page}>
        <PageHero eyebrow="جریان نقد و عملیات مالی" title="هزینه‌ها" description="ثبت و کنترل هزینه‌ها، پرداخت‌ها و اسناد مرتبط" icon={<FiTrendingDown />} actions={<PrimaryButton type="button" onClick={() => navigate("/purchases/expense/new")}><FaPlus /> ثبت هزینه</PrimaryButton>} />
        <StatGrid>
            <StatCard label="تعداد ثبت‌ها" value={expenses.length.toLocaleString("fa-IR")} icon={<FiTrendingDown />} tone="danger" />
            <StatCard label="مبلغ کل" value={`${expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString("fa-IR")} ریال`} icon={<FiDollarSign />} tone="danger" />
            <StatCard label="نتیجه جستجو" value={filteredExpenses.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
        </StatGrid>
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>لیست هزینه‌ها</h3>
                    <p>مدیریت هزینه‌های ثبت‌شده در سیستم</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => navigate("/purchases/expense/new")}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    <FaPlus />
                    افزودن هزینه
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="جستجو بر اساس شماره، تاریخ، مبلغ یا شرح..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.resultCount}>
                    {filteredExpenses.length.toLocaleString("fa-IR")} هزینه
                </div>
            </div>

            {loading ? (
                <div className={styles.emptyState}>در حال بارگذاری...</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره</th>
                                <th>تاریخ</th>
                                <th>واحد پول</th>
                                <th>مبلغ کل</th>
                                <th>تعداد آیتم</th>
                                <th>وضعیت</th>
                                <th>شرح</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className={styles.emptyState}>
                                            <strong>هزینه‌ای پیدا نشد</strong>
                                            <p>هزینه جدید ثبت کن یا عبارت جستجو را تغییر بده.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense, index) => {
                                    const isLocked = expense.is_locked || expense.accounting_document;

                                    return (
                                        <tr key={expense.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{expense.expense_number || "-"}</td>
                                            <td>{expense.date || "-"}</td>
                                            <td>{expense.currency || "-"}</td>
                                            <td>
                                                <span className={styles.amountBadge}>
                                                    {Number(expense.amount || 0).toLocaleString("fa-IR")}
                                                </span>
                                            </td>
                                            <td>{expense.items?.length || 0}</td>
                                            <td>
                                                <span className={isLocked ? styles.lockedBadge : styles.openBadge}>
                                                    {isLocked ? "دارای سند" : "قابل ویرایش"}
                                                </span>
                                            </td>
                                            <td>{expense.description || "-"}</td>
                                            <td>
                                                <div className={styles.actionBtns}>
                                                    <button
                                                        type="button"
                                                        className={styles.viewBtn}
                                                        onClick={() => setSelectedExpense(expense)}
                                                        title="جزئیات"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.editBtn}
                                                        onClick={() => navigate(`/purchases/expense/edit/${expense.id}`)}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "ویرایش"}
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleDelete(expense)}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "حذف / ابطال"}
                                                    >
                                                        <FaTrashAlt />
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
            )}

            {selectedExpense && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>جزئیات هزینه #{selectedExpense.expense_number || selectedExpense.id}</h3>
                                <p>{selectedExpense.description || "بدون شرح"}</p>
                            </div>

                            <button
                                type="button"
                                className={styles.closeBtn}
                                onClick={() => setSelectedExpense(null)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.detailGrid}>
                            <div>
                                <span>تاریخ</span>
                                <strong>{selectedExpense.date || "-"}</strong>
                            </div>

                            <div>
                                <span>واحد پول</span>
                                <strong>{selectedExpense.currency || "-"}</strong>
                            </div>

                            <div>
                                <span>مبلغ کل</span>
                                <strong>
                                    {Number(selectedExpense.amount || 0).toLocaleString("fa-IR")}
                                </strong>
                            </div>

                            <div>
                                <span>سند حسابداری</span>
                                <strong>
                                    {selectedExpense.accounting_document ? "ثبت شده" : "ندارد"}
                                </strong>
                            </div>
                        </div>

                        <h4 className={styles.modalTitle}>آیتم‌های هزینه</h4>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th> پرداخت از</th>
                                        <th>نام منبع</th>
                                        <th>مبلغ</th>
                                        <th>کارمزد</th>
                                        <th>ارجاع</th>
                                        <th>شرح</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {(selectedExpense.items || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="7">آیتمی ثبت نشده است.</td>
                                        </tr>
                                    ) : (
                                        selectedExpense.items.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td>{index + 1}</td>
                                                <td>{item.receiver_type_label || DESTINATION_LABELS[item.receiver_type] || "-"}</td>
                                                <td>{item.receiver_name || "-"}</td>
                                                <td>{Number(item.amount || 0).toLocaleString("fa-IR")}</td>
                                                <td>{Number(item.bank_fees || 0).toLocaleString("fa-IR")}</td>
                                                <td>{item.reference || "-"}</td>
                                                <td>{item.description || "-"}</td>
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
        </div>
    );
}