import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Link,
    NavLink,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import useAdminList from "../../hooks/useAdminList";
import {
    adminResources,
    catalogResources,
    resourcePath,
} from "../../services/adminResources";
import {
    getAdminRecord,
    saveAdminResource,
    writeAdmin,
} from "../../services/adminService";
import { formatPrice } from "../../utils/formatters";
import AdminListShell from "../../components/admin/AdminListShell";
import AdminTable from "../../components/admin/AdminTable";
import AdminActionDialog from "../../components/admin/AdminActionDialog";
import AdminResourceForm from "../../components/admin/AdminResourceForm";
import QueryStatus from "../../components/shared/QueryStatus";

export function AdminResourceList({ resource }) {
    return <ResourceList key={resource} resource={resource} />;
}

function ResourceList({ resource }) {
    const config = adminResources[resource];
    const state = useAdminList(resource);
    const location = useLocation();
    const [deleting, setDeleting] = useState(null);
    const path = resourcePath(resource);
    const columns = [
        [
            "name",
            config.itemLabel || (resource === "banners" ? "عنوان" : "نام"),
            (row) => row.name || row.title || row.question || "بدون عنوان",
        ],
        ...(resource === "plans"
            ? [
                  ["price", "قیمت", (row) => formatPrice(row.price)],
                  ["subscriptions_count", "اشتراک‌ها"],
              ]
            : []),
        ...(resource === "car-models" ? [["brand_name", "برند"]] : []),
        ...(resource === "car-trims" ? [["car_model_name", "مدل"]] : []),
        ...(resource === "cities" ? [["province_name", "استان"]] : []),
        ...(resource === "neighborhoods" ? [["city_name", "شهر"]] : []),
        ["is_active", config.activeLabel || "فعال", (row) => (row.is_active ? "بله" : "خیر")],
    ];
    return (
        <>
            <AdminListShell
                title={config.title}
                state={state}
                filters={[
                    {
                        name: "is_active",
                        label: "فعال بودن",
                        choices: { true: "فعال", false: "غیرفعال" },
                    },
                ]}
                action={
                    <Link
                        className="btn btn-primary"
                        to={`${path}/new`}
                        state={{
                            returnTo: location.pathname + location.search,
                        }}
                    >
                        افزودن {config.singular}
                    </Link>
                }
            >
                {(rows) => (
                    <AdminTable
                        rows={rows}
                        columns={columns}
                        renderActions={(row) => (
                            <>
                                <Link
                                    className="btn btn-outline-primary btn-sm"
                                    to={`${path}/${row.id}/edit`}
                                    state={{
                                        returnTo:
                                            location.pathname + location.search,
                                    }}
                                >
                                    ویرایش
                                </Link>
                                {config.deletable && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => setDeleting(row)}
                                    >
                                        حذف
                                    </button>
                                )}
                            </>
                        )}
                    />
                )}
            </AdminListShell>
            {deleting && (
                <AdminActionDialog
                    title={`حذف ${config.singular} «${deleting.name || deleting.title || `#${deleting.id}`}»؟`}
                    description="رکورد حذف می‌شود. اگر اطلاعات دیگری به آن وابسته باشند، حذف انجام نمی‌شود؛ در آن حالت می‌توانید آن را غیرفعال کنید."
                    confirmLabel="حذف رکورد"
                    submit={() =>
                        writeAdmin(
                            `${resource}/${deleting.id}`,
                            undefined,
                            "DELETE",
                        )
                    }
                    onDone={() => setDeleting(null)}
                    onCancel={() => {
                        setDeleting(null);
                        state.query.refetch();
                    }}
                />
            )}
        </>
    );
}
export function AdminCatalogPage() {
    const { resource = "brands" } = useParams();
    if (!catalogResources.includes(resource))
        return <p role="alert">این بخش پیدا نشد.</p>;
    return (
        <>
            <nav
                className="d-flex gap-3 flex-wrap mb-4"
                aria-label="کاتالوگ و موقعیت‌ها"
            >
                {catalogResources.map((name) => (
                    <NavLink key={name} to={resourcePath(name)}>
                        {adminResources[name].title}
                    </NavLink>
                ))}
            </nav>
            <AdminResourceList key={resource} resource={resource} />
        </>
    );
}
export function AdminResourceEditPage({ resource: fixedResource }) {
    const { resource: paramResource, recordId } = useParams();
    const resource = fixedResource || paramResource;
    const config = adminResources[resource];
    const valid = Boolean(config) && (!recordId || /^[1-9]\d*$/.test(recordId));
    const location = useLocation();
    const navigate = useNavigate();
    const query = useQuery({
        queryKey: ["admin", resource, recordId],
        queryFn: ({ signal }) => getAdminRecord(resource, recordId, signal),
        enabled: valid && Boolean(recordId),
        retry: false,
    });
    if (!valid) return <p role="alert">این بخش پیدا نشد.</p>;
    const path = resourcePath(resource);
    const returnTo = location.state?.returnTo?.startsWith(path)
        ? location.state.returnTo
        : path;
    const editor = (
        <AdminResourceForm
            key={`${resource}:${recordId || "new"}`}
            title={`${recordId ? "ویرایش" : "افزودن"} ${config.singular}`}
            fields={config.fields}
            record={query.data}
            returnTo={returnTo}
            save={(data) => saveAdminResource(resource, recordId, data)}
            onSaved={() => navigate(returnTo, { replace: true })}
        />
    );
    return recordId ? (
        <QueryStatus query={query}>{editor}</QueryStatus>
    ) : (
        editor
    );
}
