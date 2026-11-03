import ListingReviewHistory from "../../components/admin/ListingReviewHistory";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import useAdminList from "../../hooks/useAdminList";
import useAuthStore from "../../store/authStore";
import {
    getAdminRecord,
    writeAdmin,
    requestListingEdits,
} from "../../services/adminService";
import { adminRecords, adminActions } from "../../services/adminRecords";
import { mediaUrl } from "../../services/listingData";
import { formatBusinessHours } from "../../services/dealerData";
import AdminListShell from "../../components/admin/AdminListShell";
import AdminTable from "../../components/admin/AdminTable";
import AdminActionDialog from "../../components/admin/AdminActionDialog";
import QueryStatus from "../../components/shared/QueryStatus";

export function AdminRecordListPage({ resource }) {
    const config = adminRecords[resource];
    const state = useAdminList(resource);
    const location = useLocation();
    return (
        <AdminListShell
            title={config.title}
            state={state}
            filters={config.filters}
        >
            {(rows) => (
                <AdminTable
                    columns={config.columns}
                    rows={rows}
                    renderActions={(row) => (
                        <Link
                            className="btn btn-outline-primary btn-sm"
                            to={`/admin/${resource}/${row.id}`}
                            state={{
                                returnTo: location.pathname + location.search,
                            }}
                        >
                            مشاهده و بررسی
                        </Link>
                    )}
                />
            )}
        </AdminListShell>
    );
}

export function AdminRecordDetailPage({ resource }) {
    const { recordId } = useParams();
    return (
        <AdminRecordDetail
            key={`${resource}:${recordId}`}
            resource={resource}
        />
    );
}

function AdminRecordDetail({ resource }) {
    const { recordId } = useParams();
    const location = useLocation();
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [action, setAction] = useState(null);
    const config = adminRecords[resource];
    const validId = /^[1-9]\d*$/.test(recordId);
    const query = useQuery({
        queryKey: ["admin", resource, recordId],
        queryFn: ({ signal }) => getAdminRecord(resource, recordId, signal),
        enabled: validId,
        retry: false,
    });
    const returnTo = location.state?.returnTo?.startsWith(`/admin/${resource}`)
        ? location.state.returnTo
        : `/admin/${resource}`;
    if (!validId) return <p role="alert">رکورد پیدا نشد.</p>;
    return (
        <section>
            <div className="admin-page-heading">
                <h1>
                    {config.title} — بررسی #{recordId}
                </h1>
                <Link to={returnTo}>بازگشت به فهرست</Link>
            </div>
            <QueryStatus query={query}>
                {query.data && (
                    <>
                        <div className="admin-settings-card p-4">
                            <dl className="row">
                                {config.details.map(([key, label, render]) => (
                                    <div
                                        className="col-12 col-md-6 mb-3"
                                        key={key}
                                    >
                                        <dt>{label}</dt>
                                        <dd
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {render
                                                ? render(query.data)
                                                : query.data[key] === ""
                                                  ? "ثبت نشده"
                                                  : (query.data[key] ??
                                                    "ثبت نشده")}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {resource === "dealers" && (
                                <>
                                    <h2>ساعات کاری</h2>
                                    <p>
                                        {formatBusinessHours(
                                            query.data.business_hours,
                                        )}
                                    </p>
                                    <div className="d-flex gap-3 flex-wrap">
                                        {[
                                            ["license_document", "مدرک مجوز"],
                                            [
                                                "national_card_document",
                                                "مدرک هویت",
                                            ],
                                        ].map(
                                            ([name, label]) =>
                                                query.data[name] && (
                                                    <a
                                                        key={name}
                                                        href={mediaUrl(
                                                            query.data[name],
                                                        )}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        دریافت {label}
                                                    </a>
                                                ),
                                        )}
                                    </div>
                                </>
                            )}
                            {resource === "listings" && (
                                <>
                                    <h2>تصاویر آگهی</h2>
                                    {query.data.images?.length ? (
                                        <div className="row g-3">
                                            {query.data.images.map(
                                                (image, index) => (
                                                    <div
                                                        className="col-6 col-lg-3"
                                                        key={image.id}
                                                    >
                                                        <a
                                                            href={mediaUrl(
                                                                image.image,
                                                            )}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <img
                                                                src={mediaUrl(
                                                                    image.image,
                                                                )}
                                                                alt={`تصویر ${index + 1} آگهی`}
                                                                style={{
                                                                    width: "100%",
                                                                    height: 160,
                                                                    objectFit:
                                                                        "cover",
                                                                }}
                                                            />
                                                        </a>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <p>تصویری ثبت نشده است.</p>
                                    )}
                                </>
                            )}
                            {resource === "reports" && (
                                <Link
                                    to={`/admin/listings/${query.data.listing}`}
                                >
                                    بررسی آگهی گزارش‌شده
                                </Link>
                            )}
                        </div>
                        <div className="d-flex gap-3 flex-wrap my-4">
                            {adminActions(
                                resource,
                                query.data,
                                currentUserId,
                            ).map((item) => (
                                <button
                                    type="button"
                                    className={`btn ${item.intent === "primary" ? "btn-primary" : "btn-outline-danger"}`}
                                    key={item.label}
                                    onClick={() => setAction({ ...item, expectedUpdatedAt: query.data.updated_at })}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => query.refetch()}
                                disabled={query.isFetching}
                            >
                                دریافت وضعیت تازه
                            </button>
                        </div>
                        {resource === "listings" && <ListingReviewHistory key={recordId} listingId={recordId} />}
                        {resource === "payments" && (
                            <p>
                                این صفحه وضعیت ثبت‌شدهٔ پرداخت‌ها را نمایش
                                می‌دهد. تأیید بانکی یا بازپرداخت وجه از این صفحه
                                انجام نمی‌شود.
                            </p>
                        )}
                    </>
                )}
            </QueryStatus>
            {action && (
                <AdminActionDialog
                    key={action.label}
                    title={`${action.label} — ${query.data?.business_name || query.data?.title || query.data?.phone || query.data?.user_phone || `#${recordId}`}`}
                    description={action.description}
                    confirmLabel={action.label}
                    fields={action.fields}
                    intent={action.intent}
                    submit={(values) =>
                        action.review
                            ? requestListingEdits(
                                  recordId,
                                  values.rejection_reason,
                                  action.expectedUpdatedAt,
                              )
                            : writeAdmin(action.path, {
                                  ...action.data,
                                  ...(["listings", "dealers"].includes(resource) ? { expected_updated_at: action.expectedUpdatedAt } : {}),
                                  ...values,
                              })
                    }
                    onDone={() => setAction(null)}
                    onCancel={() => {
                        setAction(null);
                        query.refetch();
                    }}
                />
            )}
        </section>
    );
}
