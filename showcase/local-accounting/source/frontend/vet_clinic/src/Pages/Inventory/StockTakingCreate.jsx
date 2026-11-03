import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import styles from "./StockTaking.module.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  FaArrowRight,
  FaSave,
  FaSyncAlt,
  FaTrashAlt,
  FaBarcode,
  FaFileExcel,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import useModulePermission from "../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;
const DETAIL_API = (id) => `${API_BASE}/warehousing/api/${id}/v2/stocktakings/`;
const REFRESH_API = (id) =>
  `${API_BASE}/warehousing/api/${id}/v2/stocktakings/refresh-initial/`;
const FINISH_API = (id) =>
  `${API_BASE}/warehousing/api/${id}/v2/stocktakings/finish/`;

export default function StockTakingCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite, disabledReason } = useModulePermission("warehousing");

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isFinished = form?.status === "پایان یافته";
  const isReadOnly = isFinished || !canWrite;

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }

    if (isFinished) {
      toast.info("این انبارگردانی پایان یافته و قابل تغییر نیست.");
      return true;
    }

    return false;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(DETAIL_API(id));

      setForm({
        id: data.id,
        accounting_document: data.accounting_document || "",
        number: data.number || "",
        date: data.date || "",
        warehouse: data.warehouse,
        warehouse_name: data.warehouse_name || "",
        description: data.description || "",
        operator: data.operator || "",
        status: data.status || "در جریان دارد",
      });

      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت اطلاعات انبارگردانی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const updateItem = (index, field, value) => {
    if (guardWrite()) return;

    setItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      const finalQty = Number(updated[index].final_qty || 0);
      const initialQty = Number(updated[index].initial_qty || 0);

      if (field === "final_qty" || field === "initial_qty") {
        updated[index].difference = finalQty - initialQty;
      }

      return updated;
    });
  };

  const removeRows = (mode) => {
    if (guardWrite()) return;

    if (mode === "all") {
      setItems([]);
      return;
    }

    setItems((prev) =>
      prev.filter((item) => {
        if (mode === "no_initial") return Number(item.initial_qty || 0) !== 0;
        if (mode === "no_price") return Number(item.unit_price || 0) !== 0;
        if (mode === "no_final") return item.final_qty !== null && item.final_qty !== "";
        return true;
      })
    );
  };

  const saveStockTaking = async () => {
    if (guardWrite()) return false;

    if (!form.number) {
      toast.error("شماره الزامی است");
      return false;
    }

    if (!form.date) {
      toast.error("تاریخ الزامی است");
      return false;
    }

    if (!form.operator.trim()) {
      toast.error("متصدی الزامی است");
      return false;
    }

    const payload = {
      accounting_document: form.accounting_document || "",
      number: Number(form.number),
      date: form.date,
      warehouse: Number(form.warehouse),
      description: form.description || "",
      operator: form.operator.trim(),
      status: form.status,
      items: items.map((item) => ({
        id: item.id,
        material: item.material,
        material_name: item.material_name,
        category_name: item.category_name || "",
        barcode: item.barcode || "",
        material_code: item.material_code || "",
        unit: item.unit || "",
        initial_qty: Number(item.initial_qty || 0),
        unit_price: Number(item.unit_price || 0),
        count_1: item.count_1 === "" || item.count_1 === null ? null : Number(item.count_1),
        count_2: item.count_2 === "" || item.count_2 === null ? null : Number(item.count_2),
        count_3: item.count_3 === "" || item.count_3 === null ? null : Number(item.count_3),
        final_qty: item.final_qty === "" || item.final_qty === null ? null : Number(item.final_qty),
        difference: Number(item.difference || 0),
      })),
    };

    try {
      setSaving(true);
      const { data } = await axios.put(DETAIL_API(id), payload);
      toast.success("اطلاعات ذخیره شد");
      setItems(data.items || items);
      return true;
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("ذخیره اطلاعات انجام نشد");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const refreshInitial = async () => {
    if (guardWrite()) return;

    if (!window.confirm("موجودی اولیه بر اساس آخرین تغییرات انجام شده در انبار به‌روز خواهد شد. آیا مطمئن هستید؟")) {
      return;
    }

    try {
      await axios.post(REFRESH_API(id));
      toast.success("موجودی اولیه بروزرسانی شد");
      fetchData();
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("بروزرسانی موجودی اولیه انجام نشد");
    }
  };

  const finishStockTaking = async () => {
    if (guardWrite()) return;

    if (!window.confirm("با پایان انبارگردانی، موجودی کالاهای دارای موجودی نهایی بروزرسانی می‌شود. ادامه می‌دهید؟")) {
      return;
    }

    try {
      const saved = await saveStockTaking();
      if (!saved) return;

      await axios.post(FINISH_API(id));
      toast.success("انبارگردانی پایان یافت");
      fetchData();
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("پایان انبارگردانی انجام نشد");
    }
  };

  const searchBarcode = () => {
    const code = barcode.trim();
    if (!code) return;

    const index = items.findIndex(
      (item) =>
        String(item.barcode || "") === code ||
        String(item.material_code || "") === code
    );

    if (index === -1) {
      toast.error("کالایی با این بارکد یا کد کالا پیدا نشد");
      return;
    }

    const el = document.getElementById(`stocktaking-row-${items[index].id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add(styles.highlightRow);
    setTimeout(() => el?.classList.remove(styles.highlightRow), 1400);
  };

  const exportExcel = () => {
    const data = items.map((item, index) => ({
      ردیف: index + 1,
      کالا: item.material_name,
      دسته_بندی: item.category_name,
      بارکد: item.barcode,
      کد_کالا: item.material_code,
      واحد: item.unit,
      موجودی_اولیه: item.initial_qty,
      مبلغ_واحد: item.unit_price,
      شمارش_1: item.count_1,
      شمارش_2: item.count_2,
      شمارش_3: item.count_3,
      موجودی_نهایی: item.final_qty,
      تفاوت: item.difference,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "StockTaking");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `stocktaking-${form?.number || id}.xlsx`);
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.initial += Number(item.initial_qty || 0);
        acc.final += Number(item.final_qty || 0);
        acc.diff += Number(item.difference || 0);
        return acc;
      },
      { initial: 0, final: 0, diff: 0 }
    );
  }, [items]);

  if (loading || !form) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <div>
          <h3>ثبت انبارگردانی</h3>
          <p>ثبت شمارش کالاها و بروزرسانی موجودی نهایی انبار</p>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/inventory/stocktaking")}
        >
          <FaArrowRight />
          بازگشت
        </button>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label>سند حسابداری</label>
          <input
            disabled={isReadOnly}
            value={form.accounting_document}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, accounting_document: e.target.value }))
            }
          />
        </div>

        <div className={styles.formField}>
          <label>شماره</label>
          <input
            disabled={isReadOnly}
            type="number"
            value={form.number}
            onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
          />
        </div>

        <div className={styles.formField}>
          <label>تاریخ</label>
          <DatePicker
            disabled={isReadOnly}
            calendar={persian}
            locale={persian_fa}
            value={form.date}
            onChange={(dateObj) =>
              setForm((prev) => ({
                ...prev,
                date: dateObj ? dateObj.format("YYYY-MM-DD") : "",
              }))
            }
            format="YYYY/MM/DD"
            inputClass={styles.dateInput}
            calendarPosition="bottom-right"
          />
        </div>

        <div className={styles.formField}>
          <label>انبار</label>
          <input disabled value={form.warehouse_name} />
        </div>

        <div className={styles.formField}>
          <label>متصدی</label>
          <input
            disabled={isReadOnly}
            value={form.operator}
            onChange={(e) => setForm((prev) => ({ ...prev, operator: e.target.value }))}
          />
        </div>

        <div className={`${styles.formField} ${styles.fullWidth}`}>
          <label>توضیحات</label>
          <textarea
            disabled={isReadOnly}
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>موجودی اولیه کل</span>
          <strong>{totals.initial.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>موجودی نهایی کل</span>
          <strong>{totals.final.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>تفاوت کل</span>
          <strong>{totals.diff.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>وضعیت</span>
          <strong>{form.status}</strong>
        </div>
      </div>

      <div className={styles.actionBar}>
        <button
          type="button"
          className={styles.lightBtn}
          onClick={refreshInitial}
          disabled={isReadOnly}
          title={!canWrite ? disabledReason : undefined}
        >
          <FaSyncAlt />
          بروزرسانی موجودی اولیه
        </button>

        <select
          disabled={isReadOnly}
          title={!canWrite ? disabledReason : undefined}
          className={styles.removeSelect}
          onChange={(e) => {
            if (e.target.value) {
              removeRows(e.target.value);
              e.target.value = "";
            }
          }}
        >
          <option value="">حذف ردیف‌ها</option>
          <option value="all">تمام ردیف‌ها</option>
          <option value="no_initial">بدون موجودی اولیه</option>
          <option value="no_price">بدون مبلغ واحد</option>
          <option value="no_final">بدون موجودی نهایی</option>
        </select>

        <div className={styles.barcodeBox}>
          <FaBarcode />
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="بارکد یا کد کالا..."
            onKeyDown={(e) => {
              if (e.key === "Enter") searchBarcode();
            }}
          />
          <button type="button" onClick={searchBarcode}>
            جستجو
          </button>
        </div>

        <button type="button" className={styles.excelBtn} onClick={exportExcel}>
          <FaFileExcel />
          اکسل
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>کالا</th>
              <th>دسته‌بندی</th>
              <th>بارکد</th>
              <th>کد کالا</th>
              <th>واحد</th>
              <th>موجودی اولیه</th>
              <th>مبلغ واحد</th>
              <th>شمارش ۱</th>
              <th>شمارش ۲</th>
              <th>شمارش ۳</th>
              <th>موجودی نهایی</th>
              <th>تفاوت</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="13">
                  <div className={styles.emptyState}>ردیفی برای نمایش وجود ندارد</div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr id={`stocktaking-row-${item.id}`} key={item.id || index}>
                  <td>{index + 1}</td>
                  <td className={styles.nameCell}>{item.material_name}</td>
                  <td>{item.category_name || "—"}</td>
                  <td>{item.barcode || "—"}</td>
                  <td>
                    <code className={styles.code}>{item.material_code || "—"}</code>
                  </td>
                  <td>{item.unit || "—"}</td>
                  <td>{Number(item.initial_qty || 0).toLocaleString("fa-IR")}</td>
                  <td>{Number(item.unit_price || 0).toLocaleString("fa-IR")}</td>

                  <td>
                    <input
                      disabled={isReadOnly}
                      className={styles.tableInput}
                      type="number"
                      value={item.count_1 ?? ""}
                      onChange={(e) => updateItem(index, "count_1", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      disabled={isReadOnly}
                      className={styles.tableInput}
                      type="number"
                      value={item.count_2 ?? ""}
                      onChange={(e) => updateItem(index, "count_2", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      disabled={isReadOnly}
                      className={styles.tableInput}
                      type="number"
                      value={item.count_3 ?? ""}
                      onChange={(e) => updateItem(index, "count_3", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      disabled={isReadOnly}
                      className={styles.tableInput}
                      type="number"
                      value={item.final_qty ?? ""}
                      onChange={(e) => updateItem(index, "final_qty", e.target.value)}
                    />
                  </td>

                  <td
                    className={
                      Number(item.difference || 0) < 0
                        ? styles.negative
                        : Number(item.difference || 0) > 0
                          ? styles.positive
                          : ""
                    }
                  >
                    {Number(item.difference || 0).toLocaleString("fa-IR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => navigate("/inventory/stocktaking")}
        >
          انصراف
        </button>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={saveStockTaking}
          disabled={saving || isReadOnly}
          title={!canWrite ? disabledReason : undefined}
        >
          <FaSave />
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </button>

        <button
          type="button"
          className={styles.finishBtn}
          onClick={finishStockTaking}
          disabled={saving || isReadOnly}
          title={!canWrite ? disabledReason : undefined}
        >
          <FaCheckCircle />
          پایان انبارگردانی
        </button>
      </div>
    </div>
  );
}