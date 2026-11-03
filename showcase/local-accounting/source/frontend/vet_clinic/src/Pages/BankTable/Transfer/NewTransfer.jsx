import { API_BASE_URL } from "../../../api/http";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import styles from "./NewTransfer.module.css";
import useModulePermission from "../../../hooks/useModulePermission";
import { FiRepeat, FiArrowUpRight, FiArrowDownLeft, FiInfo } from "react-icons/fi";
import { PageHero, StatGrid, StatCard } from "../../../components/ERP";

export default function NewTransfer() {
  const { canWrite, disabledReason } = useModulePermission("banking");

  const guardWrite = () => {
    if (!canWrite) {
      alert(disabledReason);
      return true;
    }
    return false;
  };

  const initialBankForm = {
    account: "",
    name: "",
    branch_name: "", // ⚠️ اضافه شد — unique=True
    account_number: "",
    card_number: "",
    shaba: "",
    account_owner_name: "",
    pos_number: "",
    currency: "IRR",
    description: "",
    phone_number: "",
    switch_number: "",
    terminal_number: "",
    receiver_number: "",
  };

  const initialCashboxForm = {
    account: "",
    name: "",
    is_active: true,
    currency: "IRR",
    account_balance: 0,
    description: "",
    switch_number: "",
    terminal_number: "",
    receiver_number: "",
  };

  const initialImprestForm = {
    account: "",
    name: "",
    is_active: true,
    currency: "IRR",
    account_balance: 0,
    description: "",
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEntityType, setModalEntityType] = useState(null); // 'Bank', 'CashBox', 'Imprest'

  const [banks, setBanks] = useState([]);
  const [cashboxes, setCashboxes] = useState([]);
  const [imprests, setImprests] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashboxAccounts, setCashboxAccounts] = useState([]);
  const [imprestAccounts, setImprestAccounts] = useState([]);

  const handleImprestChange = (e) => {
    const { name, value } = e.target;
    setImprestForm((prev) => ({ ...prev, [name]: value }));
  };

  const [formData, setFormData] = useState({
    trans_number: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    sender_type: "Bank",
    sender_id: "",
    referral_number_from: "",
    bank_fees_from: 0,
    receiver_type: "Bank",
    receiver_id: "",
    referral_number_to: "",
    bank_fees_to: 0,
    amount: "",
  });

  // --- Load dropdowns ---
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [
          banksRes, cashboxesRes, imprestsRes,
          bankAccountsRes, cashboxAccountsRes, imprestAccountsRes,
        ] = await Promise.all([
          axios.get(`${API_BASE_URL}/banking/api/v2/banks/`),
          axios.get(`${API_BASE_URL}/banking/api/v2/cashboxes/`),
          axios.get(`${API_BASE_URL}/banking/api/v2/imprests/`),
          axios.get(`${API_BASE_URL}/accounting/api/v2/accounts/?is_bank_account=true&is_postable=true`),
          axios.get(`${API_BASE_URL}/accounting/api/v2/accounts/?is_cashbox_account=true&is_postable=true`),
          axios.get(`${API_BASE_URL}/accounting/api/v2/accounts/?is_imprest_account=true&is_postable=true`),
        ]);

        setBanks(
          Array.isArray(banksRes.data)
            ? banksRes.data
            : banksRes.data.results || []
        );
        setCashboxes(
          Array.isArray(cashboxesRes.data)
            ? cashboxesRes.data
            : cashboxesRes.data.results || []
        );
        setImprests(
          Array.isArray(imprestsRes.data)
            ? imprestsRes.data
            : imprestsRes.data.results || []
        );
        setBankAccounts(Array.isArray(bankAccountsRes.data) ? bankAccountsRes.data : bankAccountsRes.data.results || []);
        setCashboxAccounts(Array.isArray(cashboxAccountsRes.data) ? cashboxAccountsRes.data : cashboxAccountsRes.data.results || []);
        setImprestAccounts(Array.isArray(imprestAccountsRes.data) ? imprestAccountsRes.data : imprestAccountsRes.data.results || []);
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      }
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto"; // تمیز کردن در حالت عدم بازی
    };
  }, [isModalOpen]);

  const onChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreateModal = (type) => {
    if (guardWrite()) return;
    setModalEntityType(type);
    setIsModalOpen(true);
  };

  const optionsFor = (type) => {
    let list = [];
    if (type === "Bank") list = banks;
    if (type === "CashBox") list = cashboxes;
    if (type === "Imprest") list = imprests;
    if (!Array.isArray(list)) return null;

    return list.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}{" "}
        {item.account_code ? `- ${item.account_code}` : ""}
      </option>
    ));
  };

  const summary = useMemo(() => {
    const amt = Number(formData.amount || 0);
    const feeFrom = Number(formData.bank_fees_from || 0);
    const feeTo = Number(formData.bank_fees_to || 0);
    return {
      deductedFromSender: amt + feeFrom,
      creditedToReceiver: Math.max(amt - feeTo, 0),
    };
  }, [formData.amount, formData.bank_fees_from, formData.bank_fees_to]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (guardWrite()) return;

    // ✅ تبدیل داده‌ها به فرمت سازگار با backend فعلی
    const payload = {
      ...formData,
      amount: Number(formData.amount), // ✅ تبدیل به عدد
      bank_fees_from: Number(formData.bank_fees_from), // ✅ فقط از مبدأ
      bank_fees_to: Number(formData.bank_fees_to), // ✅ فقط از مبدأ
      referral_number_from: formData.referral_number_from || null, // ✅ فقط از مبدأ
      referral_number_to: formData.referral_number_to || null, // ✅ فقط از مبدأ
      sender_type: formData.sender_type.toLowerCase(), // ✅ حروف کوچک
      receiver_type: formData.receiver_type.toLowerCase(), // ✅ حروف کوچک
    };

    console.log("داده‌های ارسالی (اصلاح شده برای backend):", payload);

    try {
      await axios.post(
        `${API_BASE_URL}/banking/api/v2/transaction_list/create/`,
        payload
      );
      alert("✅ انتقال با موفقیت ثبت شد");
      setFormData((prev) => ({
        ...prev,
        trans_number: "",
        amount: "",
        bank_fees_from: 0,
        bank_fees_to: 0,
        referral_number_from: "",
        referral_number_to: "",
        description: "",
      }));
    } catch (err) {
      console.error("Error submitting transfer:", err);
      if (err.response) {
        console.error("❌ Server validation errors:", err.response.data);
        if (err.response.data.error) {
          alert(`❌ خطا: ${err.response.data.error}`);
        } else {
          alert(`❌ خطا: ${JSON.stringify(err.response.data, null, 2)}`);
        }
      } else {
        alert("❌ ارتباط با سرور برقرار نشد");
      }
    }
  };

  // ============ FORM STATES ============
  const [bankForm, setBankForm] = useState(initialBankForm);
  const [cashboxForm, setCashboxForm] = useState(initialCashboxForm);
  const [imprestForm, setImprestForm] = useState(initialImprestForm);

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCashboxChange = (e) => {
    const { name, value } = e.target;

    const numericFields = [
      "account",
      "account_balance",
      "switch_number",
      "terminal_number",
      "receiver_number",
    ];

    const newValue = numericFields.includes(name)
      ? value === ""
        ? ""
        : Number(value)
      : value;

    setCashboxForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // ============ CREATE HANDLERS ============
  const createBank = async () => {
    if (guardWrite()) return;

    try {
      console.log("Submitting bank data:", bankForm);
      await axios.post(
        `${API_BASE_URL}/banking/api/v2/bank_list/`,
        {
          ...bankForm,
          account: Number(bankForm.account),
          account_number: String(bankForm.account_number || "").trim(),
          card_number: String(bankForm.card_number || "").trim(),
          shaba: String(bankForm.shaba || "").trim().toUpperCase(),
          phone_number: bankForm.phone_number ? String(bankForm.phone_number).trim() : null,
          pos_number: Number(bankForm.pos_number),
          switch_number: bankForm.switch_number ? Number(bankForm.switch_number) : null,
          terminal_number: bankForm.terminal_number ? Number(bankForm.terminal_number) : null,
          receiver_number: bankForm.receiver_number ? Number(bankForm.receiver_number) : null,
        }
      );
      alert("✅ بانک با موفقیت ایجاد شد");

      // رفرش لیست
      const res = await axios.get(
        `${API_BASE_URL}/banking/api/v2/banks/`
      );
      setBanks(Array.isArray(res.data) ? res.data : res.data.results || []);

      // بستن مودال و پاک کردن فرم
      setIsModalOpen(false);
      setBankForm(initialBankForm);
    } catch (err) {
      console.error("Error creating bank:", err);
      if (err.response) {
        console.error("Server validation errors:", err.response.data); // ✅ این خط جدید
        alert(`❌ خطا: ${JSON.stringify(err.response.data)}`);
      } else {
        alert("❌ ارتباط با سرور برقرار نشد");
      }
    }
  };

  const createCashbox = async () => {
    if (guardWrite()) return;

    try {
      await axios.post(
        `${API_BASE_URL}/banking/api/v2/cashbox_list/`,
        { ...cashboxForm, account: Number(cashboxForm.account) }
      );
      alert("✅ صندوق با موفقیت ایجاد شد");

      const res = await axios.get(
        `${API_BASE_URL}/banking/api/v2/cashboxes/`
      );
      setCashboxes(Array.isArray(res.data) ? res.data : res.data.results || []);

      setIsModalOpen(false);
      setCashboxForm(initialCashboxForm);
    } catch (err) {
      console.error("Error creating cashbox:", err);
      if (err.response) {
        console.error("Server validation errors:", err.response.data);
        alert(`❌ خطا: ${JSON.stringify(err.response.data)}`);
      } else {
        alert("❌ ارتباط با سرور برقرار نشد");
      }
    }
  };

  const createImprest = async () => {
    if (guardWrite()) return;

    try {
      console.log("Submitting bank data:", bankForm);
      await axios.post(
        `${API_BASE_URL}/banking/api/v2/imprest_list/`,
        { ...imprestForm, account: Number(imprestForm.account) }
      );
      alert("✅ تنخواه گردان با موفقیت ایجاد شد");

      const res = await axios.get(
        `${API_BASE_URL}/banking/api/v2/imprests/`
      );
      setImprests(Array.isArray(res.data) ? res.data : res.data.results || []);

      setIsModalOpen(false);
      setImprestForm(initialImprestForm);
    } catch (err) {
      console.error(err);
      alert("❌ خطا در ایجاد تنخواه گردان");
    }
  };

  return (
    <div className={styles.container} dir="rtl">
      <PageHero eyebrow="خزانه / انتقال وجه" title="انتقال جدید" description="انتقال بین بانک، صندوق و تنخواه با ثبت هم‌زمان اثر مالی و کارمزدها." icon={<FiRepeat />} />
      <StatGrid>
        <StatCard label="کسر از مبدأ" value={`${summary.deductedFromSender.toLocaleString("fa-IR")} ریال`} hint="مبلغ انتقال + کارمزد مبدأ" icon={<FiArrowUpRight />} tone="danger" />
        <StatCard label="واریز به مقصد" value={`${summary.creditedToReceiver.toLocaleString("fa-IR")} ریال`} hint="مبلغ انتقال - کارمزد مقصد" icon={<FiArrowDownLeft />} tone="success" />
        <StatCard label="مجموع کارمزد" value={`${(Number(formData.bank_fees_from||0)+Number(formData.bank_fees_to||0)).toLocaleString("fa-IR")} ریال`} hint="اثر مستقیم در سند حسابداری" icon={<FiInfo />} tone="warning" />
        <StatCard label="تاریخ انتقال" value={formData.date || "—"} hint="شماره تراکنش پس از ثبت تولید می‌شود" icon={<FiRepeat />} tone="info" />
      </StatGrid>
      <div className={styles.card}>
        <div className={styles.formHeading}><div><h2 className={styles.title}>اطلاعات انتقال</h2><p>ابتدا مبدأ و مقصد را مشخص کنید، سپس مبلغ و کارمزدها را کنترل و ثبت کنید.</p></div></div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Header Fields */}
          <div className={styles.row}>
            <div className={styles.col6}>
              <label className={styles.label}>شماره تراکنش</label>
              <input
                type="text"
                value="خودکار پس از ثبت"
                className={styles.input}
                disabled
              />
            </div>
            <div className={styles.col6}>
              <label className={styles.label}>تاریخ</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={onChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.col12}>
              <label className={styles.label}>شرح</label>
              <input
                name="description"
                value={formData.description}
                onChange={onChange}
                className={styles.input}
                placeholder="شرح انتقال را وارد کنید..."
              />
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Sender & Receiver */}
          <div className={styles.row}>
            {/* Sender */}
            <div className={styles.col6}>
              <h3 className={styles.sectionTitle}>از حساب/صندوق/تنخواهگردان</h3>

              <div className={styles.segmentedTabs}>
                {["Bank", "CashBox", "Imprest"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`${styles.tab} ${
                      formData.sender_type === type ? styles.activeTab : ""
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        sender_type: type,
                        sender_id: "",
                      }))
                    }
                  >
                    {type === "Bank"
                      ? "بانک"
                      : type === "CashBox"
                      ? "صندوق"
                      : "تنخواه"}
                  </button>
                ))}
              </div>

              <div className={styles.inputGroup}>
                <select
                  name="sender_id"
                  value={formData.sender_id}
                  onChange={onChange}
                  className={styles.select}
                  required
                >
                  <option value="">انتخاب کنید...</option>
                  {optionsFor(formData.sender_type)}
                </select>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => openCreateModal(formData.sender_type)}
                  disabled={!canWrite}
                  title={!canWrite ? disabledReason : "افزودن جدید"}
                >
                  ➕
                </button>
              </div>

              <div className={styles.row}>
                <div className={styles.col6}>
                  <label className={styles.label}>شماره ارجاع (مبدأ)</label>
                  <input
                    name="referral_number_from"
                    value={formData.referral_number_from}
                    onChange={onChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.col6}>
                  <label className={styles.label}>کارمزد (مبدأ)</label>
                  <input
                    type="number"
                    name="bank_fees_from"
                    value={formData.bank_fees_from}
                    onChange={onChange}
                    className={styles.input}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Receiver */}
            <div className={styles.col6}>
              <h3 className={styles.sectionTitle}>به حساب/صندوق/تنخواهگردان</h3>

              <div className={styles.segmentedTabs}>
                {["Bank", "CashBox", "Imprest"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`${styles.tab} ${
                      formData.receiver_type === type ? styles.activeTab : ""
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        receiver_type: type,
                        receiver_id: "",
                      }))
                    }
                  >
                    {type === "Bank"
                      ? "بانک"
                      : type === "CashBox"
                      ? "صندوق"
                      : "تنخواه"}
                  </button>
                ))}
              </div>

              <div className={styles.inputGroup}>
                <select
                  name="receiver_id"
                  value={formData.receiver_id}
                  onChange={onChange}
                  className={styles.select}
                  required
                >
                  <option value="">انتخاب کنید...</option>
                  {optionsFor(formData.receiver_type)}
                </select>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => openCreateModal(formData.receiver_type)}
                  disabled={!canWrite}
                  title={!canWrite ? disabledReason : "افزودن جدید"}
                >
                  ➕
                </button>
              </div>

              <div className={styles.row}>
                <div className={styles.col6}>
                  <label className={styles.label}>شماره ارجاع (مقصد)</label>
                  <input
                    name="referral_number_to"
                    value={formData.referral_number_to}
                    onChange={onChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.col6}>
                  <label className={styles.label}>کارمزد (مقصد)</label>
                  <input
                    type="number"
                    name="bank_fees_to"
                    value={formData.bank_fees_to}
                    onChange={onChange}
                    className={styles.input}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Amount & Summary */}
          <div className={styles.row}>
            <div className={styles.col6}>
              <label className={styles.label}>مبلغ انتقال (ریال)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={onChange}
                className={`${styles.input} ${styles.amountInput}`}
                required
                min="0"
              />
            </div>
            <div className={styles.col6}>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span>کسر از مبدأ:</span>
                  <strong>
                    {summary.deductedFromSender.toLocaleString()} ریال
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>واریز به مقصد:</span>
                  <strong>
                    {summary.creditedToReceiver.toLocaleString()} ریال
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.submitSection}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!canWrite}
              title={!canWrite ? disabledReason : undefined}
            >
              ثبت انتقال
            </button>
          </div>
        </form>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {modalEntityType === "Bank"
                  ? "افزودن بانک جدید"
                  : modalEntityType === "CashBox"
                  ? "افزودن صندوق جدید"
                  : "افزودن تنخواه گردان جدید"}
              </h3>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* FORM FOR BANK */}
              {modalEntityType === "Bank" && (
                <div className={styles.entityForm}>
                  <div className={styles.formGrid}>
                    {/* فیلدهای اجباری */}
                    <div className={styles.formGroup}>
                      <label>نام *</label>
                      <input
                        type="text"
                        name="name"
                        value={bankForm.name || ""}
                        onChange={handleBankChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>حساب حسابداری بانک *</label>
                      <select name="account" value={bankForm.account} onChange={handleBankChange} required>
                        <option value="">انتخاب کنید</option>
                        {bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>نام شعبه *</label>
                      <input
                        type="text"
                        name="branch_name"
                        value={bankForm.branch_name || ""}
                        onChange={handleBankChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره حساب *</label>
                      <input
                        type="text"
                        name="account_number"
                        value={bankForm.account_number || ""}
                        onChange={handleBankChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره کارت *</label>
                      <input
                        type="text"
                        name="card_number"
                        value={bankForm.card_number || ""}
                        onChange={handleBankChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره شبا *</label>
                      <input
                        type="text"
                        name="shaba"
                        value={bankForm.shaba || ""}
                        onChange={handleBankChange}
                        required
                      />
                    </div>

                    {/* فیلدهای اختیاری */}
                    <div className={styles.formGroup}>
                      <label>نام صاحب حساب</label>
                      <input
                        type="text"
                        name="account_owner_name"
                        value={bankForm.account_owner_name || ""}
                        onChange={handleBankChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره POS</label>
                      <input
                        type="number"
                        name="pos_number"
                        value={bankForm.pos_number || ""}
                        onChange={handleBankChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>واحد پول</label>
                      <select
                        name="currency"
                        value={bankForm.currency || "IRR"}
                        onChange={handleBankChange}
                      >
                        <option value="IRR">ریال ایران</option>
                        <option value="USD">دلار آمریکا</option>
                        <option value="EUR">یورو</option>
                        <option value="AED">درهم امارات</option>
                        <option value="CAD">دلار کانادا</option>
                        <option value="OMR">ریال عمان</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>توضیحات</label>
                      <textarea
                        name="description"
                        value={bankForm.description || ""}
                        onChange={handleBankChange}
                        rows="3"
                      ></textarea>
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره تلفن</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={bankForm.phone_number || ""}
                        onChange={handleBankChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره سوئیچ</label>
                      <input
                        type="number"
                        name="switch_number"
                        value={bankForm.switch_number || ""}
                        onChange={handleBankChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره ترمینال</label>
                      <input
                        type="number"
                        name="terminal_number"
                        value={bankForm.terminal_number || ""}
                        onChange={handleBankChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره دریافت کننده</label>
                      <input
                        type="number"
                        name="receiver_number"
                        value={bankForm.receiver_number || ""}
                        onChange={handleBankChange}
                      />
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setIsModalOpen(false)}
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={createBank}
                      disabled={!canWrite}
                      title={!canWrite ? disabledReason : undefined}
                    >
                      ✅ ایجاد بانک
                    </button>
                  </div>
                </div>
              )}
              {/* FORM FOR CASHBOX */}
              {modalEntityType === "CashBox" && (
                <div className={styles.entityForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>نام *</label>
                      <input
                        type="text"
                        name="name"
                        value={cashboxForm.name}
                        onChange={handleCashboxChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>حساب حسابداری صندوق *</label>
                      <select name="account" value={cashboxForm.account} onChange={handleCashboxChange} required>
                        <option value="">انتخاب کنید</option>
                        {cashboxAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>واحد پول</label>
                      <select
                        name="currency"
                        value={cashboxForm.currency}
                        onChange={handleCashboxChange}
                      >
                        <option value="IRR">ریال ایران</option>
                        <option value="USD">دلار آمریکا</option>
                        <option value="EUR">یورو</option>
                        <option value="AED">درهم امارات</option>
                        <option value="CAD">دلار کانادا</option>
                        <option value="OMR">ریال عمان</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>موجودی فعلی</label>
                      <input
                        type="number"
                        name="account_balance"
                        value={cashboxForm.account_balance}
                        onChange={handleCashboxChange}
                        placeholder="مثلاً: 500000"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>توضیحات</label>
                      <textarea
                        name="description"
                        value={cashboxForm.description}
                        onChange={handleCashboxChange}
                        rows="4"
                        placeholder="توضیحات درباره صندوق..."
                      ></textarea>
                    </div>

                    <div className={styles.formGroup}>
                      <label>فعال باشد؟</label>
                      <select
                        name="is_active"
                        value={cashboxForm.is_active}
                        onChange={handleCashboxChange}
                      >
                        <option value={true}>بله</option>
                        <option value={false}>خیر</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره سوئیچ</label>
                      <input
                        type="number"
                        name="switch_number"
                        value={cashboxForm.switch_number}
                        onChange={handleCashboxChange}
                        placeholder="مثلاً: 1"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره ترمینال</label>
                      <input
                        type="number"
                        name="terminal_number"
                        value={cashboxForm.terminal_number}
                        onChange={handleCashboxChange}
                        placeholder="مثلاً: 1"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>شماره دریافت کننده</label>
                      <input
                        type="number"
                        name="receiver_number"
                        value={cashboxForm.receiver_number}
                        onChange={handleCashboxChange}
                        placeholder="مثلاً: 1"
                      />
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setIsModalOpen(false)}
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={createCashbox}
                      disabled={!canWrite}
                      title={!canWrite ? disabledReason : undefined}
                    >
                      ✅ ایجاد صندوق
                    </button>
                  </div>
                </div>
              )}

              {/* FORM FOR IMPREST */}
              {modalEntityType === "Imprest" && (
                <div className={styles.entityForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>نام *</label>
                      <input
                        type="text"
                        name="name"
                        value={imprestForm.name}
                        onChange={handleImprestChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>حساب حسابداری تنخواه *</label>
                      <select name="account" value={imprestForm.account} onChange={handleImprestChange} required>
                        <option value="">انتخاب کنید</option>
                        {imprestAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>واحد پول</label>
                      <select
                        name="currency"
                        value={imprestForm.currency}
                        onChange={handleImprestChange}
                      >
                        <option value="IRR">ریال ایران</option>
                        <option value="USD">دلار آمریکا</option>
                        <option value="EUR">یورو</option>
                        <option value="AED">درهم امارات</option>
                        <option value="CAD">دلار کانادا</option>
                        <option value="OMR">ریال عمان</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>موجودی فعلی</label>
                      <input
                        type="number"
                        name="account_balance"
                        value={imprestForm.account_balance}
                        onChange={handleImprestChange}
                        placeholder="مثلاً: 500000"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>توضیحات</label>
                      <textarea
                        name="description"
                        value={imprestForm.description}
                        onChange={handleImprestChange}
                        rows="4"
                        placeholder="توضیحات درباره تنخواه گردان..."
                      ></textarea>
                    </div>

                    <div className={styles.formGroup}>
                      <label>فعال باشد؟</label>
                      <select
                        name="is_active"
                        value={imprestForm.is_active}
                        onChange={handleImprestChange}
                      >
                        <option value={true}>بله</option>
                        <option value={false}>خیر</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setIsModalOpen(false)}
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={createImprest}
                      disabled={!canWrite}
                      title={!canWrite ? disabledReason : undefined}
                    >
                      ✅ ایجاد تنخواه گردان
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
