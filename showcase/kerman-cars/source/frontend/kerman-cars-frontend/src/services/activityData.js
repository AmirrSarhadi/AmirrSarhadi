const listingKinds = new Set([
    "listing_approved",
    "saved_search_match",
    "listing_rejected",
    "listing_needs_edit",
    "listing_expiring",
]);
const subscriptionKinds = new Set([
    "subscription_expiring",
    "subscription_expired",
]);
export function notificationDestination(notification) {
    if (notification.kind === "report_reviewed") return "/dashboard/reports";
    if (["dealer_approved", "dealer_rejected", "dealer_suspended"].includes(notification.kind))
        return "/dealer/status";
    // Notification data is content, not an arbitrary URL or navigation command.
    if (listingKinds.has(notification.kind)) {
        const id = notification.data?.listing_id;
        if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
            return null;
        return ["listing_approved", "saved_search_match"].includes(notification.kind)
            ? `/cars/${id}`
            : `/listing/${id}/edit`;
    }
    if (subscriptionKinds.has(notification.kind))
        return "/dealer-dashboard/subscription";
    return null;
}
export function historyLimit(value) {
    const parsed = Number(value);
    return [20, 50, 100].includes(parsed) ? parsed : 50;
}
