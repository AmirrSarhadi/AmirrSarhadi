import { FiAlertCircle, FiInbox, FiLoader, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import styles from "./ERP.module.css";

export function PageHero({ eyebrow, title, description, icon, actions, meta }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        {icon ? <div className={styles.heroIcon}>{icon}</div> : null}
        <div className={styles.heroCopy}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
          {meta ? <div className={styles.heroMeta}>{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className={styles.heroActions}>{actions}</div> : null}
    </section>
  );
}

export function StatGrid({ children }) { return <div className={styles.statGrid}>{children}</div>; }

export function StatCard({ label, value, hint, icon, tone = "primary" }) {
  return (
    <article className={`${styles.statCard} ${styles[`tone_${tone}`] || ""}`}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        {icon ? <span className={styles.statIcon}>{icon}</span> : null}
      </div>
      <strong className={styles.statValue}>{value}</strong>
      {hint ? <small className={styles.statHint}>{hint}</small> : null}
    </article>
  );
}

export function DataPanel({ title, description, actions, children, className = "" }) {
  return (
    <section className={`${styles.panel} ${className}`}>
      {(title || actions) ? (
        <header className={styles.panelHeader}>
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className={styles.panelActions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

export function FilterBar({ search, onSearch, searchPlaceholder = "جستجو...", children, onClear, resultText }) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.searchBox}>
        <FiSearch />
        <input value={search ?? ""} onChange={(e) => onSearch?.(e.target.value)} placeholder={searchPlaceholder} />
        {search ? <button type="button" onClick={() => onSearch?.("")} aria-label="پاک کردن جستجو"><FiX /></button> : null}
      </div>
      <div className={styles.filters}>{children}</div>
      <div className={styles.filterTail}>
        {resultText ? <span className={styles.resultText}>{resultText}</span> : null}
        {onClear ? <button type="button" className={styles.clearButton} onClick={onClear}>پاک کردن فیلترها</button> : null}
      </div>
    </div>
  );
}

const statusTone = {
  APPROVED: "success", PAID: "success", COMPLETED: "success", ACTIVE: "success",
  DRAFT: "neutral", PENDING: "warning", SENT: "info", RECEIVED: "success",
  REJECTED: "danger", REVERSED: "danger", CANCELLED: "danger", INACTIVE: "neutral",
};

export function StatusBadge({ status, children, tone }) {
  const resolved = tone || statusTone[String(status || "").toUpperCase()] || "neutral";
  return <span className={`${styles.status} ${styles[`status_${resolved}`]}`}>{children ?? status ?? "—"}</span>;
}

export function EmptyState({ title = "اطلاعاتی پیدا نشد", description, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><FiInbox /></span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return <button className={`${styles.primaryButton} ${className}`} {...props}>{children}</button>;
}
export function SecondaryButton({ children, className = "", ...props }) {
  return <button className={`${styles.secondaryButton} ${className}`} {...props}>{children}</button>;
}
export function IconButton({ children, label, tone = "default", className = "", ...props }) {
  return <button aria-label={label} title={label} className={`${styles.iconButton} ${styles[`icon_${tone}`] || ""} ${className}`} {...props}>{children}</button>;
}

export function LoadingState({ title = "در حال دریافت اطلاعات...", description }) {
  return (
    <div className={styles.feedbackState} role="status" aria-live="polite" aria-busy="true">
      <span className={`${styles.feedbackIcon} ${styles.loadingIcon}`}><FiLoader /></span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function ErrorState({ title = "دریافت اطلاعات انجام نشد", description = "ارتباط با سرویس را بررسی کنید و دوباره تلاش کنید.", onRetry }) {
  return (
    <div className={`${styles.feedbackState} ${styles.errorState}`} role="alert">
      <span className={styles.feedbackIcon}><FiAlertCircle /></span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {onRetry ? (
        <button type="button" className={styles.secondaryButton} onClick={onRetry}>
          <FiRefreshCw /> تلاش دوباره
        </button>
      ) : null}
    </div>
  );
}
