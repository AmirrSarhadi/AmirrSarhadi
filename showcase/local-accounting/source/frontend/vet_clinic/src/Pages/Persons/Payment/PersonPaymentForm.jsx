import { toast } from "react-toastify";
import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
// src/Pages/Persons/Payment/PersonPaymentForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PersonPaymentForm.module.css";
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

const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) return "خطا در ثبت اطلاعات";

  if (typeof data === "string") return data;

  if (Array.isArray(data)) return data.join("، ");

  if (data.detail) return data.detail;

  const fieldErrors = Object.entries(data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join("، ")}`;
      }

      if (typeof messages === "object") {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${messages}`;
    })
    .join("\n");

  return fieldErrors || "خطا در ثبت اطلاعات";
};

export default function PersonPaymentForm() {
  const { canWrite, disabledReason } = useModulePermission("banking");

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    payment_number: "",
    date: new Date().toISOString().split("T")[0],
    currency: "ریال ایران",
    description: "",
  });

  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personSearch, setPersonSearch] = useState("");
  const [contentTypeIds, setContentTypeIds] = useState({});

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

        const [bankRes, cashboxRes, imprestRes, chequeRes, contentTypeRes] =
          await Promise.all([
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
        console.error("Payment page load error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDestinationList = (type) => {
    if (type === "bank") return banks;
    if (type === "cashbox") return cashboxes;
    if (type === "imprest") return imprests;
    if (type === "cheque") return cheques;
    return [];
  };

  const emptyChequeData = () => ({
    number: "",
    sayad_number: "",
    bank_name: "",
    bank_branch: "",
    date: formData.date,
    description: "",
  });

  const handleAddItem = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return;
    }

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
        cheque_data: emptyChequeData(),
      },
    ]);
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === "receiver_type") {
          updated.receiver_id = "";
          updated.cheque_data = updated.cheque_data || emptyChequeData();

          if (value === "cheque") {
            updated.bank_fees = 0;
          }
        }

        return updated;
      })
    );
  };

  const handleChequeChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            cheque_data: {
              ...(item.cheque_data || emptyChequeData()),
              [field]: value,
            },
          }
          : item
      )
    );
  };

  const removeItem = (id) => {
    if (!canWrite) {
      toast.error(disabledReason);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canWrite) {
      toast.error(disabledReason);
      return;
    }

    if (!selectedPerson) {
      alert("پرداخت‌کننده را انتخاب کن.");
      return;
    }

    if (items.length === 0) {
      alert("حداقل یک آیتم پرداخت اضافه کن.");
      return;
    }

    for (const item of items) {
      if (!item.amount || Number(item.amount) <= 0) {
        alert("برای همه آیتم‌ها مبلغ معتبر وارد کن.");
        return;
      }

      if (item.receiver_type !== "cheque" && !item.receiver_id) {
        alert("برای همه آیتم‌های غیرچکی مقصد پرداخت را انتخاب کن.");
        return;
      }

      if (item.receiver_type === "cheque") {
        const chequeData = item.cheque_data || {};

        if (!chequeData.number && !chequeData.sayad_number) {
          alert("برای آیتم چکی، شماره چک یا شماره صیاد را وارد کن.");
          return;
        }

        if (!chequeData.date) {
          alert("برای آیتم چکی، تاریخ سررسید را وارد کن.");
          return;
        }
      }
    }

    const selectedPersonContentType = contentTypeIds[selectedPerson.type];

    if (!selectedPersonContentType) {
      alert("نوع شخص در سیستم پیدا نشد. صفحه را رفرش کن.");
      return;
    }

    const payload = {
      payment_number: Number(formData.payment_number) || Date.now(),
      date: formData.date,
      currency: formData.currency,
      description: formData.description,
      payer_person_ct: selectedPersonContentType,
      payer_person_object_id: selectedPerson.id,
      items: items.map((item) => ({
        receiver_type: item.receiver_type,
        receiver_id:
          item.receiver_type === "cheque"
            ? item.receiver_id
              ? Number(item.receiver_id)
              : null
            : Number(item.receiver_id),
        amount: Number(item.amount),
        bank_fees: Number(item.bank_fees || 0),
        reference: item.reference,
        description: item.description,
        ...(item.receiver_type === "cheque"
          ? {
            cheque_data: {
              ...(item.cheque_data || {}),
              date: item.cheque_data?.date || formData.date,
              description:
                item.cheque_data?.description ||
                item.description ||
                "چک پرداختی",
            },
          }
          : {}),
      })),
    };

    try {
      setSubmitting(true);

      const res = await authFetch(`${API_BASE}/persons/api/v2/payment_list/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Payment submit error:", error);
        alert(getApiErrorMessage(error));
        return;
      }

      alert("پرداخت با موفقیت ثبت شد.");
      navigate("/persons/payment");
    } catch (error) {
      console.error("Payment connection error:", error);
      alert("خطا در ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <div>
            <h2>ثبت پرداخت جدید</h2>
            <p>پرداخت به شخص از بانک، صندوق، تنخواه یا چک</p>
          </div>

          <div className={styles.totalPill}>
            مجموع: {totalAmount.toLocaleString("fa-IR")} ریال
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>شماره پرداخت</label>
              <input
                type="number"
                value={formData.payment_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment_number: e.target.value,
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
                placeholder="شرح کلی پرداخت"
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <h3>دریافت‌کننده / طرف حساب</h3>
              <span>
                {selectedPerson ? selectedPerson.typeLabel : "انتخاب نشده"}
              </span>
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
                    onClick={() => setSelectedPerson(person)}
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
              <h3>آیتم‌های پرداخت</h3>

              <button
                type="button"
                className={styles.addBtn}
                onClick={handleAddItem}
                disabled={!canWrite}
                title={!canWrite ? disabledReason : undefined}
              >
                + افزودن آیتم
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

                      <button type="button" onClick={() => removeItem(item.id)} disabled={!canWrite} title={!canWrite ? disabledReason : undefined}>
                        حذف
                      </button>
                    </div>

                    <div className={styles.grid}>
                      <div className={styles.field}>
                        <label>نوع منبع پرداخت</label>
                        <select
                          value={item.receiver_type}
                          onChange={(e) => {
                            handleItemChange(
                              item.id,
                              "receiver_type",
                              e.target.value
                            );
                            handleItemChange(item.id, "receiver_id", "");
                          }}
                        >
                          {DESTINATION_OPTIONS.map((option) => (
                            <option key={option.type} value={option.type}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {item.receiver_type !== "cheque" ? (
                        <div className={styles.field}>
                          <label>منبع پرداخت</label>
                          <select
                            value={item.receiver_id}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "receiver_id",
                                e.target.value
                              )
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
                      ) : (
                        <>
                          <div className={styles.field}>
                            <label>شماره چک</label>
                            <input
                              value={item.cheque_data?.number || ""}
                              onChange={(e) =>
                                handleChequeChange(item.id, "number", e.target.value)
                              }
                              placeholder="شماره چک"
                            />
                          </div>

                          <div className={styles.field}>
                            <label>شماره صیاد</label>
                            <input
                              value={item.cheque_data?.sayad_number || ""}
                              onChange={(e) =>
                                handleChequeChange(item.id, "sayad_number", e.target.value)
                              }
                              placeholder="شماره صیاد"
                            />
                          </div>

                          <div className={styles.field}>
                            <label>بانک صادرکننده</label>
                            <input
                              value={item.cheque_data?.bank_name || ""}
                              onChange={(e) =>
                                handleChequeChange(item.id, "bank_name", e.target.value)
                              }
                              placeholder="مثلا ملت"
                            />
                          </div>

                          <div className={styles.field}>
                            <label>شعبه</label>
                            <input
                              value={item.cheque_data?.bank_branch || ""}
                              onChange={(e) =>
                                handleChequeChange(item.id, "bank_branch", e.target.value)
                              }
                              placeholder="اختیاری"
                            />
                          </div>

                          <div className={styles.field}>
                            <label>تاریخ سررسید</label>
                            <input
                              type="date"
                              value={item.cheque_data?.date || formData.date}
                              onChange={(e) =>
                                handleChequeChange(item.id, "date", e.target.value)
                              }
                            />
                          </div>
                        </>
                      )}

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
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "bank_fees",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className={styles.field}>
                        <label>ارجاع</label>
                        <input
                          value={item.reference}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "reference",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className={`${styles.field} ${styles.full}`}>
                        <label>شرح آیتم</label>
                        <textarea
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "description",
                              e.target.value
                            )
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
              onClick={() => navigate("/persons/payment")}
            >
              انصراف
            </button>

            <button className={styles.submitBtn} disabled={submitting || loading || !canWrite} title={!canWrite ? disabledReason : undefined}>
              {submitting ? "در حال ثبت..." : "ثبت پرداخت"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

