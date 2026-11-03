import ReportDownloads from "../../../components/ReportDownloads/ReportDownloads";
import { authFetch } from "../../../api/http";
import { extractList, API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSearch } from "react-icons/fa";
import styles from "../PersonTable.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;

export default function PersonPaymentList() {
    const { canWrite, disabledReason } = useModulePermission("banking");

  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/persons/api/v2/payment_list/`);
      const data = await res.json();
      setPayments(extractList(data));
    } catch (error) {
      console.error("Fetch payments error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return payments.filter((p) =>
      [p.payment_number, p.date, p.amount, p.description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [payments, searchTerm]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <div>
          <h3>لیست پرداخت‌ها</h3>
          <p>مدیریت پرداخت‌ها</p>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          disabled={!canWrite}
          title={!canWrite ? disabledReason : undefined}
          onClick={() => {
            if (!canWrite) {
              alert(disabledReason);
              return;
            }
            navigate("/persons/payment/add");
          }}
        >
          <FaPlus />
          افزودن پرداخت
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <FaSearch />
          <input
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.resultCount}>
          {filteredPayments.length} پرداخت
        </div>
      </div>

      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ردیف</th>
                <th>شماره</th>
                <th>تاریخ</th>
                <th>مبلغ</th>
                <th>شرح</th><th>رسید</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.payment_number}</td>
                  <td>{p.date}</td>
                  <td>{Number(p.amount).toLocaleString("fa-IR")}</td>
                  <td>{p.description}</td><td><ReportDownloads url={`${API_BASE}/persons/api/v2/receipts/payment/${p.id}/export/`} filename={`payment-${p.id}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

