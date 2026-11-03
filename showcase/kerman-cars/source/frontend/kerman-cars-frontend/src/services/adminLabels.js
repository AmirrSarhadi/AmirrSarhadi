export const dealerStatuses = {
    draft: "پیش‌نویس",
    pending: "در انتظار بررسی",
    approved: "تأییدشده",
    rejected: "ردشده",
    suspended: "تعلیق‌شده",
};
export const reportStatuses = {
    pending: "در انتظار بررسی",
    resolved: "رسیدگی‌شده",
    rejected: "ردشده",
};
export const reportReasons = {
    fraud: "کلاهبرداری",
    wrong_info: "اطلاعات نادرست",
    unreal_price: "قیمت غیرواقعی",
    duplicate: "آگهی تکراری",
    inappropriate: "محتوای نامناسب",
    other: "سایر",
};
export const subscriptionStatuses = {
    pending: "در انتظار",
    active: "فعال",
    expired: "منقضی",
    canceled: "لغوشده",
};
export const paymentStatuses = {
    pending: "در انتظار",
    paid: "پرداخت‌شده",
    failed: "ناموفق",
    canceled: "لغوشده",
};
export const userRoles = { PERSONAL: "شخصی", DEALER: "نمایشگاه" };
export const yesNo = (value) => (value ? "بله" : "خیر");
export function adminDate(value) {
    if (!value || Number.isNaN(Date.parse(value))) return "ثبت نشده";
    return new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tehran",
    }).format(new Date(value));
}
