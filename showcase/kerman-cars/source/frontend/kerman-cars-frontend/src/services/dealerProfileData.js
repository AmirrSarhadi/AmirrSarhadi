export const dealerTextFields = [
    {
        name: "business_name",
        label: "نام نمایشگاه",
        required: true,
        maxLength: 150,
    },
    { name: "manager_name", label: "نام مدیر نمایشگاه", maxLength: 150 },
    { name: "license_no", label: "شماره پروانه کسب", maxLength: 100 },
    {
        name: "phone",
        label: "شماره تماس نمایشگاه",
        required: true,
        type: "tel",
    },
    { name: "landline", label: "تلفن ثابت", type: "tel" },
    { name: "whatsapp_number", label: "شماره واتساپ", type: "tel" },
    { name: "website", label: "وب‌سایت", type: "url" },
    { name: "instagram", label: "اینستاگرام" },
    { name: "address", label: "آدرس", multiline: true },
    { name: "description", label: "درباره نمایشگاه", multiline: true },
    { name: "latitude", label: "عرض جغرافیایی", numeric: true },
    { name: "longitude", label: "طول جغرافیایی", numeric: true },
    { name: "hours_description", label: "توضیح ساعات کاری", multiline: true },
];
export const dealerFiles = [
    { name: "logo", label: "لوگوی نمایشگاه", image: true },
    { name: "cover_image", label: "تصویر کاور", image: true },
    { name: "license_document", label: "مدرک پروانه کسب" },
    { name: "national_card_document", label: "مدرک کارت ملی" },
];
export function dealerDefaults(record, user) {
    return {
        ...Object.fromEntries(
            dealerTextFields.map(({ name }) => [name, record?.[name] ?? ""]),
        ),
        phone: record?.phone ?? user?.phone ?? "",
        manager_name:
            record?.manager_name ??
            [user?.firstName, user?.lastName].filter(Boolean).join(" "),
        city: String(record?.city ?? user?.city ?? ""),
        neighborhood: String(record?.neighborhood ?? ""),
        latitude: String(record?.latitude ?? ""),
        longitude: String(record?.longitude ?? ""),
        hours_description: record?.business_hours?.description ?? "",
    };
}
export function dealerPayload(values, record) {
    const { hours_description, ...data } = values;
    return {
        ...data,
        city: data.city ? Number(data.city) : null,
        neighborhood: data.neighborhood ? Number(data.neighborhood) : null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        business_hours: {
            ...(record?.business_hours ?? {}),
            description: hours_description,
        },
    };
}

export function ownerDealerBody(values, files = {}) {
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) {
        body.append(
            key,
            key === "business_hours"
                ? JSON.stringify(value)
                : value == null
                  ? ""
                  : String(value),
        );
    }
    for (const [key, value] of Object.entries(files)) {
        if (value !== undefined) body.append(key, value == null ? "" : value);
    }
    return body;
}
