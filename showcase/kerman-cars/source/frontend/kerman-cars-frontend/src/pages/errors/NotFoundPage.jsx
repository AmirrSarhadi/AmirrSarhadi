import { Link } from "react-router-dom";

function NotFoundPage() {
    return (
        <div className="kc-container py-5">
            <div className="kc-card p-5 text-center">
                <div className="display-2 fw-bold text-primary">
                    404
                </div>

                <h1 className="h4 fw-bold mt-3">
                    صفحه موردنظر پیدا نشد
                </h1>

                <p className="text-secondary">
                    آدرس واردشده معتبر نیست.
                </p>

                <Link to="/" className="btn btn-primary mt-2">
                    بازگشت به صفحه اصلی
                </Link>
            </div>
        </div>
    );
}

export default NotFoundPage;