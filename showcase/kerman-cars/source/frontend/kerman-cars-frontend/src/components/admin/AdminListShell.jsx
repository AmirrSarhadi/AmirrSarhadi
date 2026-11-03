import { useId, useRef } from "react";
import QueryStatus from "../shared/QueryStatus";
import Pagination from "../shared/Pagination";
import "../../pages/admin/AdminPanel.scss";

export default function AdminListShell({
    title,
    description,
    state,
    filters = [],
    action,
    children,
}) {
    const searchId = useId();
    const searchRef = useRef(null);
    return (
        <section>
            <div className="admin-page-heading">
                <div>
                    <h1>{title}</h1>
                    {description && <p>{description}</p>}
                </div>
                {action}
            </div>
            <div className="d-flex gap-3 flex-wrap align-items-end mb-4">
                <div>
                    <label htmlFor={searchId} className="form-label">
                        جست‌وجو
                    </label>
                    <div className="d-flex gap-2">
                        <input
                            ref={searchRef}
                            id={searchId}
                            className="form-control"
                            type="search"
                            value={state.search}
                            onChange={(e) =>
                                state.change("search", e.target.value)
                            }
                            onCompositionStart={state.onCompositionStart}
                            onCompositionEnd={state.onCompositionEnd}
                            onKeyDown={state.onSearchEnter}
                        />
                        {state.search && (
                            <button
                                type="button"
                                aria-label="پاک کردن جست‌وجو"
                                onClick={() => {
                                    state.change("search", "");
                                    searchRef.current.focus();
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
                {filters.map(({ name, label, choices }) => (
                    <div key={name}>
                        <label
                            htmlFor={`${searchId}-${name}`}
                            className="form-label"
                        >
                            {label}
                        </label>
                        <select
                            id={`${searchId}-${name}`}
                            className="form-select"
                            value={state.url.get(name) || ""}
                            onChange={(e) => state.change(name, e.target.value)}
                        >
                            <option value="">همه</option>
                            {Object.entries(choices).map(([value, text]) => (
                                <option value={value} key={value}>
                                    {text}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={state.reset}
                >
                    پاک‌کردن فیلترها
                </button>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={state.query.isFetching}
                    onClick={() => state.query.refetch()}
                >
                    بروزرسانی
                </button>
            </div>
            <p role="status">
                {state.query.data
                    ? `${new Intl.NumberFormat("fa-IR").format(state.query.data.count)} نتیجه`
                    : ""}
            </p>
            <QueryStatus query={state.query}>
                {state.query.data?.results.length ? (
                    children(state.query.data.results)
                ) : (
                    <p role="status">رکوردی با این شرایط پیدا نشد.</p>
                )}
            </QueryStatus>
            <Pagination
                page={state.page}
                data={state.query.data}
                onChange={(page) => state.change("page", String(page))}
            />
        </section>
    );
}
