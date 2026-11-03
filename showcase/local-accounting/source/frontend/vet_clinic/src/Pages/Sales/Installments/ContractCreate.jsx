import { getAllPages } from "../../../api/lists";
import { firstErrorMessage } from "../../../utils/formErrors";
import { buildInstallmentPreview } from "../../../utils/installmentPreview";
import PersianDateInput from "../../../components/PersianDateInput/PersianDateInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiCalendar, FiCreditCard, FiFileText, FiLayers } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, DataPanel, PrimaryButton, SecondaryButton, LoadingState, EmptyState } from "../../../components/ERP";
import { API_BASE_URL } from "../../../api/http";
import styles from "./Installments.module.css";

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const localISODate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ContractCreate() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    return {
      invoice_id: "",
      contract_date: localISODate(),
      first_due_date: localISODate(due),
      installment_count: 6,
      interval_months: 1,
      notes: "",
    };
  });

  const load = useCallback(() => {
    setLoading(true); setLoadError("");
    getAllPages(`${API_BASE_URL}/incomes/api/v2/installment/eligible-invoices/`)
      .then((res) => setInvoices(res.data))
      .catch((err) => setLoadError(firstErrorMessage(err.response?.data, "دریافت فاکتورهای قابل تقسیط انجام نشد.")))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = useMemo(
    () => invoices.find((item) => String(item.id) === String(form.invoice_id)),
    [invoices, form.invoice_id]
  );
  const financed = Number(selected?.remaining_amount || 0);
  const count = Math.max(1, Number(form.installment_count || 1));
  const approx = financed / count;
  const preview = useMemo(() => buildInstallmentPreview(financed, form.installment_count, form.first_due_date, form.interval_months), [financed, form.installment_count, form.first_due_date, form.interval_months]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const validation = {};
    if (!form.invoice_id) validation.invoice_id = "فاکتور فروش را انتخاب کنید.";
    if (!form.contract_date) validation.contract_date = "تاریخ قرارداد را انتخاب کنید.";
    if (!form.first_due_date) validation.first_due_date = "سررسید اولین قسط را انتخاب کنید.";
    if (form.first_due_date < form.contract_date) validation.first_due_date = "سررسید نمی‌تواند قبل از تاریخ قرارداد باشد.";
    if (!preview.length) validation.installment_count = "مبلغ مانده یا تعداد اقساط معتبر نیست.";
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/incomes/api/v2/installment/contracts/`, {
        ...form,
        invoice_id: Number(form.invoice_id),
        installment_count: Number(form.installment_count),
        interval_months: Number(form.interval_months),
      });
      toast.success("قرارداد اقساطی با موفقیت ثبت شد.");
      navigate(`/sales/installment/contracts/${data.id}`);
    } catch (err) {
      setErrors(err.response?.data || { error: "ثبت قرارداد انجام نشد." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState title="در حال دریافت فاکتورهای قابل تقسیط..." />;
  if (loadError) return <DataPanel title="دریافت اطلاعات ناموفق بود"><p role="alert" className={styles.error}>{loadError}</p><SecondaryButton type="button" onClick={load}>تلاش مجدد</SecondaryButton></DataPanel>;

  return (
    <div className={styles.page}>
      <PageHero
        eyebrow="فروش / قرارداد اقساطی"
        title="قرارداد فروش اقساطی جدید"
        description="مانده یک فاکتور فروش تأییدشده را به برنامه سررسید اقساط تبدیل کنید. ثبت فروش مجدد انجام نمی‌شود."
        icon={<FiFileText />}
        actions={<SecondaryButton type="button" onClick={() => navigate("/sales/installment/contracts")}>بازگشت به قراردادها</SecondaryButton>}
      />

      <StatGrid>
        <StatCard label="فاکتورهای قابل تقسیط" value={invoices.length.toLocaleString("fa-IR")} icon={<FiFileText />} />
        <StatCard label="مانده قابل تقسیط" value={`${money(financed)} ریال`} icon={<FiCreditCard />} tone="info" />
        <StatCard label="تعداد اقساط" value={count.toLocaleString("fa-IR")} icon={<FiLayers />} tone="warning" />
        <StatCard label="مبلغ تقریبی هر قسط" value={`${money(approx)} ریال`} icon={<FiCalendar />} tone="success" />
      </StatGrid>

      {invoices.length === 0 ? (
        <EmptyState title="فاکتور قابل تقسیط وجود ندارد" description="فاکتور باید تأیید شده، دارای مانده و بدون قرارداد اقساطی قبلی باشد." />
      ) : (
        <form className={styles.grid} onSubmit={submit}>
          <DataPanel title="اطلاعات قرارداد" description="فاکتور، تاریخ قرارداد و الگوی سررسیدها را مشخص کنید.">
            {Object.keys(errors).length ? <p role="alert" className={styles.error}>{firstErrorMessage(errors)}</p> : null}
            <fieldset disabled={saving} className={styles.formFieldset}><div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label htmlFor="contract-invoice">فاکتور فروش *</label>
                <select id="contract-invoice" value={form.invoice_id} onChange={(e) => setForm((s) => ({ ...s, invoice_id: e.target.value }))} required>
                  <option value="">انتخاب فاکتور</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      فاکتور {invoice.code} — {invoice.customer_name} — مانده {money(invoice.remaining_amount)} ریال
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}><label htmlFor="contract-contract_date">تاریخ قرارداد *</label><PersianDateInput id="contract-contract_date" value={form.contract_date} onChange={(value) => setForm((s) => ({ ...s, contract_date: value }))} required disabled={saving} /></div>
              <div className={styles.field}><label htmlFor="contract-first_due_date">اولین سررسید *</label><PersianDateInput id="contract-first_due_date" value={form.first_due_date} onChange={(value) => setForm((s) => ({ ...s, first_due_date: value }))} required disabled={saving} /></div>
              <div className={styles.field}><label htmlFor="contract-count">تعداد اقساط *</label><input id="contract-count" type="number" min="1" max="120" value={form.installment_count} onChange={(e) => setForm((s) => ({ ...s, installment_count: e.target.value }))} required /></div>
              <div className={styles.field}><label htmlFor="contract-interval">فاصله اقساط (ماه) *</label><input id="contract-interval" type="number" min="1" max="24" value={form.interval_months} onChange={(e) => setForm((s) => ({ ...s, interval_months: e.target.value }))} required /></div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="contract-notes">توضیحات</label><textarea id="contract-notes" rows="4" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="شرایط یا توضیحات قرارداد..." /></div>
            </div></fieldset>
          </DataPanel>

          <div className={styles.sticky}>
            <DataPanel title="خلاصه قرارداد" description="مبالغ از فاکتور فروش خوانده می‌شوند و قابل دستکاری نیستند.">
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}><span>مبلغ فاکتور</span><strong>{money(selected?.total_amount)} ریال</strong></div>
                <div className={styles.summaryRow}><span>دریافت قبلی</span><strong>{money(selected?.paid_amount)} ریال</strong></div>
                <div className={styles.summaryRow}><span>مبلغ تأمین مالی</span><strong>{money(financed)} ریال</strong></div>
                <div className={styles.summaryRow}><span>تعداد اقساط</span><strong>{count.toLocaleString("fa-IR")}</strong></div>
                <div className={styles.summaryRow}><span>قسط تقریبی</span><strong>{money(approx)} ریال</strong></div>
              </div>
              {preview.length ? <div className={styles.preview}><h3>پیش‌نمایش دقیق اقساط</h3><table className={styles.table} style={{ minWidth: 0 }}><thead><tr><th>قسط</th><th>سررسید</th><th>مبلغ (ریال)</th></tr></thead><tbody>{preview.map((row) => <tr key={row.sequence}><td>{row.sequence.toLocaleString("fa-IR")}</td><td>{new Date(`${row.dueDate}T00:00:00`).toLocaleDateString("fa-IR")}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div> : null}
              <PrimaryButton type="submit" disabled={saving || !selected || !preview.length} style={{ width: "100%", marginTop: 16 }}>
                {saving ? "در حال ثبت..." : "ثبت قرارداد و ایجاد برنامه اقساط"}
              </PrimaryButton>
            </DataPanel>
          </div>
        </form>
      )}
    </div>
  );
}
