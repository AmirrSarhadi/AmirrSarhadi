import useDialogFocus from "../../../hooks/useDialogFocus";
import PersianDateInput from "../../../components/PersianDateInput/PersianDateInput";
import { firstErrorMessage } from "../../../utils/formErrors";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiCreditCard, FiRotateCcw, FiX } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, DataPanel, StatusBadge, PrimaryButton, SecondaryButton, LoadingState } from "../../../components/ERP";
import { API_BASE_URL } from "../../../api/http";
import useModulePermission from "../../../hooks/useModulePermission";
import styles from "./Installments.module.css";

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const fmt = (v) => v ? new Date(`${v}T00:00:00`).toLocaleDateString("fa-IR") : "—";
const localISODate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const statusTone = (s) => s === "PAID" || s === "COMPLETED" ? "success" : s === "OVERDUE" || s === "CANCELLED" ? "danger" : s === "PARTIAL" ? "warning" : "info";

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useModulePermission("sales");
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [banks, setBanks] = useState([]);
  const [cashboxes, setCashboxes] = useState([]);
  const [imprests, setImprests] = useState([]);
  const [paying, setPaying] = useState(null);
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState({ amount: "", receiver_type: "bank", receiver_id: "", payment_date: localISODate(), reference: "", description: "" });

  const modalRef = useDialogFocus(Boolean(paying), () => { if (!working) setPaying(null); });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contractRes, receiversRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/incomes/api/v2/installment/contracts/${id}/`),
        axios.get(`${API_BASE_URL}/incomes/api/v2/installment/receivers/`),
      ]);
      setContract(contractRes.data);
      setBanks(receiversRes.data.bank); setCashboxes(receiversRes.data.cashbox); setImprests(receiversRes.data.imprest);
    } catch (err) { setError(firstErrorMessage(err.response?.data, "دریافت اطلاعات قرارداد انجام نشد.")); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const receivers = useMemo(() => form.receiver_type === "bank" ? banks : form.receiver_type === "cashbox" ? cashboxes : imprests, [form.receiver_type, banks, cashboxes, imprests]);

  const openPay = (item) => {
    setPaymentError("");
    setPaying(item);
    setForm({ request_key: crypto.randomUUID(), amount: item.remaining_amount, receiver_type: "bank", receiver_id: "", payment_date: localISODate(), reference: "", description: `وصول قسط ${item.sequence} قرارداد ${contract.contract_number}` });
  };

  const pay = async (e) => {
    e.preventDefault();
    if (working) return;
    setPaymentError("");
    setWorking(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/incomes/api/v2/installment/installments/${paying.id}/pay/`, { ...form, receiver_id: Number(form.receiver_id) });
      setContract(data.contract); setPaying(null); toast.success("وصول قسط با موفقیت ثبت شد.");
    } catch (err) { setPaymentError(firstErrorMessage(err.response?.data, "ثبت وصول انجام نشد.")); }
    finally { setWorking(false); }
  };

  const reversePayment = async (payment) => {
    if (!window.confirm("وصول انتخاب‌شده ابطال و سند حسابداری آن معکوس شود؟")) return;
    setWorking(true);
    try { await axios.post(`${API_BASE_URL}/incomes/api/v2/installment/payments/${payment.id}/reverse/`); toast.success("وصول ابطال شد."); await load(); }
    catch (err) { toast.error(err.response?.data?.error || "ابطال وصول انجام نشد."); }
    finally { setWorking(false); }
  };

  const cancel = async () => {
    if (!window.confirm("قرارداد لغو شود؟ فاکتور فروش حذف یا ابطال نمی‌شود.")) return;
    setWorking(true);
    try { const { data } = await axios.post(`${API_BASE_URL}/incomes/api/v2/installment/contracts/${id}/cancel/`); setContract(data); toast.success("قرارداد لغو شد."); }
    catch (err) { toast.error(err.response?.data?.error || "لغو قرارداد انجام نشد."); }
    finally { setWorking(false); }
  };

  if (loading) return <LoadingState title="در حال دریافت جزئیات قرارداد..." />;
  if (error || !contract) return <DataPanel title="دریافت قرارداد ناموفق بود"><p className={styles.error} role="alert">{error || "قرارداد پیدا نشد."}</p><SecondaryButton type="button" onClick={load}>تلاش مجدد</SecondaryButton></DataPanel>;

  return <div className={styles.page}>
    <PageHero eyebrow="فروش / اقساط / جزئیات" title={`قرارداد #${contract.contract_number}`} description={`${contract.customer_name} · فاکتور فروش ${contract.invoice_code}`} icon={<FiCalendar />} meta={<div className={styles.contractMeta}><span className={styles.pill}>تاریخ قرارداد: {fmt(contract.contract_date)}</span><span className={styles.pill}>فاصله اقساط: هر {Number(contract.interval_months).toLocaleString("fa-IR")} ماه</span></div>} actions={<><SecondaryButton type="button" onClick={() => navigate("/sales/installment/contracts")}>بازگشت</SecondaryButton>{canWrite && contract.status === "ACTIVE" ? <SecondaryButton type="button" onClick={cancel} disabled={working}>لغو قرارداد</SecondaryButton> : null}</>} />
    <StatGrid>
      <StatCard label="مبلغ تقسیط" value={`${money(contract.financed_amount)} ریال`} icon={<FiCreditCard />} />
      <StatCard label="وصول اقساط" value={`${money(contract.paid_amount)} ریال`} icon={<FiCheckCircle />} tone="success" />
      <StatCard label="مانده قرارداد" value={`${money(contract.remaining_amount)} ریال`} icon={<FiCreditCard />} tone="warning" />
      <StatCard label="اقساط معوق" value={Number(contract.overdue_count || 0).toLocaleString("fa-IR")} icon={<FiAlertTriangle />} tone={Number(contract.overdue_count) ? "danger" : "info"} />
    </StatGrid>

    <DataPanel title="برنامه اقساط" description={`${Number(contract.installment_count).toLocaleString("fa-IR")} قسط · اولین سررسید ${fmt(contract.first_due_date)}`} actions={<StatusBadge status={contract.status} tone={statusTone(contract.status)}>{contract.status_label}</StatusBadge>}>
      <div className={styles.schedule}>{contract.installments.map((item) => <div key={item.id} className={styles.scheduleCard}>
        <div className={styles.scheduleHead}>
          <div className={styles.sequence}>{Number(item.sequence).toLocaleString("fa-IR")}</div>
          <div><div className={styles.muted}>سررسید</div><strong>{fmt(item.due_date)}</strong>{item.display_status === "OVERDUE" ? <div className={styles.overdue}>{Number(item.days_overdue).toLocaleString("fa-IR")} روز تأخیر</div> : null}</div>
          <div><div className={styles.muted}>مبلغ قسط</div><strong className={styles.money}>{money(item.amount)} ریال</strong></div>
          <div><div className={styles.muted}>مانده</div><strong className={styles.money}>{money(item.remaining_amount)} ریال</strong></div>
          <div className={styles.actions}><StatusBadge status={item.display_status} tone={statusTone(item.display_status)}>{item.status_label}</StatusBadge>{canWrite && contract.status === "ACTIVE" && Number(item.remaining_amount) > 0 ? <PrimaryButton type="button" onClick={() => openPay(item)}>ثبت وصول</PrimaryButton> : null}</div>
        </div>
        {item.payments?.length ? <div className={styles.paymentHistory}>{item.payments.map((payment) => <div className={styles.paymentRow} key={payment.id}><div><strong>{money(payment.amount)} ریال</strong><div className={styles.paymentMeta}><span>{fmt(payment.payment_date)}</span><span>{payment.receiver_type_label || payment.receiver_type}</span><span>{payment.receiver_name || "—"}</span>{payment.reference ? <span>ارجاع: {payment.reference}</span> : null}</div></div><div className={styles.actions}>{payment.is_reversed ? <StatusBadge tone="danger">ابطال شده</StatusBadge> : <StatusBadge tone="success">ثبت شده</StatusBadge>}{canWrite && !payment.is_reversed ? <button type="button" className={`${styles.linkButton} ${styles.dangerButton}`} onClick={() => reversePayment(payment)} disabled={working}><FiRotateCcw /> ابطال</button> : null}</div></div>)}</div> : null}
      </div>)}</div>
    </DataPanel>

    {paying ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => { if (!working && e.target === e.currentTarget) setPaying(null); }}><form ref={modalRef} className={styles.modal} onSubmit={pay} role="dialog" aria-modal="true" aria-label="ثبت وصول قسط"><div className={styles.modalHeader}><h3>وصول قسط {Number(paying.sequence).toLocaleString("fa-IR")}</h3><button type="button" className={styles.linkButton} disabled={working} onClick={() => setPaying(null)} aria-label="بستن"><FiX /></button></div><div className={styles.modalBody}>{paymentError ? <p className={styles.error} role="alert">{paymentError}</p> : null}<fieldset disabled={working} className={styles.formFieldset}><div className={styles.formGrid}><div className={styles.field}><label htmlFor="receipt-amount">مبلغ وصول *</label><input id="receipt-amount" type="number" min="0.01" step="0.01" max={paying.remaining_amount} value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} required /><small>مانده قسط: {money(paying.remaining_amount)} ریال</small></div><div className={styles.field}><label htmlFor="receipt-date">تاریخ وصول *</label><PersianDateInput id="receipt-date" value={form.payment_date} onChange={(value) => setForm((s) => ({ ...s, payment_date: value }))} required disabled={working} /></div><div className={styles.field}><label htmlFor="receipt-receiver-type">نوع مقصد *</label><select id="receipt-receiver-type" value={form.receiver_type} onChange={(e) => setForm((s) => ({ ...s, receiver_type: e.target.value, receiver_id: "" }))}><option value="bank">بانک</option><option value="cashbox">صندوق</option><option value="imprest">تنخواه‌گردان</option></select></div><div className={styles.field}><label htmlFor="receipt-receiver-id">مقصد دریافت *</label><select id="receipt-receiver-id" value={form.receiver_id} onChange={(e) => setForm((s) => ({ ...s, receiver_id: e.target.value }))} required><option value="">انتخاب مقصد</option>{receivers.map((r) => <option value={r.id} key={r.id}>{r.name || r.title || `#${r.id}`}</option>)}</select></div><div className={styles.field}><label htmlFor="receipt-reference">شماره ارجاع</label><input id="receipt-reference" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} /></div><div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="receipt-description">شرح</label><textarea id="receipt-description" rows="3" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></div></div></fieldset></div><div className={styles.modalActions}><SecondaryButton type="button" disabled={working} onClick={() => setPaying(null)}>انصراف</SecondaryButton><PrimaryButton type="submit" disabled={working || !form.receiver_id}>{working ? "در حال ثبت..." : "ثبت وصول و سند حسابداری"}</PrimaryButton></div></form></div> : null}
  </div>;
}
