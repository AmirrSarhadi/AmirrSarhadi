export const statusLabels = {
    draft: "پیش‌نویس",
    pending: "در انتظار بررسی",
    published: "منتشر شده",
    rejected: "رد شده",
    needs_edit: "نیازمند اصلاح",
    inactive: "غیرفعال",
    sold: "فروخته شده",
};
export const bodyStatuses = {
    SALIM: "سالم/بی‌رنگ",
    YEK_TIKE: "یک تکه رنگ",
    CHAND_TIKE: "چند تکه رنگ",
    KAMEL_RANG: "کامل رنگ",
    NIAZ_BE_TOZIH: "نیازمند توضیح",
};
export const transmissions = {
    manual: "دستی",
    automatic: "اتومات",
    cvt: "CVT",
    dct: "DCT",
};
export const fuelTypes = {
    gasoline: "بنزینی",
    diesel: "دیزلی",
    hybrid: "هیبریدی",
    electric: "برقی",
    cng: "دوگانه‌سوز",
};
export const priceTypes = {
    fixed: "قطعی",
    negotiable: "قابل مذاکره",
    contact: "تماس بگیرید",
    installment: "اقساطی",
};
export const conditions = {
    salim: "سالم",
    needs_repair: "نیازمند تعمیر",
    replaced: "تعویض شده",
    unknown: "نامشخص",
    minor_damage: "ضربه جزئی",
    repaired: "تعمیر شده",
    damaged: "آسیب‌دیده",
    complete: "کامل",
    incomplete: "ناقص",
    inheritance: "انحصار وراثت",
};
export const emptyImage = "/car-placeholder.svg";

export function mediaUrl(path, apiBase = import.meta.env?.VITE_API_BASE_URL) {
    if (!path) return emptyImage;
    return apiBase && /^https?:\/\//.test(apiBase)
        ? new URL(path, apiBase).href
        : path;
}

export function normalizeListing(data) {
    const photos = (data.images || []).map((image) => mediaUrl(image.image));
    return {
        ...data,
        raw: data,
        publicCode: data.public_code,
        brand: data.brand_name || "",
        model: data.car_model_name || "",
        trim: data.trim_name || "",
        city: data.city_name || "",
        neighborhood: data.neighborhood_name || "",
        year: data.production_year,
        price: data.price == null ? null : Number(data.price),
        priceType: data.price_type,
        image: data.cover_image
            ? mediaUrl(data.cover_image)
            : photos[0] || emptyImage,
        images: photos.length
            ? photos
            : [data.cover_image ? mediaUrl(data.cover_image) : emptyImage],
        imageRecords: data.images || [],
        statusLabel: data.is_expired ? "منقضی‌شده" : statusLabels[data.status] || data.status,
        isFeatured: data.is_featured,
        isVerified: Boolean(data.is_verified_dealer),
        sellerType: data.seller_type || "personal",
        createdAt:
            data.created_at || data.published_at
                ? new Intl.DateTimeFormat("fa-IR", {
                      timeZone: "Asia/Tehran",
                  }).format(new Date(data.created_at || data.published_at))
                : "",
        viewsCount: data.raw_views_count ?? data.view_count ?? 0,
        transmission: transmissions[data.transmission] || "ثبت نشده",
        fuelType: fuelTypes[data.fuel_type] || "ثبت نشده",
        bodyStatus: bodyStatuses[data.body_status] || data.body_status,
        bodyType: data.body_type || "ثبت نشده",
        engine: data.engine_volume ? `${data.engine_volume} لیتر` : "ثبت نشده",
        engineStatus: conditions[data.engine_status] || "ثبت نشده",
        chassisStatus: `${conditions[data.front_chassis_status] || "ثبت نشده"} / ${conditions[data.rear_chassis_status] || "ثبت نشده"}`,
        documentStatus: conditions[data.document_status] || "ثبت نشده",
        insuranceMonths: data.insurance_months,
        ownerCount: data.owner_count,
        exchangeable: data.is_exchangeable,
        seller: {
            type: data.seller_type || "personal",
            name: "فروشنده خودرو",
            phone: data.owner_phone || "",
            city: data.city_name || "",
            address: data.approximate_address || "",
            verified: Boolean(data.is_verified_dealer),
            joinedAt: "",
        },
    };
}
