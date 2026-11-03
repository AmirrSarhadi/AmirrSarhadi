import { normalizeDigits } from "../utils/validators.js";
export const publicInfoPages = {
    about: { title: "درباره ما", field: "about_content", path: "/about" },
    contact: { title: "تماس با ما", path: "/contact" },
    terms: { title: "قوانین استفاده", field: "terms_content", path: "/terms" },
    privacy: {
        title: "حریم خصوصی",
        field: "privacy_content",
        path: "/privacy",
    },
};
function phoneDigits(value) {
    const phone = normalizeDigits(String(value ?? "")).replace(/[\s()-]/g, "");
    return /^\+?\d{7,15}$/.test(phone) ? phone : null;
}
export function contactItems(settings = {}) {
    const phone = phoneDigits(settings.contact_phone);
    let whatsapp = phoneDigits(settings.whatsapp_number);
    if (whatsapp) {
        whatsapp = whatsapp.replace(/^\+/, "").replace(/^00/, "");
        if (/^0\d{10}$/.test(whatsapp)) whatsapp = `98${whatsapp.slice(1)}`;
        else if (/^9\d{9}$/.test(whatsapp)) whatsapp = `98${whatsapp}`;
    }
    return [
        {
            label: "تلفن پشتیبانی",
            value: settings.contact_phone,
            href: phone ? `tel:${phone}` : null,
        },
        {
            label: "واتساپ",
            value: settings.whatsapp_number,
            href: whatsapp ? `https://wa.me/${whatsapp}` : null,
            external: true,
        },
        {
            label: "ایمیل پشتیبانی",
            value: settings.contact_email,
            href: settings.contact_email
                ? `mailto:${encodeURIComponent(settings.contact_email)}`
                : null,
        },
        { label: "نشانی پشتیبانی", value: settings.contact_address },
    ].filter((item) => typeof item.value === "string" && item.value.trim());
}
