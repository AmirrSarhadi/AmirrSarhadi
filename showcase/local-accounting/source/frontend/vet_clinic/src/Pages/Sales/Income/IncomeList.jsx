import { authFetch } from "../../../api/http";
import { extractList, API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaEye, FaPlus, FaSearch, FaTimes, FaTrashAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./Income.module.css";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../../components/ERP/ERP";
import { FiTrendingUp, FiTrendingDown, FiSearch, FiDollarSign } from "react-icons/fi";

const API_BASE = API_BASE_URL;

const DESTINATION_LABELS = {
    bank: "بانک",
    cashbox: "صندوق",
    imprest: "تنخواه‌گردان",
    cheque: "چک",
};

export default function IncomeList() {
    const [incomes, setIncomes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedIncome, setSelectedIncome] = useState(null);

    const navigate = useNavigate();

    const fetchIncomes = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/incomes/api/v2/income_list/`);
            const data = await res.json();
            setIncomes(extractList(data));
        } catch (error) {
            console.error("Fetch incomes error:", error);
            toast.error("خطا در دریافت لیست درآمدها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncomes();
    }, []);

    const handleDelete = async (income) => {
        const message = income.accounting_document
            ? "این درآمد سند حسابداری دارد. با حذف آن، سند معکوس و درآمد ابطال می‌شود. ادامه می‌دهی؟"
            : "آیا از حذف این درآمد مطمئن هستی؟";

        const ok = window.confirm(message);
        if (!ok) return;

        try {
            const res = await authFetch(`${API_BASE}/incomes/api/${income.id}/v2/income_list/`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json().catch(() => null);
                console.error("Delete income error:", error);
                toast.error(Array.isArray(error) ? error[0] : "حذف/ابطال درآمد انجام نشد.");
                return;
            }

            toast.success(income.accounting_document ? "درآمد ابطال شد." : "درآمد حذف شد.");
            fetchIncomes();
        } catch (error) {
            console.error("Delete income connection error:", error);
            toast.error("خطا در ارتباط با سرور.");
        }
    };

    const filteredIncomes = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return incomes;

        return incomes.filter((income) =>
            [
                income.income_number,
                income.date,
                income.currency,
                income.amount,
                income.description,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [incomes, searchTerm]);

    return (
        <div className={styles.page}>
        <PageHero eyebrow="جریان نقد و عملیات مالی" title="درآمدها" description="ثبت و مدیریت جریان‌های ورودی و اسناد درآمد" icon={<FiTrendingUp />} actions={<PrimaryButton type="button" onClick={() => navigate("/sales/income/new")}><FaPlus /> ثبت درآمد</PrimaryButton>} />
        <StatGrid>
            <StatCard label="تعداد ثبت‌ها" value={incomes.length.toLocaleString("fa-IR")} icon={<FiTrendingUp />} tone="success" />
            <StatCard label="مبلغ کل" value={`${incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString("fa-IR")} ریال`} icon={<FiDollarSign />} tone="success" />
            <StatCard label="نتیجه جستجو" value={filteredIncomes.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
        </StatGrid>
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>لیست درآمدها</h3>
                    <p>مدیریت درآمدهای ثبت‌شده در سیستم</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => navigate("/sales/income/new")}
                >
                    <FaPlus />
                    افزودن درآمد
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
                    {filteredIncomes.length.toLocaleString("fa-IR")} درآمد
                </div>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره درآمد</th>
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
                            {filteredIncomes.length === 0 ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className={styles.emptyState}>
                                            <strong>درآمدی پیدا نشد</strong>
                                            <p>درآمد جدید ثبت کن یا عبارت جستجو را تغییر بده.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredIncomes.map((income, index) => {
                                    const isLocked = income.is_locked || income.accounting_document;

                                    return (
                                        <tr key={income.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{income.income_number || "-"}</td>
                                            <td>{income.date || "-"}</td>
                                            <td>{income.currency || "-"}</td>
                                            <td>
                                                <span className={styles.amountBadge}>
                                                    {Number(income.amount || 0).toLocaleString("fa-IR")}
                                                </span>
                                            </td>
                                            <td>{income.items?.length || 0}</td>
                                            <td>
                                                <span className={isLocked ? styles.lockedBadge : styles.openBadge}>
                                                    {isLocked ? "دارای سند" : "قابل ویرایش"}
                                                </span>
                                            </td>
                                            <td>{income.description || "-"}</td>
                                            <td>
                                                <div className={styles.actionBtns}>
                                                    <button
                                                        type="button"
                                                        className={styles.viewBtn}
                                                        onClick={() => setSelectedIncome(income)}
                                                        title="جزئیات"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.editBtn}
                                                        onClick={() => navigate(`/sales/income/edit/${income.id}`)}
                                                        title="ویرایش"
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleDelete(income)}
                                                        title="حذف / ابطال"
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

            {selectedIncome && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>جزئیات درآمد #{selectedIncome.income_number || selectedIncome.id}</h3>
                                <p>{selectedIncome.description || "بدون شرح"}</p>
                            </div>

                            <button
                                type="button"
                                className={styles.closeBtn}
                                onClick={() => setSelectedIncome(null)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.detailGrid}>
                            <div>
                                <span>تاریخ</span>
                                <strong>{selectedIncome.date || "-"}</strong>
                            </div>

                            <div>
                                <span>واحد پول</span>
                                <strong>{selectedIncome.currency || "-"}</strong>
                            </div>

                            <div>
                                <span>مبلغ کل</span>
                                <strong>
                                    {Number(selectedIncome.amount || 0).toLocaleString("fa-IR")}
                                </strong>
                            </div>

                            <div>
                                <span>سند حسابداری</span>
                                <strong>
                                    {selectedIncome.accounting_document ? "ثبت شده" : "ندارد"}
                                </strong>
                            </div>
                        </div>

                        <h4 className={styles.modalTitle}>آیتم‌های درآمد</h4>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>نوع دریافت</th>
                                        <th>مقصد دریافت</th>
                                        <th>مبلغ</th>
                                        <th>کارمزد</th>
                                        <th>ارجاع</th>
                                        <th>شرح</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {(selectedIncome.items || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="7">آیتمی ثبت نشده است.</td>
                                        </tr>
                                    ) : (
                                        selectedIncome.items.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td>{index + 1}</td>
                                                <td>{DESTINATION_LABELS[item.receiver_type] || item.receiver_type}</td>
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