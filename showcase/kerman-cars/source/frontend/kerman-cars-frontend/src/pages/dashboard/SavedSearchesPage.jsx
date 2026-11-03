import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import QueryStatus from "../../components/shared/QueryStatus";
import useCatalog from "../../hooks/useCatalog";
import { adminDate } from "../../services/adminLabels";
import "./AccountActivity.scss";
import { savedSearchLabels as labels, savedSearchValue } from "../../services/savedSearchData";

export default function SavedSearchesPage() {
    const brands = useCatalog("cars/brands/");
    const models = useCatalog("cars/models/");
    const cities = useCatalog("locations/cities/");
    const display = (key, value) => {
        const catalog = { brand: brands.data, car_model: models.data, city: cities.data }[key];
        if (catalog) return catalog.find(row => String(row.id) === String(value))?.name || `#${value}`;
        return savedSearchValue(key, value);
    };
    const client = useQueryClient();
    const query = useQuery({ queryKey: ["saved-searches"], queryFn: async ({ signal }) => (await apiClient.get("engagement/saved-searches/", { signal })).data });
    const toggle = useMutation({ mutationFn: ({ id, enabled }) => apiClient.patch(`engagement/saved-searches/${id}/alerts/`, { alerts_enabled: enabled }), onSuccess: () => client.invalidateQueries({ queryKey: ["saved-searches"] }) });
    const remove = useMutation({ mutationFn: id => apiClient.delete(`engagement/saved-searches/${id}/`), onSuccess: () => client.invalidateQueries({ queryKey: ["saved-searches"] }) });
    return <section className="account-activity"><div className="account-activity__heading"><div><h1>جست‌وجوهای ذخیره‌شده</h1><p>فیلترهای قبلی خود را دوباره اجرا کنید.</p></div><Link to="/cars">جست‌وجوی خودرو</Link></div>
        {toggle.isError && <p role="alert">{toggle.error.message}</p>}
        {remove.isError && <p role="alert">{remove.error.message}</p>}
        <QueryStatus query={query}>{query.data?.length ? <ul className="account-activity__list">{query.data.map(item => <li key={item.id} className="account-activity__notification">
            <h2>{item.filters.search || "جست‌وجوی ذخیره‌شده"}</h2><p>ثبت: {adminDate(item.created_at)}</p><dl>{Object.entries(item.filters).map(([key, value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{display(key, value)}</dd></div>)}</dl>
            <label><input type="checkbox" checked={item.alerts_enabled} disabled={toggle.isPending} onChange={event => toggle.mutate({ id: item.id, enabled: event.target.checked })} /> اعلان آگهی جدید در سایت</label>
            <p>اعلان‌ها فقط برای آگهی‌های منتشرشده پس از فعال‌سازی هستند.</p>
            <div className="d-flex gap-3 flex-wrap"><Link to={`/cars?${new URLSearchParams(item.filters).toString()}`}>مشاهده نتیجه‌ها</Link><button type="button" className="btn btn-outline-danger" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>حذف جست‌وجو</button></div>
        </li>)}</ul> : <div className="account-activity__empty"><h2>هنوز جست‌وجویی ذخیره نکرده‌اید</h2><p>در فهرست خودروها فیلترها را انتخاب و ذخیره کنید.</p></div>}</QueryStatus>
    </section>;
}
