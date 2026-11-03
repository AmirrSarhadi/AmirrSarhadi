import { ownerDealerBody } from "./dealerProfileData.js";
import apiClient from "./apiClient.js";
import queryClient from "./queryClient.js";
import useAuthStore from "../store/authStore.js";
import { normalizeUser } from "./authService.js";

export async function getOwnerDealer(signal) {
    const epoch = useAuthStore.getState().sessionVersion;
    let profile;
    try {
        profile = (await apiClient.get("accounts/dealer-profile/", { signal }))
            .data;
    } catch (error) {
        if (error.response?.status !== 404) throw error;
        profile = null;
    }
    const { data } = await apiClient.get("accounts/profile/", { signal });
    if (useAuthStore.getState().sessionVersion !== epoch)
        throw new Error("حساب کاربری تغییر کرده است.");
    const user = normalizeUser(data);
    useAuthStore.getState().updateUser(user);
    queryClient.setQueryData(["session-profile", user.id], user);
    return profile;
}
export async function saveOwnerDealer(existing, values, files, onConfirmed) {
    const epoch = useAuthStore.getState().sessionVersion;
    const { data } = await apiClient.request({
        url: "accounts/dealer-profile/",
        method: existing ? "PATCH" : "POST",
        data: ownerDealerBody(values, files),
    });
    if (useAuthStore.getState().sessionVersion !== epoch)
        throw new Error(
            "حساب کاربری تغییر کرده است؛ وضعیت را دوباره دریافت کنید.",
        );
    onConfirmed?.();
    queryClient.setQueryData(["owner-dealer"], data);
    await Promise.all(
        ["owner-dealer", "dealers", "dealer", "admin"].map((key) =>
            queryClient.invalidateQueries({ queryKey: [key] }),
        ),
    );
    return data;
}
export async function getDealerAnalytics(days, signal) {
    return (
        await apiClient.get("engagement/analytics/dealer/", {
            params: { days },
            signal,
        })
    ).data;
}
export async function getActiveSubscription(signal) {
    try {
        return (await apiClient.get("subscriptions/me/active/", { signal }))
            .data;
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
}
export async function getOwnerHistory(resource, page, signal) {
    const path =
        resource === "payments"
            ? "billing/payments/"
            : "subscriptions/me/history/";
    return (
        await apiClient.get(path, { params: { page, page_size: 10 }, signal })
    ).data;
}
