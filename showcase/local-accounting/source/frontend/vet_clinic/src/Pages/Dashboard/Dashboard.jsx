import { API_BASE_URL } from "../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend } from "chart.js";
import { FaArrowTrendUp, FaChartLine, FaCoins, FaFileInvoiceDollar, FaMoneyBillTransfer, FaRegClock } from "react-icons/fa6";
import ChequeAlertsWidget from "../../components/ChequeAlertsWidget/ChequeAlertsWidget";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import moment from "moment-jalaali";
import "moment/locale/fa";
import styles from "./Dashboard.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const API_BASE = API_BASE_URL;
const money = (value) => Number(value || 0).toLocaleString("fa-IR");

function KpiCard({ title, value, tone, icon, suffix = "ریال" }) {
  return (
    <div className={`${styles.kpiCard} ${styles[tone] || ""}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon}>{icon}</span>
        <span className={styles.kpiLabel}>{title}</span>
      </div>
      <div className={styles.kpiValue}>
        <strong>{money(value)}</strong>
        {suffix && <small>{suffix}</small>}
      </div>
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/dashboards/dashboard/overview/`);
      setData(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("داده‌های داشبورد دریافت نشد.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboards/dashboard/currencies/`);
      setCurrencies(Object.entries(res.data || {}).map(([label, value]) => ({ label, value: Number(value) })));
    } catch (err) {
      console.error("Currency fetch error:", err.response?.data || err.message);
      setCurrencies([]);
    }
  };

  const fetchDebtors = async () => {
    try {
      const res = await axios.get(`${API_BASE}/persons/api/v2/person-balances/?balance_type=debit`);
      setDebtors((res.data.items || []).map((p) => ({ id: p.person_id, name: p.person_title, balance: p.balance })));
    } catch (err) {
      console.error("Debtors fetch error:", err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchCurrencies();
    fetchDebtors();
  }, []);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        rtl: true,
        textDirection: "rtl",
        backgroundColor: "#0f172a",
        padding: 12,
        cornerRadius: 10,
        callbacks: { label: (ctx) => ` ${money(ctx.raw)} ریال` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: "#7b8aa0", font: { size: 10 } } },
      y: { grid: { color: "#eef2f7" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 9 }, callback: (v) => Number(v).toLocaleString("fa-IR") } },
    },
  }), []);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.heroSkeleton} />
        <div className={styles.kpiGrid}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.kpiSkeleton} />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <strong>اتصال داشبورد برقرار نشد</strong>
        <p>{error}</p>
        <button type="button" onClick={fetchDashboard}>تلاش دوباره</button>
      </div>
    );
  }

  const financial = data?.financial || {};
  const banking = data?.banking || {};
  const activity = data?.activity || {};
  const charts = data?.charts || {};
  const calendarEvents = charts.calendar_events || [];

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}><FaRegClock /> نمای لحظه‌ای کسب‌وکار</span>
          <h2>تصویر مالی امروز، در یک نگاه</h2>
          <p>شاخص‌های کلیدی، جریان فروش، سررسیدها و آخرین رویدادهای مالی را یکجا دنبال کنید.</p>
        </div>
        <div className={styles.heroMetric}>
          <span>سود / زیان جاری</span>
          <strong>{money(financial.profit)}</strong>
          <small>ریال</small>
        </div>
      </section>

      <div className={styles.kpiGrid}>
        <KpiCard title="درآمد کل" value={financial.revenue} tone="indigo" icon={<FaArrowTrendUp />} />
        <KpiCard title="هزینه کل" value={financial.expense} tone="rose" icon={<FaMoneyBillTransfer />} />
        <KpiCard title="سود / زیان" value={financial.profit} tone="emerald" icon={<FaChartLine />} />
        <KpiCard title="چک‌های فعال" value={banking.active_cheques} tone="amber" icon={<FaFileInvoiceDollar />} suffix="فقره" />
        <KpiCard title="مشتریان بدهکار" value={debtors.length} tone="cyan" icon={<FaCoins />} suffix="نفر" />
      </div>

      <div className={styles.analyticsGrid}>
        <section className={`${styles.panel} ${styles.salesPanel}`}>
          <SectionTitle title="روند فروش" description="فروش ثبت‌شده در ماه‌های اخیر" />
          <div className={styles.chartCanvas}>
            <Line
              options={chartOptions}
              data={{
                labels: charts.monthly_sales?.labels || [],
                datasets: [{
                  label: "فروش",
                  data: charts.monthly_sales?.data || [],
                  borderColor: "#3157d5",
                  backgroundColor: "rgba(49,87,213,.10)",
                  pointBackgroundColor: "#3157d5",
                  pointBorderColor: "#fff",
                  pointBorderWidth: 3,
                  pointRadius: 4,
                  borderWidth: 2.5,
                  fill: true,
                  tension: .38,
                }],
              }}
            />
          </div>
        </section>

        <section className={styles.panel}>
          <SectionTitle title="کالاهای پرفروش" description="بالاترین مقدار فروش ثبت‌شده" />
          <div className={styles.chartCanvas}>
            <Bar
              options={chartOptions}
              data={{
                labels: charts.top_products?.labels || [],
                datasets: [{
                  label: "مقدار فروش",
                  data: charts.top_products?.data || [],
                  backgroundColor: "rgba(14,165,168,.72)",
                  borderRadius: 7,
                  maxBarThickness: 32,
                }],
              }}
            />
          </div>
        </section>
      </div>

      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.calendarPanel}`}>
          <SectionTitle title="تقویم مالی" description="سررسیدها و رویدادهای ثبت‌شده" />
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale="fa"
            firstDay={6}
            dayHeaderFormat={{ weekday: "short" }}
            events={calendarEvents}
            height={330}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
          />
        </section>

        <section className={`${styles.panel} ${styles.currencyPanel}`}>
          <SectionTitle title="نرخ ارز" description="آخرین نرخ‌های در دسترس" />
          <div className={styles.currencyGrid}>
            {currencies.length > 0 ? currencies.map((currency) => (
              <div key={currency.label} className={styles.currencyCard}>
                <span>{currency.label}</span>
                <strong>{money(currency.value)}</strong>
              </div>
            )) : <div className={styles.emptyCompact}>اطلاعات نرخ ارز در دسترس نیست.</div>}
          </div>
        </section>
      </div>

      <section className={styles.alertsLayer}>
        <SectionTitle title="هشدارهای نزدیک" description="مواردی که در هفت روز آینده نیاز به توجه دارند" />
        <ChequeAlertsWidget days={7} title="هشدارهای چک و اسناد" />
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.panel}>
          <SectionTitle title="بدهکاران" description="اشخاص با مانده بدهکار" />
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>ردیف</th><th>نام شخص</th><th>مانده بدهی</th></tr></thead>
              <tbody>
                {debtors.length ? debtors.slice(0, 8).map((debtor, index) => (
                  <tr key={debtor.id}>
                    <td>{(index + 1).toLocaleString("fa-IR")}</td>
                    <td className={styles.personName}>{debtor.name}</td>
                    <td><strong>{money(debtor.balance)}</strong> <small>ریال</small></td>
                  </tr>
                )) : <tr><td colSpan={3}><div className={styles.emptyCompact}>بدهکاری ثبت نشده است.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <SectionTitle title="آخرین فعالیت‌ها" description="جدیدترین رویدادهای ثبت‌شده در سیستم" />
          <div className={styles.timeline}>
            {(activity.last_documents || []).slice(0, 3).map((doc) => (
              <div key={`doc-${doc.id}`} className={styles.timelineItem}>
                <span className={`${styles.timelineDot} ${styles.dotIndigo}`} />
                <div><strong>سند {doc.document_number}</strong><small>{moment(doc.date).format("jYYYY/jMM/jDD")}</small></div>
                <b>{money(doc.total_amount)} <small>ریال</small></b>
              </div>
            ))}
            {(activity.last_payments || []).slice(0, 2).map((payment) => (
              <div key={`pay-${payment.id}`} className={styles.timelineItem}>
                <span className={`${styles.timelineDot} ${styles.dotRose}`} />
                <div><strong>پرداخت {payment.reference}</strong><small>{moment(payment.date).format("jYYYY/jMM/jDD")}</small></div>
                <b>{money(payment.amount)} <small>ریال</small></b>
              </div>
            ))}
            {(activity.last_receipts || []).slice(0, 2).map((receipt) => (
              <div key={`rec-${receipt.id}`} className={styles.timelineItem}>
                <span className={`${styles.timelineDot} ${styles.dotEmerald}`} />
                <div><strong>دریافت {receipt.reference}</strong><small>{moment(receipt.date).format("jYYYY/jMM/jDD")}</small></div>
                <b>{money(receipt.amount)} <small>ریال</small></b>
              </div>
            ))}
            {!activity.last_documents?.length && !activity.last_payments?.length && !activity.last_receipts?.length && (
              <div className={styles.emptyCompact}>هنوز فعالیتی ثبت نشده است.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
