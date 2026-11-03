import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "../../Sales/Invoices/SalesCreate.module.css";
import { FaPlus, FaTrashAlt, FaTimes, FaSearch, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import useModulePermission from "../../../hooks/useModulePermission";
import { PageHero, StatGrid, StatCard, SecondaryButton } from "../../../components/ERP";
import { FiFileText, FiPackage, FiPercent, FiCreditCard, FiArrowRight } from "react-icons/fi";

const API = API_BASE_URL;

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const num = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

function pickerValueFromGregorian(dateStr) {
  if (!dateStr) return null;
  return new DateObject({
    date: dateStr,
    calendar: gregorian,
    locale: gregorian_en,
  }).convert(persian, persian_fa);
}

function gregorianFromPicker(value) {
  if (!value) return "";
  return new DateObject(value)
    .convert(gregorian, gregorian_en)
    .format("YYYY-MM-DD");
}

export default function PurchaseInvoiceForm({
  returned = false,
  title = "فاکتور خرید جدید",
}) {
  const navigate = useNavigate();
  const { canWrite, disabledReason } = useModulePermission("purchases");

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }

    return false;
  };

  const [form, setForm] = useState({
    code: "",
    reference: "",
    title: returned ? "فاکتور برگشت از خرید" : "فاکتور خرید",
    date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    invoice_type: returned ? "مرجوع شده" : "پیش نویس",
    vendor_id: "",
    warehouse: "",
    currency: "ریال ایران",
    discount_percent: 0,
    discount_price: 0,
    tax_percent: 9,
    shipping_cost: 0,
    shipping_person: "",
    additional_amount: 0,
    payment_method: "نقد",
    paid_amount: 0,
    description: "",
    city: "",
  });

  const [vendors, setVendors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRow, setPickerRow] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, d, w] = await Promise.all([
          getAllPages(`${API}/costs/api/v2/vendors/`),
          getAllPages(`${API}/costs/api/v2/drivers/`),
          getAllPages(`${API}/warehousing/api/v2/warehouses/`),
        ]);

        setVendors(extractList(v.data));
        setDrivers(extractList(d.data));
        setWarehouses(extractList(w.data));
      } catch (err) {
        console.error(err);
        toast.error("خطا در دریافت اطلاعات اولیه خرید");
      }
    };

    load();
  }, []);

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + num(item.total_price), 0),
    [items]
  );

  const discountValue = useMemo(() => {
    let value = num(form.discount_price);

    if (num(form.discount_percent) > 0) {
      value += (subTotal * num(form.discount_percent)) / 100;
    }

    return value;
  }, [form.discount_price, form.discount_percent, subTotal]);

  const taxValue = useMemo(() => {
    return (Math.max(0, subTotal - discountValue) * num(form.tax_percent)) / 100;
  }, [subTotal, discountValue, form.tax_percent]);

  const grandTotal = useMemo(() => {
    return (
      Math.max(0, subTotal - discountValue) +
      taxValue +
      num(form.shipping_cost) +
      num(form.additional_amount)
    );
  }, [subTotal, discountValue, taxValue, form.shipping_cost, form.additional_amount]);

  const addRow = () => {
    if (guardWrite()) return;

    setItems((prev) => [
      ...prev,
      {
        material: null,
        material_name: "",
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        total_price: 0,
        description: "",
      },
    ]);
  };

  const updateRow = (index, patch) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], ...patch };

      row.total_price = Math.max(
        0,
        num(row.quantity) * num(row.unit_price) - num(row.discount_amount)
      );

      copy[index] = row;
      return copy;
    });
  };

  const removeRow = (index) => {
    if (guardWrite()) return;

    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchMaterials = async (q = "") => {
    try {
      setLoadingMaterials(true);

      const { data } = await getAllPages(
        `${API}/services/api/v2/materials/?search=${encodeURIComponent(q)}`
      );

      setMaterials(extractList(data));
    } catch (err) {
      console.error(err);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const openPicker = (index) => {
    if (guardWrite()) return;

    setPickerRow(index);
    setPickerSearch("");
    setPickerOpen(true);
    fetchMaterials("");
  };

  const selectMaterial = (material) => {
    if (guardWrite()) return;

    updateRow(pickerRow, {
      material: material.id,
      material_name: material.persian_name,
      unit_price: num(material.unit_buying_price || material.unit_selling_price),
    });

    setPickerOpen(false);
  };

  const submitInvoice = async () => {
    if (guardWrite()) return;

    if (!form.vendor_id) {
      return toast.error("تأمین‌کننده را انتخاب کن");
    }

    if (!form.warehouse) {
      return toast.error("انبار را انتخاب کن");
    }

    if (!items.some((item) => item.material)) {
      return toast.error("حداقل یک کالا انتخاب کن");
    }

    const payload = {
      code: Number(form.code || Date.now()),
      reference: form.reference || `${returned ? "PRET" : "PINV"}-${Date.now()}`,
      title: form.title || title,
      date: form.date,
      expiry_date: form.expiry_date || null,
      vendor: Number(form.vendor_id),
      warehouse: Number(form.warehouse),
      currency: form.currency,
      discount_percent: num(form.discount_percent),
      discount_price: discountValue,
      tax_percent: num(form.tax_percent),
      tax_value: taxValue,
      total_amount: grandTotal,
      paid_amount: num(form.paid_amount),
      payment_method: form.payment_method,
      description: form.description,
      shipping_cost: num(form.shipping_cost),
      shipping_person: form.shipping_person ? Number(form.shipping_person) : null,
      additional_amount: num(form.additional_amount),
      city: form.city || "",
      items: items
        .filter((item) => item.material)
        .map((item) => ({
          material: item.material,
          quantity: num(item.quantity),
          unit_price: num(item.unit_price),
          discount_amount: num(item.discount_amount),
          total_price: num(item.total_price),
        })),
    };

    try {
      setSubmitting(true);

      const url = returned
        ? `${API}/costs/api/v2/returned_buy_invoices/`
        : `${API}/costs/api/v2/buy_invoices/`;

      await axios.post(url, payload);

      toast.success(returned ? "فاکتور برگشت از خرید ثبت شد" : "فاکتور خرید ثبت شد");
      navigate(returned ? "/purchases/returns" : "/purchases/invoices");
    } catch (err) {
      console.error("Purchase invoice submit error:", err.response?.data || err);

      const apiError = err?.response?.data;

      toast.error(
        apiError?.error ||
        apiError?.detail ||
        (Array.isArray(apiError) ? apiError[0] : null) ||
        "ثبت فاکتور خرید انجام نشد"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHero
        eyebrow={returned ? "خرید / برگشت از خرید" : "خرید / فاکتور جدید"}
        title={title}
        description={returned ? "ثبت برگشت خرید با کنترل خروج کالا و اثر مالی." : "ثبت خرید با تمرکز روی تأمین‌کننده، انبار مقصد، اقلام و جمع‌بندی مالی."}
        icon={<FiFileText />}
        actions={<SecondaryButton type="button" onClick={() => navigate(returned ? "/purchases/returns" : "/purchases/invoices")}><FiArrowRight /> بازگشت به لیست</SecondaryButton>}
      />

      <StatGrid>
        <StatCard label="تعداد اقلام" value={items.length.toLocaleString("fa-IR")} hint="ردیف‌های فاکتور" icon={<FiPackage />} tone="info" />
        <StatCard label="جمع اقلام" value={`${money(subTotal)} ریال`} hint="قبل از تخفیف و مالیات" icon={<FiCreditCard />} />
        <StatCard label="تخفیف" value={`${money(discountValue)} ریال`} hint={`${Number(form.discount_percent || 0).toLocaleString("fa-IR")}٪ تخفیف درصدی`} icon={<FiPercent />} tone="warning" />
        <StatCard label="مبلغ نهایی" value={`${money(grandTotal)} ریال`} hint="مبلغ قابل ثبت" icon={<FiCreditCard />} tone="success" />
      </StatGrid>

      <div className={styles.formCard}>
        <div className={styles.sectionTitle}>
          <h3>اطلاعات اصلی</h3>
          <span>{returned ? "برگشت از خرید" : "خرید"}</span>
        </div>

        <div className={styles.headerForm}>
          <div className={styles.row}>
            <Field label="شماره">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="اختیاری"
              />
            </Field>

            <Field label="ارجاع">
              <input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="اختیاری"
              />
            </Field>

            <Field label="تاریخ *">
              <div className={styles.datePickerWrap}>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass={styles.dateInput}
                  containerClassName={styles.datePickerContainer}
                  value={pickerValueFromGregorian(form.date)}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      date: gregorianFromPicker(value),
                    })
                  }
                />
              </div>
            </Field>

            <Field label="سررسید">
              <div className={styles.datePickerWrap}>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass={styles.dateInput}
                  containerClassName={styles.datePickerContainer}
                  value={pickerValueFromGregorian(form.expiry_date)}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      expiry_date: gregorianFromPicker(value),
                    })
                  }
                />
              </div>
            </Field>

            <Field label="عنوان" grow>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="تأمین‌کننده *">
              <select
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.company ||
                      `${v.first_name || ""} ${v.last_name || ""}`.trim() ||
                      `#${v.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={returned ? "انبار خروج *" : "انبار مقصد *"}>
              <select
                value={form.warehouse}
                onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || `#${w.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="راننده">
              <select
                value={form.shipping_person}
                onChange={(e) => setForm({ ...form, shipping_person: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.company ||
                      `${d.first_name || ""} ${d.last_name || ""}`.trim() ||
                      `#${d.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="واحد پول">
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="ریال ایران">ریال ایران</option>
                <option value="تومان">تومان</option>
                <option value="دلار آمریکا">دلار آمریکا</option>
                <option value="یورو">یورو</option>
              </select>
            </Field>

            <Field label="شهر">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.sectionTitle}>
          <h3>اقلام فاکتور</h3>

          <button
            type="button"
            className={styles.addItemBtn}
            onClick={addRow}
            disabled={!canWrite}
            title={!canWrite ? disabledReason : undefined}
          >
            <FaPlus />
            افزودن ردیف
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>حذف</th>
                <th>ردیف</th>
                <th>کالا</th>
                <th>شرح</th>
                <th>تعداد</th>
                <th>مبلغ واحد</th>
                <th>تخفیف</th>
                <th>مبلغ کل</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className={styles.emptyState}>ردیفی اضافه نشده است.</div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => removeRow(index)}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                      >
                        <FaTrashAlt />
                      </button>
                    </td>

                    <td>{index + 1}</td>

                    <td>
                      <button
                        type="button"
                        className={styles.selectBtn}
                        onClick={() => openPicker(index)}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                      >
                        {item.material_name || "انتخاب کالا"}
                      </button>
                    </td>

                    <td>
                      <input
                        value={item.description}
                        onChange={(e) => updateRow(index, { description: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateRow(index, { quantity: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateRow(index, { unit_price: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={item.discount_amount}
                        onChange={(e) => updateRow(index, { discount_amount: e.target.value })}
                      />
                    </td>

                    <td>
                      <span className={styles.amountBadge}>{money(item.total_price)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.totals}>
          <div>
            <span>جمع جزء</span>
            <b>{money(subTotal)}</b>
          </div>

          <div>
            <span>تخفیف</span>
            <b>{money(discountValue)}</b>
          </div>

          <div>
            <span>مالیات</span>
            <b>{money(taxValue)}</b>
          </div>

          <div>
            <span>حمل</span>
            <b>{money(form.shipping_cost)}</b>
          </div>

          <div className={styles.grand}>
            <span>مبلغ کل</span>
            <b>{money(grandTotal)}</b>
          </div>
        </div>

        <div className={styles.row}>
          <Field label="درصد تخفیف">
            <input
              type="number"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
            />
          </Field>

          <Field label="مبلغ تخفیف">
            <input
              type="number"
              value={form.discount_price}
              onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
            />
          </Field>

          <Field label="درصد مالیات">
            <input
              type="number"
              value={form.tax_percent}
              onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
            />
          </Field>

          <Field label="هزینه حمل">
            <input
              type="number"
              value={form.shipping_cost}
              onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
            />
          </Field>

          <Field label="پرداخت شده">
            <input
              type="number"
              value={form.paid_amount}
              onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
            />
          </Field>

          <Field label="مبلغ اضافه">
            <input
              type="number"
              value={form.additional_amount}
              onChange={(e) => setForm({ ...form, additional_amount: e.target.value })}
            />
          </Field>
        </div>

        <div className={styles.row}>
          <Field label="توضیحات" grow>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(returned ? "/purchases/returns" : "/purchases/invoices")}
          >
            انصراف
          </button>

          <button
            type="button"
            className={styles.primary}
            onClick={submitInvoice}
            disabled={submitting || !canWrite}
            title={!canWrite ? disabledReason : undefined}
          >
            <FaSave />
            {submitting ? "در حال ثبت..." : "ثبت فاکتور"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className={styles.modalBackdrop} onClick={() => setPickerOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <b>انتخاب کالا</b>
                <small>کالای موردنظر را انتخاب کن</small>
              </div>

              <button type="button" onClick={() => setPickerOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.searchRow}>
              <div className={styles.modalSearch}>
                <FaSearch />
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="جستجو..."
                />
              </div>

              <button type="button" onClick={() => fetchMaterials(pickerSearch)}>
                جستجو
              </button>
            </div>

            <div className={styles.list}>
              {loadingMaterials ? (
                <div className={styles.emptyState}>در حال بارگذاری...</div>
              ) : (
                <table className={styles.pickTable}>
                  <thead>
                    <tr>
                      <th>کد</th>
                      <th>نام کالا</th>
                      <th>قیمت خرید</th>
                      <th>انتخاب</th>
                    </tr>
                  </thead>

                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id}>
                        <td>{m.sku_code || "-"}</td>
                        <td>{m.persian_name || "-"}</td>
                        <td>{money(m.unit_buying_price || m.unit_selling_price)}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.selectMaterialBtn}
                            onClick={() => selectMaterial(m)}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : undefined}
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, grow }) {
  return (
    <div className={grow ? `${styles.field} ${styles.grow}` : styles.field}>
      <label>{label}</label>
      {children}
    </div>
  );
}