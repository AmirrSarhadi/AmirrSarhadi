import { Component } from "react";
import { FiAlertTriangle, FiHome, FiRefreshCw } from "react-icons/fi";
import styles from "./AppErrorBoundary.module.css";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("Unhandled UI error", error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign("/dashboard");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className={styles.page} role="alert">
        <section className={styles.card}>
          <span className={styles.icon}><FiAlertTriangle /></span>
          <span className={styles.eyebrow}>خطای رابط کاربری</span>
          <h1>نمایش این بخش با مشکل روبه‌رو شد</h1>
          <p>
            اطلاعات ثبت‌شده شما در سرور تغییر نکرده است. صفحه را دوباره بارگذاری کنید؛
            اگر مشکل ادامه داشت به داشبورد برگردید و عملیات را دوباره انجام دهید.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={this.handleRetry}>
              <FiRefreshCw /> بارگذاری دوباره
            </button>
            <button type="button" className={styles.secondary} onClick={this.handleHome}>
              <FiHome /> بازگشت به داشبورد
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
