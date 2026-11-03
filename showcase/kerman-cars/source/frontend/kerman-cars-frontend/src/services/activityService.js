import apiClient from "./apiClient.js";
import queryClient from "./queryClient.js";
import useAuthStore from "../store/authStore.js";
import { normalizeListing } from "./listingData.js";
export async function getNotifications(params, signal) {
    return (await apiClient.get("notifications/", { params, signal })).data;
}
export async function getUnreadCount(signal) {
    return (await apiClient.get("notifications/unread-count/", { signal }))
        .data;
}
export async function markNotificationsRead(id) {
    const epoch = useAuthStore.getState().sessionVersion;
    const path =
        id == null ? "notifications/read-all/" : `notifications/${id}/read/`;
    const { data } = await apiClient.post(path, {});
    if (useAuthStore.getState().sessionVersion !== epoch)
        throw new Error(
            "حساب کاربری تغییر کرده است؛ اعلان‌های حساب فعلی را دوباره دریافت کنید.",
        );
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    return data;
}
export async function getViewHistory(limit, signal) {
    const { data } = await apiClient.get("engagement/history/", {
        params: { limit },
        signal,
    });
    return data.map((row) => ({
        ...row,
        listing: normalizeListing(row.listing),
    }));
}
