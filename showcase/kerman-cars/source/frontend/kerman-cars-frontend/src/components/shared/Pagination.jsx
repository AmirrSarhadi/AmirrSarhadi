export default function Pagination({ page, data, onChange }) {
    if (!data || (!data.previous && !data.next)) return null;
    return (
        <nav
            aria-label="صفحه‌بندی"
            className="d-flex align-items-center gap-3 py-4"
        >
            <button
                type="button"
                className="btn btn-outline-primary"
                disabled={!data.previous}
                onClick={() => onChange(page - 1)}
            >
                صفحه قبل
            </button>
            <span aria-current="page">
                صفحه {new Intl.NumberFormat("fa-IR").format(page)}
            </span>
            <button
                type="button"
                className="btn btn-outline-primary"
                disabled={!data.next}
                onClick={() => onChange(page + 1)}
            >
                صفحه بعد
            </button>
        </nav>
    );
}
