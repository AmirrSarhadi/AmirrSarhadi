import { API_BASE_URL } from "../../../api/http";
// src/Pages/BankTable/ReceivedChecks/ReceivedChecksTable.jsx

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./ReceivedChecksTable.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;

const RECEIVED_CHECKS_API = `${API_BASE}/banking/api/v2/incheque_list/`;
const BANKS_API = `${API_BASE}/banking/api/v2/bank_list/`;

const PERSON_CONTENT_TYPES_API = `${API_BASE}/persons/api/v2/person-content-types/`;

const PERSON_ENDPOINTS = [
  {
    type: "customer",
    label: "مشتری",
    url: `${API_BASE}/persons/api/v2/customer_list/`,
  },
  {
    type: "vendor",
    label: "تأمین‌کننده",
    url: `${API_BASE}/persons/api/v2/vendor_list/`,
  },
  {
    type: "seller",
    label: "فروشنده",
    url: `${API_BASE}/persons/api/v2/seller_list/`,
  },
  {
    type: "staff",
    label: "پرسنل",
    url: `${API_BASE}/persons/api/v2/staff_list/`,
  },
];

const clearReceivedChequeApi = (id) =>
  `${API_BASE}/banking/api/${id}/v2/cheques/clear-received/`;

const returnReceivedChequeApi = (id) =>
  `${API_BASE}/banking/api/${id}/v2/cheques/return-received/`;

const cancelChequeApi = (id) =>
  `${API_BASE}/banking/api/${id}/v2/cheques/cancel/`;

const spendReceivedChequeApi = (id) =>
  `${API_BASE}/banking/api/${id}/v2/cheques/spend-received/`;

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

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";

  try {
    return new Date(dateStr).toLocaleDateString("fa-IR");
  } catch {
    return dateStr;
  }
}

function getChequeTypeText(check) {
  const value = check?.cheque_type;

  if (value === "دریافتی" || value === "IN") return "دریافتی";
  if (value === "پرداختی" || value === "OUT") return "پرداختی";

  return check?.cheque_type_label || value || "—";
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fa-IR")} ریال`;
}

function getDocId(value) {
  if (!value) return null;
  if (typeof value === "object") return value.id || value.pk || null;
  return value;
}

function getBankTitle(bank) {
  return (
    bank?.name ||
    bank?.title ||
    bank?.account_number ||
    bank?.card_number ||
    `بانک #${bank?.id}`
  );
}

function getPersonTitle(person) {
  return (
    person?.name ||
    person?.full_name ||
    person?.title ||
    person?.company_name ||
    person?.phone ||
    person?.mobile ||
    `شخص #${person?.id}`
  );
}

function getCheckNumber(check) {
  return (
    check.cheque_number ||
    check.number ||
    check.sayad_number ||
    `چک #${check.id}`
  );
}

function getDueDate(check) {
  return check.due_date || check.date;
}

function getStatusText(status) {
  switch (status) {
    case "PENDING":
      return "در جریان";
    case "DEPOSITED":
      return "واگذار شده به بانک";
    case "CLEARED":
      return "وصول شده";
    case "SPENT":
      return "خرج شده";
    case "RETURNED":
      return "برگشتی";
    case "CANCELED":
      return "ابطال شده";
    default:
      return status || "—";
  }
}

function getStatusClass(status) {
  switch (status) {
    case "PENDING":
      return `${styles.badge} ${styles.badgePending}`;
    case "DEPOSITED":
      return `${styles.badge} ${styles.badgeDeposited}`;
    case "CLEARED":
      return `${styles.badge} ${styles.badgeCleared}`;
    case "SPENT":
      return `${styles.badge} ${styles.badgeSpent}`;
    case "RETURNED":
      return `${styles.badge} ${styles.badgeReturned}`;
    case "CANCELED":
      return `${styles.badge} ${styles.badgeCanceled}`;
    default:
      return `${styles.badge} ${styles.badgeDefault}`;
  }
}

