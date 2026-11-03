import { useQuery } from "@tanstack/react-query";
import { getAdminSingleton, writeAdmin } from "../../services/adminService";
import { homepageFields } from "../../services/adminResources";
import AdminResourceForm from "../../components/admin/AdminResourceForm";
import QueryStatus from "../../components/shared/QueryStatus";
import "./AdminPanel.scss";
import "./AdminSettingsPage.scss";

export default function AdminSettingsPage() {
    const query = useQuery({
        queryKey: ["admin", "homepage/settings"],
        queryFn: ({ signal }) => getAdminSingleton("homepage/settings", signal),
    });
    return (
        <QueryStatus query={query}>
            {query.data && (
                <AdminResourceForm
                    title="تنظیمات صفحه اصلی"
                    fields={homepageFields}
                    record={query.data}
                    save={(data) => writeAdmin("homepage/settings", data)}
                    returnTo="/admin"
                    stay
                />
            )}
        </QueryStatus>
    );
}
