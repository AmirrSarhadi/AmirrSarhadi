import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
// src/Pages/Sales/Invoices/SalesCreate.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./SalesCreate.module.css";
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

function toNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}
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

export default function InvoiceForm({
  returned = false,
  title = "فاکتور فروش جدید",
}) {
  const navigate = useNavigate();
  const { canWrite: canWriteSales, writeProps: salesWriteProps, disabledReason: salesDisabledReason } = useModulePermission("sales");
  const { canWrite: canWriteCatalog, writeProps: catalogWriteProps, disabledReason: catalogDisabledReason } = useModulePermission("catalog");

  const [form, setForm] = useState({
    code: "",
    reference: "",
    title: returned ? "فاکتور برگشت از فروش" : "",
    date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    invoice_type: returned ? "مرجوع شده" : "پیش نویس",
    customer_id: "",
    seller_id: "",
    warehouse: "",
    currency: "ریال ایران",
    discount_percent: 0,
    discount_price: 0,
    tax_percent: 9,
    shipping_cost: 0,
    shipping_person: "",
    additional_amount: 0,
    payment_method: "نقد",
    description: "",
    city: "",
  });

  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [items, setItems] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRowIndex, setPickerRowIndex] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [sellerPercent, setSellerPercent] = useState(0);
  const [modal, setModal] = useState(null);
  const [codeModal, setCodeModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [customersRes, sellersRes, driversRes, warehousesRes] =
          await Promise.all([
            getAllPages(`${API}/incomes/api/v2/customers/`),
            getAllPages(`${API}/incomes/api/v2/sellers/`),
            getAllPages(`${API}/incomes/api/v2/drivers/`),
            getAllPages(`${API}/warehousing/api/v2/warehouses/`),
          ]);

        setCustomers(extractList(customersRes.data));
        setSellers(extractList(sellersRes.data));
        setDrivers(extractList(driversRes.data));
        setWarehouses(extractList(warehousesRes.data));
      } catch (error) {
        console.error("Sales create initial data error:", error);
        toast.error("خطا در دریافت اطلاعات اولیه فروش");
      }
    };

    loadInitialData();
  }, []);

  const subTotal = useMemo(
    () => items.reduce((s, it) => s + toNumber(it.total_price), 0),
    [items]
  );

  const discountValue = useMemo(() => {
    let d = toNumber(form.discount_price);

    if (toNumber(form.discount_percent) > 0) {
      d += (subTotal * toNumber(form.discount_percent)) / 100;
    }

    return d;
  }, [form.discount_price, form.discount_percent, subTotal]);

  const taxValue = useMemo(() => {
    const base = Math.max(0, subTotal - discountValue);
    return (base * toNumber(form.tax_percent)) / 100;
  }, [form.tax_percent, subTotal, discountValue]);

  const grandTotal = useMemo(() => {
    return (
      Math.max(0, subTotal - discountValue) +
      taxValue +
      toNumber(form.shipping_cost) +
      toNumber(form.additional_amount)
    );
  }, [
    subTotal,
    discountValue,
    taxValue,
    form.shipping_cost,
    form.additional_amount,
  ]);

  const addEmptyRow = () => {
    setItems((prev) => [
      ...prev,
      {
        material: null,
        material_name: "",
        currency: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        total_price: 0,
      },
    ]);
  };

  const removeRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, patch) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[idx], ...patch };

      const qty = toNumber(row.quantity);
      const price = toNumber(row.unit_price);
      const disc = toNumber(row.discount_amount);

      row.total_price = Math.max(0, qty * price - disc);
      next[idx] = row;

      return next;
    });
  };

  const openPicker = (rowIndex) => {
    setPickerRowIndex(rowIndex);
    setPickerSearch("");
    setPickerOpen(true);
    fetchMaterials("");
  };

  const fetchMaterials = async (q = "") => {
    setLoadingMaterials(true);

    try {
      const { data } = await getAllPages(
        `${API}/services/api/v2/materials/?search=${encodeURIComponent(q)}`
      );

      setMaterials(extractList(data));
    } catch (error) {
      console.error("Fetch materials error:", error);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const selectMaterial = (m) => {
    setItems((prev) =>
      prev.map((row, i) =>
        i === pickerRowIndex
          ? {
            ...row,
            material: m.id,
            material_name: m.persian_name,
            unit_price: toNumber(m.unit_selling_price),
            currency: m.main_currency || form.currency || "ریال ایران",
            total_price:
              toNumber(m.unit_selling_price) * toNumber(row.quantity) -
              toNumber(row.discount_amount),
          }
          : row
      )
    );

    setPickerOpen(false);
  };

  const fetchByCode = async (type, value, rowIdx) => {
    if (!value) {
      toast.warning("کد را وارد کنید");
      return;
    }

    try {
      const { data } = await getAllPages(
        `${API}/incomes/api/v2/materials/${type}/${encodeURIComponent(value)}/`
      );

      updateRow(rowIdx, {
        material: data.material_id,
        material_name: data.material_name,
        description: data.description,
        unit_price: toNumber(data.unit_price),
        currency: form.currency,
      });

      setCodeModal(null);
      toast.success("کالا انتخاب شد");
    } catch (error) {
      console.error("Fetch material by code error:", error);
      toast.error("کالا یافت نشد");
    }
  };

  const createMaterialQuick = async (payload) => {
    if (!canWriteCatalog) {
      toast.error(catalogDisabledReason);
      return;
    }

    try {
      const { data } = await axios.post(`${API}/services/api/v2/materials/`, payload);

      toast.success("کالا ساخته شد");

      if (pickerRowIndex != null) {
        selectMaterial(data);
      }

      setModal(null);
    } catch (error) {
      console.error("Quick material create error:", error.response?.data || error);
      toast.error("ساخت کالا ناموفق بود");
    }
  };

  const handleSellerChange = async (sellerId) => {
    setForm((prev) => ({ ...prev, seller_id: sellerId }));

    if (!sellerId) {
      setSellerPercent(0);
      return;
    }

    try {
      const { data } = await getAllPages(
        `${API}/incomes/api/${sellerId}/v2/sellers/percent/`
      );
      setSellerPercent(data.percent || 0);
    } catch (error) {
      console.error("Seller percent error:", error);
      setSellerPercent(0);
      toast.error("خطا در دریافت درصد فروشنده");
    }
  };

  const submitInvoice = async () => {
    if (!canWriteSales) {
      toast.error(salesDisabledReason);
      return;
    }

    if (!form.customer_id) return toast.error("مشتری را انتخاب کنید");
    if (!form.seller_id) return toast.error("فروشنده را انتخاب کنید");
    if (!form.warehouse) return toast.error(returned ? "انبار ورود را انتخاب کنید" : "انبار خروج را انتخاب کنید");

    if (items.length === 0 || !items.some((r) => r.material)) {
      return toast.error("حداقل یک ردیف کالا انتخاب کنید");
    }

    const payload = {
      code: Number(form.code || Date.now()),
      reference: form.reference || `${returned ? "SRET" : "INV"}-${Date.now()}`,
      title: form.title || (returned ? "فاکتور برگشت از فروش" : "فاکتور فروش"),
      date: `${form.date}T12:00:00`,
      expiry_date: form.expiry_date ? `${form.expiry_date}T12:00:00` : null,
      invoice_type: returned ? "مرجوع شده" : form.invoice_type,
      customer_name: Number(form.customer_id),
      currency: form.currency,
      seller: Number(form.seller_id),
      warehouse: Number(form.warehouse),
      discount_percent: toNumber(form.discount_percent),
      discount_price: discountValue,
      tax_percent: toNumber(form.tax_percent),
      tax_value: taxValue,
      total_amount: grandTotal,
      paid_amount: 0,
      payment_method: form.payment_method,
      description: form.description,
      shipping_cost: toNumber(form.shipping_cost),
      shipping_person: form.shipping_person ? Number(form.shipping_person) : null,
      additional_amount: toNumber(form.additional_amount),
      sign: null,
      city: form.city || "",
      get_returned: returned,
      items: items
        .filter((r) => r.material)
        .map((r) => ({
          material: r.material,
          quantity: toNumber(r.quantity),
          unit_price: toNumber(r.unit_price),
          discount_amount: toNumber(r.discount_amount),
          total_price: toNumber(r.total_price),
          created_by: "admin",
        })),
    };

    try {
      setSubmitting(true);

      await axios.post(
        returned
          ? `${API}/incomes/api/v2/returned_sales_invoices/`
          : `${API}/incomes/api/v2/sell_invoices/`,
        payload
      );

      toast.success(returned ? "فاکتور برگشت از فروش ثبت شد" : "فاکتور ثبت شد");
      navigate(returned ? "/sales/returns" : "/sales/list");
    } catch (error) {
      console.error("Submit sales invoice error:", error.response?.data || error);
      toast.error("ثبت فاکتور ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHero
        eyebrow={returned ? "فروش / برگشت از فروش" : "فروش / فاکتور جدید"}
        title={title}
        description={returned ? "ثبت برگشت فروش با کنترل ورود کالا، مبالغ و اثر حسابداری." : "ثبت سریع و دقیق فاکتور؛ اطلاعات اصلی، اقلام و جمع‌بندی مالی در یک جریان واحد."}
        icon={<FiFileText />}
        actions={<SecondaryButton type="button" onClick={() => navigate(returned ? "/sales/returns" : "/sales/list")}><FiArrowRight /> بازگشت به لیست</SecondaryButton>}
      />

      <StatGrid>
        <StatCard label="تعداد اقلام" value={items.length.toLocaleString("fa-IR")} hint="ردیف‌های فاکتور" icon={<FiPackage />} tone="info" />
        <StatCard label="جمع اقلام" value={`${formatMoney(subTotal)} ریال`} hint="قبل از تخفیف و مالیات" icon={<FiCreditCard />} />
        <StatCard label="تخفیف" value={`${formatMoney(discountValue)} ریال`} hint={`${Number(form.discount_percent || 0).toLocaleString("fa-IR")}٪ تخفیف درصدی`} icon={<FiPercent />} tone="warning" />
        <StatCard label="مبلغ نهایی" value={`${formatMoney(grandTotal)} ریال`} hint="مبلغ قابل ثبت" icon={<FiCreditCard />} tone="success" />
      </StatGrid>

      <div className={styles.formCard}>
        <div className={styles.sectionTitle}>
          <h3>اطلاعات اصلی فاکتور</h3>
          <span>{form.invoice_type}</span>
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

            <Field label="تاریخ">
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={pickerValueFromGregorian(form.date)}
                placeholder="تاریخ را انتخاب کنید"
                inputClass={styles.dateInput}
                onChange={(value) =>
                  setForm({
                    ...form,
                    date: gregorianFromPicker(value),
                  })
                }
              />
            </Field>

            <Field label="تاریخ سررسید">
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={pickerValueFromGregorian(form.expiry_date)}
                placeholder="تاریخ سررسید"
                inputClass={styles.dateInput}
                onChange={(value) =>
                  setForm({
                    ...form,
                    expiry_date: gregorianFromPicker(value),
                  })
                }
              />
            </Field>

            <Field label="عنوان" grow>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={returned ? "مثلاً فاکتور برگشت از فروش" : "مثلاً فاکتور فروش"}
              />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="مشتری *">
              <select
                value={form.customer_id}
                onChange={(e) =>
                  setForm({ ...form, customer_id: e.target.value })
                }
              >
                <option value="">انتخاب کنید...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ||
                      `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
                      "بدون نام"}{" "}
                    {c.code ? `(#${c.code})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="فروشنده *">
              <select
                value={form.seller_id}
                onChange={(e) => handleSellerChange(e.target.value)}
              >
                <option value="">انتخاب کنید...</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company ||
                      `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
                      "بدون نام"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={returned ? "انبار ورود *" : "انبار خروج *"}>
              <select
                value={form.warehouse}
                onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
              >
                <option value="">انتخاب کنید...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || `#${w.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="درصد فروشنده">
              <input type="number" value={sellerPercent} readOnly />
            </Field>

            <Field label="راننده">
              <select
                value={form.shipping_person}
                onChange={(e) =>
                  setForm({ ...form, shipping_person: e.target.value })
                }
              >
                <option value="">انتخاب کنید...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {`${d.first_name || ""} ${d.last_name || ""}`.trim() ||
                      d.company ||
                      "بدون نام"}
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

          <button type="button" className={styles.addItemBtn} onClick={addEmptyRow} {...salesWriteProps}>
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
                <th>واحد</th>
                <th>تعداد</th>
                <th>مبلغ واحد</th>
                <th>تخفیف</th>
                <th>مالیات</th>
                <th>مبلغ کل</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <div className={styles.emptyState}>
                      <strong>هنوز ردیفی اضافه نشده است</strong>
                      <p>برای شروع، روی افزودن ردیف کلیک کن.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => removeRow(idx)}
                        {...salesWriteProps}
                        title="حذف ردیف"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>

                    <td>{idx + 1}</td>

                    <td className={styles.cellGoods}>
                      {r.material ? (
                        <button
                          type="button"
                          className={styles.productNameBtn}
                          onClick={() => openPicker(idx)}
                          {...salesWriteProps}
                        >
                          {r.material_name}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.selectBtn}
                          onClick={() => openPicker(idx)}
                          {...salesWriteProps}
                        >
                          انتخاب کالا
                        </button>
                      )}

                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.plusBtn}
                          title={!canWriteCatalog ? catalogDisabledReason : "کالای جدید"}
                          onClick={() => setModal({ type: "quickItem", row: idx })}
                          {...catalogWriteProps}
                        >
                          <FaPlus />
                        </button>

                        <button
                          type="button"
                          className={styles.barcodeBtn}
                          title={!canWriteSales ? salesDisabledReason : "انتخاب با بارکد"}
                          onClick={() => setCodeModal({ type: "barcode", row: idx })}
                          {...salesWriteProps}
                        >
                          بارکد
                        </button>

                        <button
                          type="button"
                          className={styles.serialBtn}
                          title={!canWriteSales ? salesDisabledReason : "انتخاب با سریال"}
                          onClick={() => setCodeModal({ type: "serial", row: idx })}
                          {...salesWriteProps}
                        >
                          سریال
                        </button>
                      </div>
                    </td>

                    <td>
                      <input
                        value={r.description || ""}
                        onChange={(e) =>
                          updateRow(idx, { description: e.target.value })
                        }
                      />
                    </td>

                    <td>{r.currency || "-"}</td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={r.quantity}
                        onChange={(e) =>
                          updateRow(idx, { quantity: e.target.value })
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={r.unit_price}
                        onChange={(e) =>
                          updateRow(idx, { unit_price: e.target.value })
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={r.discount_amount}
                        onChange={(e) =>
                          updateRow(idx, { discount_amount: e.target.value })
                        }
                      />
                    </td>

                    <td className={styles.muted}>—</td>

                    <td>
                      <span className={styles.amountBadge}>
                        {formatMoney(r.total_price)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.quickActions}>
          <button type="button" onClick={() => setModal("notes")} {...salesWriteProps}>
            توضیحات
          </button>
          <button type="button" onClick={() => setModal("tax")} {...salesWriteProps}>
            مالیات
          </button>
          <button type="button" onClick={() => setModal("discount")} {...salesWriteProps}>
            تخفیف
          </button>
          <button type="button" onClick={() => setModal("shipping")} {...salesWriteProps}>
            حمل و نقل
          </button>
        </div>

        <div className={styles.totals}>
          <div>
            <span>جمع جزء</span>
            <b>{formatMoney(subTotal)}</b>
          </div>

          <div>
            <span>تخفیف</span>
            <b>{formatMoney(discountValue)}</b>
          </div>

          <div>
            <span>مالیات</span>
            <b>{formatMoney(taxValue)}</b>
          </div>

          <div>
            <span>حمل و نقل</span>
            <b>{formatMoney(form.shipping_cost)}</b>
          </div>

          <div className={styles.grand}>
            <span>مبلغ کل</span>
            <b>{formatMoney(grandTotal)}</b>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(returned ? "/sales/returns" : "/sales/list")}
            disabled={submitting}
          >
            انصراف
          </button>

          <button
            type="button"
            className={styles.primary}
            onClick={submitInvoice}
            disabled={submitting || !canWriteSales}
            title={!canWriteSales ? salesDisabledReason : undefined}
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
                <small>کالا را از لیست انتخاب کن</small>
              </div>

              <button type="button" onClick={() => setPickerOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.searchRow}>
                <div className={styles.modalSearch}>
                  <FaSearch />
                  <input
                    placeholder="جستجو..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchMaterials(pickerSearch);
                    }}
                  />
                </div>

                <button type="button" onClick={() => fetchMaterials(pickerSearch)}>
                  جستجو
                </button>
              </div>

              <div className={styles.list}>
                {loadingMaterials ? (
                  <div className={styles.emptyState}>در حال بارگذاری...</div>
                ) : materials.length === 0 ? (
                  <div className={styles.emptyState}>موردی یافت نشد</div>
                ) : (
                  <table className={styles.pickTable}>
                    <thead>
                      <tr>
                        <th>کد</th>
                        <th>نام</th>
                        <th>برند</th>
                        <th>دسته</th>
                        <th>قیمت فروش</th>
                        <th>انتخاب</th>
                      </tr>
                    </thead>

                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id}>
                          <td>{m.sku_code || "-"}</td>
                          <td>{m.persian_name || "-"}</td>
                          <td>{m.brand_name || m.material_brand_name || "-"}</td>
                          <td>
                            {m.category_name || m.material_category_name || "-"}
                          </td>
                          <td>{formatMoney(m.unit_selling_price)}</td>
                          <td>
                            <button
                              type="button"
                              className={styles.selectMaterialBtn}
                              onClick={() => selectMaterial(m)}
                              {...salesWriteProps}
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

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setModal({ type: "quickItem", row: pickerRowIndex })}
                {...catalogWriteProps}
              >
                <FaPlus />
                کالای جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "shipping" && (
        <ValueModal
          title="هزینه حمل و نقل"
          value={form.shipping_cost}
          onClose={() => setModal(null)}
          disabled={!canWriteSales}
          disabledReason={salesDisabledReason}
          onSave={(v) => {
            setForm({ ...form, shipping_cost: toNumber(v) });
            setModal(null);
          }}
        />
      )}

      {modal === "discount" && (
        <TwoFieldModal
          title="تخفیف فاکتور"
          labelA="درصد"
          labelB="مبلغ جدا از درصد"
          valueA={form.discount_percent}
          valueB={form.discount_price}
          onClose={() => setModal(null)}
          disabled={!canWriteSales}
          disabledReason={salesDisabledReason}
          onSave={(a, b) => {
            setForm({
              ...form,
              discount_percent: toNumber(a),
              discount_price: toNumber(b),
            });
            setModal(null);
          }}
        />
      )}

      {modal === "tax" && (
        <TwoFieldModal
          title="مالیات"
          labelA="درصد"
          labelB="مبلغ محاسبه‌شده"
          valueA={form.tax_percent}
          valueB={taxValue}
          readonlyB
          onClose={() => setModal(null)}
          disabled={!canWriteSales}
          disabledReason={salesDisabledReason}
          onSave={(a) => {
            setForm({ ...form, tax_percent: toNumber(a) });
            setModal(null);
          }}
        />
      )}

      {modal === "notes" && (
        <NotesModal
          title="توضیحات فاکتور"
          value={form.description}
          onClose={() => setModal(null)}
          disabled={!canWriteSales}
          disabledReason={salesDisabledReason}
          onSave={(t) => {
            setForm({ ...form, description: t });
            setModal(null);
          }}
        />
      )}

      {modal && typeof modal === "object" && modal.type === "quickItem" && (
        <QuickItemModal
          onClose={() => setModal(null)}
          disabled={!canWriteCatalog}
          disabledReason={catalogDisabledReason}
          onSave={(p) => createMaterialQuick(p)}
        />
      )}

      {codeModal && (
        <CodeModal
          type={codeModal.type}
          onClose={() => setCodeModal(null)}
          disabled={!canWriteSales}
          disabledReason={salesDisabledReason}
          onSave={(val) => fetchByCode(codeModal.type, val, codeModal.row)}
        />
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

function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <b>{title}</b>
            {subtitle && <small>{subtitle}</small>}
          </div>

          <button type="button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>
  );
}

function ValueModal({ title, value, onClose, onSave, disabled = false, disabledReason }) {
  const [v, setV] = useState(value ?? 0);

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <button type="button" onClick={() => onSave(v)} disabled={disabled} title={disabled ? disabledReason : undefined}>
          ثبت
        </button>
      }
    >
      <div className={styles.field}>
        <label>{title}</label>
        <input type="number" value={v} onChange={(e) => setV(e.target.value)} />
      </div>
    </ModalShell>
  );
}

