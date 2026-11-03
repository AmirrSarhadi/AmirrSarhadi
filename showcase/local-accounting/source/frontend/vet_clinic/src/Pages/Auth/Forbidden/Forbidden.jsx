import { Link } from "react-router-dom";
import styles from "./Forbidden.module.css";

export default function Forbidden() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.code}>403</div>

                <h2>دسترسی غیرمجاز</h2>

                <p>
                    نقش کاربری شما اجازه مشاهده یا انجام این عملیات را ندارد. اگر فکر می‌کنی
                    این دسترسی باید برای شما فعال باشد، با مدیر سیستم تماس بگیر.
                </p>

                <Link to="/dashboard">بازگشت به داشبورد</Link>
            </div>
        </div>
    );
}