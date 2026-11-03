import { mediaUrl } from "./listingData.js";

export function formatBusinessHours(value) {
    if (typeof value === "string") return value || "ثبت نشده";
    if (!value || typeof value !== "object") return "ثبت نشده";
    if (typeof value.description === "string" && value.description.trim())
        return value.description;
    const days = {
        saturday: "شنبه",
        sunday: "یکشنبه",
        monday: "دوشنبه",
        tuesday: "سه‌شنبه",
        wednesday: "چهارشنبه",
        thursday: "پنجشنبه",
        friday: "جمعه",
    };
    return (
        Object.entries(value)
            .filter(([, hours]) => typeof hours === "string" && hours)
            .map(([day, hours]) => `${days[day] || day}: ${hours}`)
            .join("، ") || "ثبت نشده"
    );
}

export function normalizeDealer(data) {
    return {
        ...data,
        businessName: data.business_name,
        managerName: data.manager_name || "",
        city: data.city_name || "",
        neighborhood: data.neighborhood_name || "",
        coverImage: mediaUrl(data.cover_image),
        logo: mediaUrl(data.logo),
        verified: true,
        workingHours: formatBusinessHours(data.business_hours),
        joinedAt: data.created_at
            ? new Intl.DateTimeFormat("fa-IR", {
                  timeZone: "Asia/Tehran",
              }).format(new Date(data.created_at))
            : "",
        listingsCount: data.listings_count,
    };
}
