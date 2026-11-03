import apiClient from "./apiClient.js";
import queryClient from "./queryClient.js";
import useAuthStore from "../store/authStore.js";

const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => value !== "" && value != null,
        ),
    );
export async function getAdminList(resource, params = {}, signal) {
    return (
        await apiClient.get(`admin/${resource}/`, {
            params: cleanParams(params),
            signal,
        })
    ).data;
}
export async function getAdminRecord(resource, id, signal) {
    return (await apiClient.get(`admin/${resource}/${id}/`, { signal })).data;
}
export async function getAdminSingleton(path, signal) {
    return (await apiClient.get(`admin/${path}/`, { signal })).data;
}
export async function getAdminChoices(resource, signal) {
    const rows = [];
    for (let page = 1; ; page++) {
        const data = await getAdminList(
            resource,
            { page, page_size: 100 },
            signal,
        );
        rows.push(...data.results);
        if (!data.next) return rows;
    }
}
export async function refreshAdminData() {
    await Promise.all(
        [
            "admin",
            "admin-options",
            "listings",
            "related-listings",
            "my-listings",
            "listing",
            "dealers",
            "dealer",
            "catalog",
            "cities",
            "homepage",
            "articles",
            "article",
            "homepage-listings",
            "favorites",
            "view-history",
            "notifications",
            "owner-dealer",
            "dealer-subscription",
            "dealer-history",
            "dealer-analytics",
        ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
}
async function writeApi(path, data, method = "PATCH") {
    const sessionVersion = useAuthStore.getState().sessionVersion;
    const response = await apiClient.request({ method, url: path, data });
    if (useAuthStore.getState().sessionVersion !== sessionVersion)
        throw new Error(
            "حساب کاربری تغییر کرده است؛ وضعیت را دوباره دریافت کنید.",
        );
    await refreshAdminData();
    return response.data;
}
export function writeAdmin(path, data, method = "PATCH") {
    return writeApi(`admin/${path}/`, data, method);
}
export function requestListingEdits(id, reason, expectedUpdatedAt) {
    return writeApi(`moderation/listings/${id}/review/`, {
        status: "needs_edit",
        expected_updated_at: expectedUpdatedAt,
        rejection_reason: reason,
    });
}
export async function saveAdminResource(resource, id, data) {
    let body = data;
    if (Object.values(data).some((value) => value instanceof File)) {
        body = new FormData();
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined)
                body.append(key, value === null ? "" : value);
        }
    }
    return writeAdmin(
        id ? `${resource}/${id}` : resource,
        body,
        id ? "PATCH" : "POST",
    );
}
