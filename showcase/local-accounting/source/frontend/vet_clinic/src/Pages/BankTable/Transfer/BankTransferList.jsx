import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
// src/pages/BankTable/Transfer/BankTransferList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useModulePermission from "../../../hooks/useModulePermission";
import { FaPlus, FaSearch } from "react-icons/fa";
import styles from "./BankTransferList.module.css";

export default function BankTransferList() {
  const { canWrite, disabledReason } = useModulePermission("banking");

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }
    return false;
  };

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    amountFrom: "",
    amountTo: "",
    dateFrom: "",
    dateTo: "",
  });

  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);

      const response = await authFetch(
        `${API_BASE_URL}/banking/api/v2/transaction_list/`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transfersData = Array.isArray(data) ? data : data.results || [];

      const formattedTransfers = transfersData.map((t) => ({
        ...t,
        rawDate: t.date,
        date: t.date ? new Date(t.date).toLocaleDateString("fa-IR") : "—",
        amount: Number(t.amount || 0),
      }));

      setTransfers(formattedTransfers);
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setLoading(false);
    }
  };
  const reverseTransaction = async (id) => {
    if (guardWrite()) return;

    const ok = window.confirm(
      "تراکنش برگشت شود؟"
    );

    if (!ok) return;

    try {

      await axios.post(
        `${API_BASE_URL}/banking/api/${id}/v2/transactions/reverse/`
      );

      toast.success("تراکنش برگشت خورد");

      fetchTransfers();

    } catch (err) {

      console.error(err);

      toast.error(
        err.response?.data?.error ||
        "خطا در برگشت تراکنش"
      );
    }
  };

  function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();

        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }

    return cookieValue;
  }

  const filteredAndSorted = useMemo(() => {
    return transfers
      .filter((t) => {
        const description = t.description || "";
        const senderName = t.sender?.name || "";
        const receiverName = t.receiver?.name || "";

        const matchesSearch = description
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesFrom =
          !filters.from ||
          senderName.toLowerCase().includes(filters.from.toLowerCase());

        const matchesTo =
          !filters.to ||
          receiverName.toLowerCase().includes(filters.to.toLowerCase());

        const matchesAmount =
          (!filters.amountFrom || t.amount >= Number(filters.amountFrom)) &&
          (!filters.amountTo || t.amount <= Number(filters.amountTo));

        const itemDate = t.rawDate ? new Date(t.rawDate) : null;

        const matchesDate =
          (!filters.dateFrom || (itemDate && itemDate >= new Date(filters.dateFrom))) &&
          (!filters.dateTo || (itemDate && itemDate <= new Date(filters.dateTo)));

        return (
          matchesSearch &&
          matchesFrom &&
          matchesTo &&
          matchesAmount &&
          matchesDate
        );
      })
      .sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        if (sortBy === "sender") {
          aValue = a.sender?.name || "";
          bValue = b.sender?.name || "";
        }

        if (sortBy === "receiver") {
          aValue = a.receiver?.name || "";
          bValue = b.receiver?.name || "";
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [transfers, search, filters, sortBy, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / itemsPerPage)
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredAndSorted.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return "";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <div>
          <h3>لیست انتقال‌ها</h3>
          <p>مدیریت انتقال بین بانک، صندوق و تنخواه‌گردان</p>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => {
            if (guardWrite()) return;
            navigate("/banking/transfers/new");
          }}
          disabled={!canWrite}
          title={!canWrite ? disabledReason : undefined}
        >
          <FaPlus />
          انتقال جدید
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <FaSearch />
          <input
            type="text"
            placeholder="جستجو در توضیحات انتقال..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className={styles.resultCount}>
          {filteredAndSorted.length.toLocaleString("fa-IR")} انتقال
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="مبدأ"
          value={filters.from}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, from: e.target.value }))
          }
        />

        <input
          type="text"
          placeholder="مقصد"
          value={filters.to}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, to: e.target.value }))
          }
        />

        <input
          type="number"
          placeholder="مبلغ از"
          value={filters.amountFrom}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, amountFrom: e.target.value }))
          }
        />

        <input
          type="number"
          placeholder="مبلغ تا"
          value={filters.amountTo}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, amountTo: e.target.value }))
          }
        />

        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
          }
        />

        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
          }
        />
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
                <th onClick={() => handleSort("trans_number")}>
                  شماره {getSortIcon("trans_number")}
                </th>
                <th onClick={() => handleSort("date")}>
                  تاریخ {getSortIcon("date")}
                </th>
                <th onClick={() => handleSort("sender")}>
                  از {getSortIcon("sender")}
                </th>
                <th onClick={() => handleSort("receiver")}>
                  به {getSortIcon("receiver")}
                </th>
                <th onClick={() => handleSort("amount")}>
                  مبلغ {getSortIcon("amount")}
                </th>
                <th>شرح</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className={styles.emptyState}>
                      <strong>انتقالی پیدا نشد</strong>
                      <p>فیلترها را تغییر بده یا انتقال جدید ثبت کن.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <code className={styles.code}>
                        {t.trans_number || "—"}
                      </code>
                    </td>
                    <td>{t.date}</td>
                    <td className={styles.nameCell}>{t.sender?.name || "نامشخص"}</td>
                    <td className={styles.nameCell}>{t.receiver?.name || "نامشخص"}</td>
                    <td>
                      <span className={styles.amountBadge}>
                        {t.amount.toLocaleString("fa-IR")} ریال
                      </span>
                    </td>

                    <td>
                      {!t.is_reversed ? (
                        <button
                          type="button"
                          className={styles.reverseBtn}
                          onClick={() => reverseTransaction(t.id)}
                          disabled={!canWrite}
                          title={!canWrite ? disabledReason : undefined}
                        >
                          برگشت
                        </button>
                      ) : (
                        <span className={styles.reversedBadge}>
                          برگشت خورده
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          قبلی
        </button>

        <span>
          صفحه {currentPage.toLocaleString("fa-IR")} از{" "}
          {totalPages.toLocaleString("fa-IR")}
        </span>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          بعدی
        </button>
      </div>
    </div>
  );
}