function escapeCsvCell(value) {
  const text = String(value ?? "")
    .replace(/"/g, '""')
    .replace(/\r?\n|\r/g, " ");

  return `"${text}"`;
}

function downloadCsv(filename, rows) {
  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getExportDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function BankSelectModal({
  title,
  description,
  banks,
  loadingBanks,
  onClose,
  onConfirm,
  submitting,
}) {
  const [bankId, setBankId] = useState("");

  useEffect(() => {
    if (!bankId && banks.length > 0) {
      setBankId(String(banks[0].id));
    }
  }, [banks, bankId]);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            ×
          </button>
        </div>

        <p className={styles.modalDesc}>{description}</p>

        <div className={styles.field}>
          <label>انتخاب بانک</label>

          <select
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            disabled={loadingBanks || submitting}
          >
            {loadingBanks ? (
              <option value="">در حال دریافت بانک‌ها...</option>
            ) : banks.length === 0 ? (
              <option value="">بانکی یافت نشد</option>
            ) : (
              banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {getBankTitle(bank)}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={submitting}
          >
            انصراف
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onConfirm(bankId)}
            disabled={!bankId || submitting}
          >
            {submitting ? "در حال انجام..." : "تأیید"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpendChequeModal({
  title,
  description,
  persons,
  loadingPersons,
  onClose,
  onConfirm,
  submitting,
}) {
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    if (!selectedKey && persons.length > 0) {
      setSelectedKey(persons[0].key);
    }
  }, [persons, selectedKey]);

  const selectedPerson = useMemo(() => {
    return persons.find((person) => person.key === selectedKey) || null;
  }, [persons, selectedKey]);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>

          <button type="button" onClick={onClose} className={styles.closeBtn}>
            ×
          </button>
        </div>

        <p className={styles.modalDesc}>{description}</p>

        <div className={styles.field}>
          <label>انتخاب شخص دریافت‌کننده چک</label>

          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={loadingPersons || submitting}
          >
            {loadingPersons ? (
              <option value="">در حال دریافت اشخاص...</option>
            ) : persons.length === 0 ? (
              <option value="">شخصی یافت نشد</option>
            ) : (
              persons.map((person) => (
                <option key={person.key} value={person.key}>
                  {person.person_type_label} - {person.display_name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={submitting}
          >
            انصراف
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onConfirm(selectedPerson)}
            disabled={!selectedPerson || submitting}
          >
            {submitting ? "در حال انجام..." : "خرج کردن چک"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChequeDetailsModal({ check, onClose, onOpenDocument }) {
  if (!check) return null;

  const accountingDocId = getDocId(check.accounting_document);
  const settlementDocId = getDocId(check.settlement_document);
  const reverseDocId = getDocId(check.reverse_document);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.detailsModal}>
        <div className={styles.detailsHeader}>
          <div>
            <h3>جزئیات چک {getCheckNumber(check)}</h3>
            <p>
              نوع چک: {getChequeTypeText(check)} — وضعیت:{" "}
              {check.status_label || getStatusText(check.status)}
            </p>
          </div>

          <button type="button" className={styles.closeIconBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.detailsGrid}>
          <div>
            <span>شماره چک</span>
            <strong>{check.cheque_number || check.number || "—"}</strong>
          </div>

          <div>
            <span>شماره صیاد</span>
            <strong>{check.sayad_number || "—"}</strong>
          </div>

          <div>
            <span>مبلغ</span>
            <strong>{formatMoney(check.amount)}</strong>
          </div>

          <div>
            <span>تاریخ سررسید</span>
            <strong>{formatDate(getDueDate(check))}</strong>
          </div>

          <div>
            <span>طرف حساب اصلی</span>
            <strong>{check.payer_name || "—"}</strong>
          </div>

          <div>
            <span>خرج شده به</span>
            <strong>{check.spent_to_name || "—"}</strong>
          </div>

          <div>
            <span>بانک صادرکننده</span>
            <strong>{check.bank_name || "—"}</strong>
          </div>

          <div>
            <span>شعبه بانک</span>
            <strong>{check.bank_branch || "—"}</strong>
          </div>

          <div>
            <span>بانک تسویه / وصول</span>
            <strong>{check.settlement_bank_name || "—"}</strong>
          </div>

          <div>
            <span>تاریخ دریافت</span>
            <strong>{formatDate(check.received_date)}</strong>
          </div>

          <div>
            <span>تاریخ تسویه</span>
            <strong>{formatDate(check.settled_date)}</strong>
          </div>

          <div>
            <span>تاریخ خرج شدن</span>
            <strong>{formatDate(check.spent_at)}</strong>
          </div>

          <div>
            <span>وضعیت</span>
            <strong>
              <span className={getStatusClass(check.status)}>
                {check.status_label || getStatusText(check.status)}
              </span>
            </strong>
          </div>

          <div>
            <span>شناسه چک</span>
            <strong>#{check.id}</strong>
          </div>
        </div>

        <div className={styles.descriptionBox}>
          <span>توضیحات</span>
          <p>{check.description || "توضیحی ثبت نشده است."}</p>
        </div>

        <div className={styles.documentBox}>
          <span>اسناد مرتبط</span>

          <div className={styles.documentActions}>
            {accountingDocId ? (
              <button
                type="button"
                className={styles.docBtn}
                onClick={() => onOpenDocument(accountingDocId)}
              >
                سند ثبت اولیه
              </button>
            ) : (
              <em>سند ثبت اولیه ندارد</em>
            )}

            {settlementDocId ? (
              <button
                type="button"
                className={styles.docBtn}
                onClick={() => onOpenDocument(settlementDocId)}
              >
                سند تسویه / وصول / خرج
              </button>
            ) : (
              <em>سند تسویه ندارد</em>
            )}

            {reverseDocId ? (
              <button
                type="button"
                className={styles.docBtn}
                onClick={() => onOpenDocument(reverseDocId)}
              >
                سند برگشت / ابطال
              </button>
            ) : (
              <em>سند برگشت یا ابطال ندارد</em>
            )}
          </div>
        </div>

        <div className={styles.detailsFooter}>
          <button type="button" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceivedChecksTable() {
  const navigate = useNavigate();
  const { canWrite, disabledReason } = useModulePermission("banking");

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }
    return false;
  };

  const [checks, setChecks] = useState([]);
  const [banks, setBanks] = useState([]);

  const [persons, setPersons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    date_from: "",
    date_to: "",
    min_amount: "",
    max_amount: "",
  });

  const [clearTarget, setClearTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [spendTarget, setSpendTarget] = useState(null);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(RECEIVED_CHECKS_API, {
        params: getFilterParams(),
      });

      setChecks(normalizeList(res.data));
    } catch (err) {
      console.error("Fetch received cheques error:", err);
      setError(getApiErrorMessage(err) || "خطا در دریافت لیست چک‌های دریافتی");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);

      const res = await axios.get(BANKS_API);
      setBanks(normalizeList(res.data));
    } catch (err) {
      console.error("Fetch banks error:", err);
      toast.error(getApiErrorMessage(err) || "خطا در دریافت لیست بانک‌ها");
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchPersons = async () => {
    try {
      setLoadingPersons(true);

      const [contentTypeRes, ...personResponses] = await Promise.all([
        axios.get(PERSON_CONTENT_TYPES_API),
        ...PERSON_ENDPOINTS.map((endpoint) =>
          axios.get(endpoint.url).catch(() => ({ data: [] }))
        ),
      ]);

      const contentTypeIds = contentTypeRes.data || {};

      const mergedPersons = personResponses
        .flatMap((res, index) => {
          const endpoint = PERSON_ENDPOINTS[index];
          const contentTypeId = contentTypeIds[endpoint.type];

          return normalizeList(res.data).map((person) => ({
            ...person,
            key: `${endpoint.type}-${person.id}`,
            person_type: endpoint.type,
            person_type_label: endpoint.label,
            content_type_id: contentTypeId,
            display_name: getPersonTitle(person),
          }));
        })
        .filter((person) => person.id && person.content_type_id);

      setPersons(mergedPersons);
    } catch (err) {
      console.error("Fetch persons error:", err);
      toast.error(getApiErrorMessage(err) || "خطا در دریافت لیست اشخاص");
    } finally {
      setLoadingPersons(false);
    }
  };

  const getFilterParams = () => {
    const params = {};

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (String(value || "").trim()) {
        params[key] = value;
      }
    });

    return params;
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilters({
      status: "",
      date_from: "",
      date_to: "",
      min_amount: "",
      max_amount: "",
    });
  };

  useEffect(() => {
    fetchBanks();
    fetchPersons();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChecks();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

  const filteredChecks = useMemo(() => checks, [checks]);

  const handleClear = async (bankId) => {
    if (guardWrite()) return;
    if (!clearTarget?.id || !bankId) return;

    try {
      setSubmitting(true);

      await axios.post(clearReceivedChequeApi(clearTarget.id), {
        bank_id: Number(bankId),
      });

      toast.success("چک با موفقیت وصول شد");
      setClearTarget(null);
      fetchChecks();
    } catch (err) {
      console.error("Clear cheque error:", err);
      toast.error(getApiErrorMessage(err) || "وصول چک انجام نشد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpend = async (person) => {
    if (guardWrite()) return;
    if (!spendTarget?.id || !person) return;

    try {
      setSubmitting(true);

      await axios.post(spendReceivedChequeApi(spendTarget.id), {
        spent_to_content_type_id: person.content_type_id,
        spent_to_object_id: person.id,
      });

      toast.success("چک با موفقیت خرج شد");
      setSpendTarget(null);
      fetchChecks();
    } catch (err) {
      console.error("Spend received cheque error:", err);
      toast.error(getApiErrorMessage(err) || "خرج کردن چک انجام نشد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (check) => {
    if (guardWrite()) return;

    const ok = window.confirm(
      `چک ${getCheckNumber(check)} برگشت داده شود؟`
    );

    if (!ok) return;

    try {
      setSubmitting(true);

      await axios.post(returnReceivedChequeApi(check.id));

      toast.success("چک با موفقیت برگشت خورد");
      fetchChecks();
    } catch (err) {
      console.error("Return cheque error:", err);
      toast.error(getApiErrorMessage(err) || "برگشت چک انجام نشد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (check) => {
    if (guardWrite()) return;

    const ok = window.confirm(
      `چک ${getCheckNumber(check)} ابطال شود؟ این عملیات قابل برگشت نیست.`
    );

    if (!ok) return;

    try {
      setSubmitting(true);

      await axios.post(cancelChequeApi(check.id));

      toast.success("چک با موفقیت ابطال شد");
      fetchChecks();
    } catch (err) {
      console.error("Cancel cheque error:", err);
      toast.error(getApiErrorMessage(err) || "ابطال چک انجام نشد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      [
        "ردیف",
        "شماره چک",
        "شماره صیاد",
        "تاریخ سررسید",
        "مبلغ",
        "پرداخت‌کننده",
        "بانک صادرکننده",
        "بانک وصول",
        "خرج شده به",
        "وضعیت",
        "توضیحات",
      ],
      ...filteredChecks.map((check, index) => [
        index + 1,
        check.cheque_number || check.number || "",
        check.sayad_number || "",
        formatDate(getDueDate(check)),
        Number(check.amount || 0),
        check.payer_name || "",
        check.bank_name || "",
        check.settlement_bank_name || "",
        check.spent_to_name || "",
        check.status_label || getStatusText(check.status),
        check.description || "",
      ]),
    ];

    downloadCsv(`received-cheques-${getExportDate()}.csv`, rows);
  };

  const handleOpenDocument = (documentId) => {
    if (!documentId) return;
    navigate(`/accounting/documents/${documentId}`);
  };

  const canClear = (check) =>
    ["PENDING", "DEPOSITED"].includes(check.status);

  const canSpend = (check) =>
    check.status === "PENDING";

  const canReturn = (check) =>
    ["PENDING", "DEPOSITED", "CLEARED"].includes(check.status);

  const canCancel = (check) =>
    ["PENDING", "DEPOSITED"].includes(check.status);

  const renderDocumentButtons = (check) => {
    const accountingDocId = getDocId(check.accounting_document);
    const settlementDocId = getDocId(check.settlement_document);
    const reverseDocId = getDocId(check.reverse_document);

    if (!accountingDocId && !settlementDocId && !reverseDocId) {
      return <span className={styles.muted}>—</span>;
    }

    return (
      <div className={styles.docButtons}>
        {accountingDocId && (
          <button
            type="button"
            className={styles.docBtn}
            onClick={() => navigate(`/accounting/documents/${accountingDocId}`)}
          >
            ثبت
          </button>
        )}

        {settlementDocId && (
          <button
            type="button"
            className={styles.docBtn}
            onClick={() => navigate(`/accounting/documents/${settlementDocId}`)}
          >
            وصول
          </button>
        )}

        {reverseDocId && (
          <button
            type="button"
            className={styles.docBtn}
            onClick={() => navigate(`/accounting/documents/${reverseDocId}`)}
          >
            برگشت/ابطال
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>در حال بارگذاری چک‌های دریافتی...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <strong>خطا</strong>
        <p>{error}</p>
        <button type="button" onClick={fetchChecks}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>لیست چک‌های دریافتی</h2>
          <p>مدیریت وصول، برگشت، ابطال و اسناد حسابداری چک‌های دریافتی</p>
        </div>

        <div className={styles.headerButtons}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportCsv}
            disabled={filteredChecks.length === 0}
          >
            خروجی Excel
          </button>

          <button type="button" className={styles.refreshBtn} onClick={fetchChecks}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          value={searchTerm}
          placeholder="جستجو بر اساس شماره چک، صیاد، شخص، بانک یا وضعیت..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <span>{filteredChecks.length.toLocaleString("fa-IR")} چک</span>
      </div>

      <div className={styles.filterPanel}>
        <div className={styles.filterField}>
          <label>وضعیت</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="PENDING">در جریان</option>
            <option value="DEPOSITED">واگذار شده به بانک</option>
            <option value="CLEARED">وصول شده</option>
            <option value="SPENT">خرج شده</option>
            <option value="RETURNED">برگشتی</option>
            <option value="CANCELED">ابطال شده</option>
          </select>
        </div>

        <div className={styles.filterField}>
          <label>از تاریخ سررسید</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange("date_from", e.target.value)}
          />
        </div>

        <div className={styles.filterField}>
          <label>تا تاریخ سررسید</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange("date_to", e.target.value)}
          />
        </div>

        <div className={styles.filterField}>
          <label>حداقل مبلغ</label>
          <input
            type="number"
            value={filters.min_amount}
            onChange={(e) => handleFilterChange("min_amount", e.target.value)}
            placeholder="مثلا 1000000"
          />
        </div>

        <div className={styles.filterField}>
          <label>حداکثر مبلغ</label>
          <input
            type="number"
            value={filters.max_amount}
            onChange={(e) => handleFilterChange("max_amount", e.target.value)}
            placeholder="مثلا 50000000"
          />
        </div>

        <button
          type="button"
          className={styles.resetFilterBtn}
          onClick={resetFilters}
        >
          حذف فیلترها
        </button>
      </div>

      {filteredChecks.length === 0 ? (
        <div className={styles.empty}>چک دریافتی یافت نشد.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ردیف</th>
                <th>شماره چک</th>
                <th>شماره صیاد</th>
                <th>تاریخ سررسید</th>
                <th>مبلغ</th>
                <th>پرداخت‌کننده</th>
                <th>بانک صادرکننده</th>
                <th>بانک وصول</th>
                <th>خرج شده به</th>
                <th>وضعیت</th>
                <th>اسناد</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {filteredChecks.map((check, index) => (
                <tr key={check.id}>
                  <td>{index + 1}</td>

                  <td>
                    <strong>{check.cheque_number || check.number || "—"}</strong>
                  </td>

                  <td>{check.sayad_number || "—"}</td>

                  <td>{formatDate(getDueDate(check))}</td>

                  <td>
                    <span className={styles.amount}>
                      {formatMoney(check.amount)}
                    </span>
                  </td>

                  <td>{check.payer_name || "—"}</td>

                  <td>{check.bank_name || "—"}</td>

                  <td>{check.settlement_bank_name || "—"}</td>

                  <td>{check.spent_to_name || "—"}</td>

                  <td>
                    <span className={getStatusClass(check.status)}>
                      {check.status_label || getStatusText(check.status)}
                    </span>
                  </td>

                  <td>{renderDocumentButtons(check)}</td>

                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => setDetailsTarget(check)}
                      >
                        جزئیات
                      </button>
                      {canClear(check) && (
                        <button
                          type="button"
                          className={styles.successBtn}
                          onClick={() => {
                            if (guardWrite()) return;
                            setClearTarget(check);
                          }}
                          disabled={submitting || !canWrite}
                          title={!canWrite ? disabledReason : undefined}
                        >
                          وصول
                        </button>
                      )}

                      {canSpend(check) && (
                        <button
                          type="button"
                          className={styles.docBtn}
                          onClick={() => {
                            if (guardWrite()) return;
                            setSpendTarget(check);
                          }}
                          disabled={submitting || !canWrite}
                          title={!canWrite ? disabledReason : undefined}
                        >
                          خرج کردن
                        </button>
                      )}

                      {canReturn(check) && (
                        <button
                          type="button"
                          className={styles.warningBtn}
                          onClick={() => handleReturn(check)}
                          disabled={submitting || !canWrite}
                          title={!canWrite ? disabledReason : undefined}
                        >
                          برگشت
                        </button>
                      )}

                      {canCancel(check) && (
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => handleCancel(check)}
                          disabled={submitting || !canWrite}
                          title={!canWrite ? disabledReason : undefined}
                        >
                          ابطال
                        </button>
                      )}

                      {!canClear(check) &&
                        !canSpend(check) &&
                        !canReturn(check) &&
                        !canCancel(check) && (
                          <span className={styles.muted}>بدون عملیات</span>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {clearTarget && (
        <BankSelectModal
          title="وصول چک دریافتی"
          description={`برای وصول چک ${getCheckNumber(clearTarget)} بانک مقصد را انتخاب کن.`}
          banks={banks}
          loadingBanks={loadingBanks}
          submitting={submitting}
          onClose={() => setClearTarget(null)}
          onConfirm={handleClear}
        />
      )}
      {spendTarget && (
        <SpendChequeModal
          title="خرج کردن چک دریافتی"
          description={`برای خرج کردن چک ${getCheckNumber(spendTarget)} شخص دریافت‌کننده را انتخاب کن.`}
          persons={persons}
          loadingPersons={loadingPersons}
          submitting={submitting}
          onClose={() => setSpendTarget(null)}
          onConfirm={handleSpend}
        />
      )}
      {detailsTarget && (
        <ChequeDetailsModal
          check={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onOpenDocument={handleOpenDocument}
        />
      )}
    </div>
  );
}

export default ReceivedChecksTable;