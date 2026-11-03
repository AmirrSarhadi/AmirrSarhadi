import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./Expense.module.css";
import { StatGrid, StatCard } from "../../../components/ERP/ERP";
import { FiTrendingUp, FiTrendingDown, FiLayers, FiDollarSign } from "react-icons/fi";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;


const CURRENCY_OPTIONS = [
    "ریال ایران",
    "دلار کانادا",
    "یورو",
    "دلار آمریکا",
    "درهم امارات عربی",
    "ریال عمان",
];

const DESTINATION_OPTIONS = [
    { type: "cashbox", label: "صندوق" },
    { type: "imprest", label: "تنخواه‌گردان" },
    { type: "bank", label: "بانک" },
    { type: "cheque", label: "چک" },
];

export default function ExpenseCreate() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("purchases");
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        expense_number: "",
        date: new Date().toISOString().split("T")[0],
        currency: "ریال ایران",
        description: "",
    });

    const [persons, setPersons] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [contentTypeIds, setContentTypeIds] = useState({});
    const [personSearch, setPersonSearch] = useState("");

    const [items, setItems] = useState([]);

    const [banks, setBanks] = useState([]);
    const [cashboxes, setCashboxes] = useState([]);
    const [imprests, setImprests] = useState([]);
    const [cheques, setCheques] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const totalAmount = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [items]
    );

    const filteredPersons = useMemo(() => {
        const q = personSearch.trim().toLowerCase();
        if (!q) return persons;

        return persons.filter((p) =>
            `${p.name} ${p.typeLabel} ${p.mobile || ""}`.toLowerCase().includes(q)
        );
    }, [persons, personSearch]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const personEndpoints = [
                    [`${API_BASE}/persons/api/v2/staff_list/`, "staff", "کارمند"],
                    [`${API_BASE}/persons/api/v2/customer_list/`, "customer", "مشتری"],
                    [`${API_BASE}/persons/api/v2/vendor_list/`, "vendor", "تأمین‌کننده"],
                    [`${API_BASE}/persons/api/v2/seller_list/`, "seller", "فروشنده"],
                ];

                const allPersons = [];

                for (const [url, type, typeLabel] of personEndpoints) {
                    const res = await authFetch(url);
                    if (!res.ok) continue;

                    const data = await res.json();
                    const list = Array.isArray(data) ? data : data.results || [];

                    list.forEach((item) => {
                        allPersons.push({
                            id: item.id,
                            type,
                            typeLabel,
                            mobile: item.mobile,
                            name:
                                item.company ||
                                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                                "بدون نام",
                        });
                    });
                }

                const [bankRes, cashboxRes, imprestRes, chequeRes, contentTypeRes] = await Promise.all([
                    authFetch(`${API_BASE}/banking/api/v2/bank_list/`),
                    authFetch(`${API_BASE}/banking/api/v2/cashbox_list/`),
                    authFetch(`${API_BASE}/banking/api/v2/imprest_list/`),
                    authFetch(`${API_BASE}/persons/api/v2/cheque_list/`),
                    authFetch(`${API_BASE}/persons/api/v2/person-content-types/`),
                ]);

                const normalize = async (res) => {
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data) ? data : data.results || [];
                };

                setPersons(allPersons);
                setBanks(await normalize(bankRes));
                setCashboxes(await normalize(cashboxRes));
                setImprests(await normalize(imprestRes));
                setCheques(await normalize(chequeRes));
                setContentTypeIds(contentTypeRes.ok ? await contentTypeRes.json() : {});
            } catch (error) {
                console.error("Expense page load error:", error);
                toast.error("خطا در دریافت اطلاعات اولیه هزینه");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!isEdit || persons.length === 0) return;

        const fetchExpense = async () => {
            try {
                setLoading(true);

                const res = await authFetch(`${API_BASE}/costs/api/${id}/v2/expense_list/`);

                if (!res.ok) {
                    toast.error("هزینه برای ویرایش پیدا نشد.");
                    navigate("/purchases/expense");
                    return;
                }

                const expense = await res.json();

                setFormData({
                    expense_number: expense.expense_number || "",
                    date: expense.date || new Date().toISOString().split("T")[0],
                    currency: expense.currency || "ریال ایران",
                    description: expense.description || "",
                });

                const foundPerson = persons.find(
                    (person) =>
                        contentTypeIds[person.type] === expense.payer_person_ct &&
                        Number(person.id) === Number(expense.payer_person_object_id)
                );

                if (foundPerson) {
                    setSelectedPerson(foundPerson);
                }

                setItems(
                    (expense.items || []).map((item) => ({
                        id: item.id || Date.now() + Math.random(),
                        receiver_type: item.receiver_type || "bank",
                        receiver_id: item.receiver_id || "",
                        amount: item.amount || "",
                        bank_fees: item.bank_fees || 0,
                        reference: item.reference || "",
                        description: item.description || "",
                    }))
                );
            } catch (error) {
                console.error("Fetch expense detail error:", error);
                toast.error("خطا در دریافت اطلاعات هزینه");
            } finally {
                setLoading(false);
            }
        };

        fetchExpense();
    }, [isEdit, id, persons, contentTypeIds, navigate]);

    const getDestinationList = (type) => {
        if (type === "bank") return banks;
        if (type === "cashbox") return cashboxes;
        if (type === "imprest") return imprests;
        if (type === "cheque") {
            const personContentTypeId = selectedPerson
                ? contentTypeIds[selectedPerson.type]
                : null;
            return cheques.filter((cheque) =>
                ["OUT", "پرداختی"].includes(cheque.cheque_type) &&
                ["PENDING"].includes(cheque.status) &&
                !cheque.accounting_document &&
                (!personContentTypeId || (
                    Number(cheque.content_type) === Number(personContentTypeId) &&
                    Number(cheque.object_id) === Number(selectedPerson?.id)
                ))
            );
        }
        return [];
    };

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }

        return false;
    };

    const handleAddItem = () => {
        if (guardWrite()) return;

        setItems((prev) => [
            ...prev,
            {
                id: Date.now(),
                receiver_type: "bank",
                receiver_id: "",
                amount: "",
                bank_fees: 0,
                reference: "",
                description: "",
            },
        ]);
    };

    const handleItemChange = (id, field, value) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const removeItem = (id) => {
        if (guardWrite()) return;

        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (guardWrite()) return;

        if (!selectedPerson) {
            toast.warning("شخص مرتبط با هزینه را انتخاب کن.");
            return;
        }

        if (items.length === 0) {
            toast.warning("حداقل یک آیتم هزینه اضافه کن.");
            return;
        }

        for (const item of items) {
            if (!item.receiver_id) {
                toast.warning("برای همه آیتم‌ها مقصد پرداخت را انتخاب کن.");
                return;
            }

            if (!item.amount || Number(item.amount) <= 0) {
                toast.warning("برای همه آیتم‌ها مبلغ معتبر وارد کن.");
                return;
            }
        }

        const personContentTypeId = contentTypeIds[selectedPerson.type];
        if (!personContentTypeId) {
            toast.error("نوع شخص از سرور دریافت نشد. صفحه را بروزرسانی کن.");
            return;
        }

        const payload = {
            expense_number: Number(formData.expense_number) || Date.now(),
            date: formData.date,
            currency: formData.currency,
            description: formData.description,
            payer_person_ct: personContentTypeId,
            payer_person_object_id: selectedPerson.id,
            amount: totalAmount,
            items: items.map((item) => ({
                receiver_type: item.receiver_type,
                receiver_id: Number(item.receiver_id),
                amount: Number(item.amount),
                bank_fees: Number(item.bank_fees || 0),
                reference: item.reference,
                description: item.description,
            })),
        };

        try {
            setSubmitting(true);

            const url = isEdit
                ? `${API_BASE}/costs/api/${id}/v2/expense_list/`
                : `${API_BASE}/costs/api/v2/expense_list/`;

            const res = await authFetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Expense submit error:", error);
                toast.error("ثبت هزینه انجام نشد. Console را چک کن.");
                return;
            }

            toast.success("هزینه با موفقیت ثبت شد.");
            navigate("/purchases/expense");
        } catch (error) {
            console.error("Expense connection error:", error);
            toast.error("خطا در ارتباط با سرور.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.formCard}>
                <div className={styles.header}>
                    <div>
                        <h2>{isEdit ? "ویرایش هزینه" : "ثبت هزینه جدید"}</h2>
                        <p>ثبت هزینه و پرداخت از بانک، صندوق، تنخواه یا چک</p>
                    </div>

                    <div className={styles.totalPill}>
                        مجموع: {totalAmount.toLocaleString("fa-IR")} ریال
                    </div>
                </div>

                <StatGrid>
                    <StatCard label="مبلغ پرداخت" value={`${totalAmount.toLocaleString("fa-IR")} ریال`} icon={<FiDollarSign />} tone="danger" />
                    <StatCard label="تعداد آیتم‌ها" value={items.length.toLocaleString("fa-IR")} icon={<FiLayers />} />
                    <StatCard label="واحد پول" value={formData.currency || "IRR"} icon={<FiTrendingDown />} tone="info" />
                </StatGrid>

                <form onSubmit={handleSubmit}>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>شماره هزینه</label>
                            <input
                                type="number"
                                value={formData.expense_number}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        expense_number: e.target.value,
                                    }))
                                }
                                placeholder="اختیاری"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تاریخ</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label>واحد پول</label>
                            <select
                                value={formData.currency}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, currency: e.target.value }))
                                }
                            >
                                {CURRENCY_OPTIONS.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={`${styles.field} ${styles.full}`}>
                            <label>شرح کلی</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="شرح کلی هزینه"
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>طرف حساب هزینه</h3>
                            <span>{selectedPerson ? selectedPerson.typeLabel : "انتخاب نشده"}</span>
                        </div>

                        <input
                            className={styles.searchInput}
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                            placeholder="جستجوی شخص..."
                        />

                        <div className={styles.personList}>
                            {loading ? (
                                <div className={styles.emptyState}>در حال بارگذاری...</div>
                            ) : (
                                filteredPersons.map((person) => (
                                    <button
                                        type="button"
                                        key={`${person.type}-${person.id}`}
                                        className={`${styles.personItem} ${selectedPerson?.id === person.id &&
                                            selectedPerson?.type === person.type
                                            ? styles.selected
                                            : ""
                                            }`}
                                        onClick={() => {
                                            if (guardWrite()) return;
                                            setSelectedPerson(person);
                                        }}
                                        disabled={!canWrite}
                                        title={!canWrite ? disabledReason : undefined}
                                    >
                                        <strong>{person.name}</strong>
                                        <span>{person.typeLabel}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>آیتم‌های هزینه</h3>

                            <button
                                type="button"
                                className={styles.addBtn}
                                onClick={handleAddItem}
                                disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                <FaPlus />
                                افزودن آیتم
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <div className={styles.emptyState}>هنوز آیتمی اضافه نشده است.</div>
                        ) : (
                            <div className={styles.itemsList}>
                                {items.map((item, index) => (
                                    <div className={styles.itemCard} key={item.id}>
                                        <div className={styles.itemHeader}>
                                            <strong>آیتم {index + 1}</strong>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                disabled={!canWrite}
                                                title={!canWrite ? disabledReason : undefined}
                                            >
                                                <FaTrashAlt />
                                                حذف
                                            </button>
                                        </div>

                                        <div className={styles.grid}>
                                            <div className={styles.field}>
                                                <label>نوع منبع پرداخت</label>
                                                <select
                                                    value={item.receiver_type}
                                                    onChange={(e) => {
                                                        handleItemChange(item.id, "receiver_type", e.target.value);
                                                        handleItemChange(item.id, "receiver_id", "");
                                                        if (e.target.value === "cheque") {
                                                            handleItemChange(item.id, "bank_fees", 0);
                                                        }
                                                    }}
                                                >
                                                    {DESTINATION_OPTIONS.map((option) => (
                                                        <option key={option.type} value={option.type}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className={styles.field}>
                                                <label>منبع پرداخت</label>
                                                <select
                                                    value={item.receiver_id}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "receiver_id", e.target.value)
                                                    }
                                                >
                                                    <option value="">انتخاب کنید</option>
                                                    {getDestinationList(item.receiver_type).map((obj) => (
                                                        <option key={obj.id} value={obj.id}>
                                                            {obj.name ||
                                                                obj.title ||
                                                                obj.account_number ||
                                                                obj.number ||
                                                                `#${obj.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className={styles.field}>
                                                <label>مبلغ</label>
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "amount", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles.field}>
                                                <label>کارمزد بانکی</label>
                                                <input
                                                    type="number"
                                                    value={item.bank_fees}
                                                    disabled={item.receiver_type === "cheque"}
                                                    title={item.receiver_type === "cheque" ? "کارمزد چک هنگام عملیات بانکی چک ثبت می‌شود" : undefined}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "bank_fees", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={styles.field}>
                                                <label>ارجاع</label>
                                                <input
                                                    value={item.reference}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "reference", e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className={`${styles.field} ${styles.full}`}>
                                                <label>شرح آیتم</label>
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "description", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => navigate("/purchases/expense")}
                        >
                            انصراف
                        </button>

                        <button
                            className={styles.submitBtn}
                            disabled={submitting || loading || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            {submitting ? "در حال ثبت..." : isEdit ? "ثبت اصلاحیه هزینه" : "ثبت هزینه"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}