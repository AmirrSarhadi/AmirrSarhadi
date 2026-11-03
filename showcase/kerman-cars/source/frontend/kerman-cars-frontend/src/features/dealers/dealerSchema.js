import { z } from "zod";
import { normalizeDigits } from "../../utils/validators.js";
const phone = z
    .string()
    .transform(normalizeDigits)
    .pipe(
        z
            .string()
            .regex(/^0\d{10}$/, "شماره تماس را با صفر و ۱۱ رقم وارد کنید."),
    );
const optionalPhone = z
    .string()
    .transform(normalizeDigits)
    .pipe(
        z.string().regex(/^$|^0\d{10}$/, "شماره را با صفر و ۱۱ رقم وارد کنید."),
    );
export const dealerSchema = z.object({
    business_name: z
        .string()
        .trim()
        .min(1, "نام نمایشگاه را وارد کنید.")
        .max(150),
    phone,
    manager_name: z.string().trim().max(150),
    license_no: z.string().trim().max(100),
    landline: optionalPhone,
    whatsapp_number: optionalPhone,
    city: z.string(),
    neighborhood: z.string(),
    address: z.string().trim(),
    description: z.string().trim(),
    instagram: z.string().trim().max(150),
    website: z
        .string()
        .trim()
        .refine(
            (value) => !value || /^https?:\/\/[^\s]+$/i.test(value),
            "نشانی سایت را با https:// یا http:// وارد کنید.",
        ),
    latitude: z
        .string()
        .transform(normalizeDigits)
        .refine(
            (value) =>
                !value ||
                (Number.isFinite(Number(value)) &&
                    Number(value) >= 25 &&
                    Number(value) <= 40),
            "عرض جغرافیایی باید بین ۲۵ و ۴۰ باشد.",
        ),
    longitude: z
        .string()
        .transform(normalizeDigits)
        .refine(
            (value) =>
                !value ||
                (Number.isFinite(Number(value)) &&
                    Number(value) >= 44 &&
                    Number(value) <= 64),
            "طول جغرافیایی باید بین ۴۴ و ۶۴ باشد.",
        ),
    hours_description: z.string(),
});