function TwoFieldModal({
  title,
  labelA,
  labelB,
  valueA,
  valueB,
  onClose,
  onSave,
  readonlyB = false,
  disabled = false,
  disabledReason,
}) {
  const [a, setA] = useState(valueA ?? 0);
  const [b, setB] = useState(valueB ?? 0);

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <button type="button" onClick={() => onSave(a, b)} disabled={disabled} title={disabled ? disabledReason : undefined}>
          ثبت
        </button>
      }
    >
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>{labelA}</label>
          <input type="number" value={a} onChange={(e) => setA(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label>{labelB}</label>
          <input
            type="number"
            value={b}
            onChange={(e) => setB(e.target.value)}
            readOnly={readonlyB}
          />
        </div>
      </div>
    </ModalShell>
  );
}

function NotesModal({ title, value, onClose, onSave, disabled = false, disabledReason }) {
  const [t, setT] = useState(value || "");

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <button type="button" onClick={() => onSave(t)} disabled={disabled} title={disabled ? disabledReason : undefined}>
          ثبت
        </button>
      }
    >
      <div className={styles.field}>
        <label>متن توضیحات</label>
        <textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} />
      </div>
    </ModalShell>
  );
}

function QuickItemModal({ onClose, onSave, disabled = false, disabledReason }) {
  const [f, setF] = useState({
    persian_name: "",
    sku_code: "",
    barcode: "",
    unit_selling_price: 0,
    unit_buying_price: 0,
    main_currency: "ریال ایران",
  });

  return (
    <ModalShell
      title="کالای جدید"
      subtitle="ثبت سریع کالا برای استفاده در فاکتور"
      onClose={onClose}
      footer={
        <button type="button" onClick={() => onSave(f)} disabled={disabled} title={disabled ? disabledReason : undefined}>
          ثبت کالا
        </button>
      }
    >
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>نام</label>
          <input
            value={f.persian_name}
            onChange={(e) => setF({ ...f, persian_name: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label>کد SKU</label>
          <input
            value={f.sku_code}
            onChange={(e) => setF({ ...f, sku_code: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label>بارکد</label>
          <input
            value={f.barcode}
            onChange={(e) => setF({ ...f, barcode: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label>قیمت فروش</label>
          <input
            type="number"
            value={f.unit_selling_price}
            onChange={(e) =>
              setF({ ...f, unit_selling_price: e.target.value })
            }
          />
        </div>

        <div className={styles.field}>
          <label>قیمت خرید</label>
          <input
            type="number"
            value={f.unit_buying_price}
            onChange={(e) => setF({ ...f, unit_buying_price: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label>واحد پول</label>
          <select
            value={f.main_currency}
            onChange={(e) => setF({ ...f, main_currency: e.target.value })}
          >
            <option value="ریال ایران">ریال ایران</option>
            <option value="تومان">تومان</option>
            <option value="دلار آمریکا">دلار آمریکا</option>
            <option value="یورو">یورو</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

function CodeModal({ type, onClose, onSave, disabled = false, disabledReason }) {
  const [val, setVal] = useState("");
  const label = type === "barcode" ? "بارکد کالا" : "کد سریال کالا";

  return (
    <ModalShell
      title={label}
      onClose={onClose}
      footer={
        <button type="button" onClick={() => onSave(val)} disabled={disabled} title={disabled ? disabledReason : undefined}>
          جستجو
        </button>
      }
    >
      <div className={styles.field}>
        <label>{label}</label>
        <input
          placeholder={label}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}