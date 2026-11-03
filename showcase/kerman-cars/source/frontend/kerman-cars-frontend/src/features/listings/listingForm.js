import { z } from "zod";
import { normalizeDigits } from "../../utils/validators.js";

const digits = z.preprocess(
    normalizeDigits,
    z.string().trim().regex(/^\d+$/, "عدد معتبر وارد کنید."),
);
const optionalNumber = z.preprocess(
    normalizeDigits,
    z
        .string()
        .trim()
        .refine((v) => !v || /^\d+$/.test(v), "عدد معتبر وارد کنید."),
);
export const listingFormSchema = z
    .object({
        brand: digits,
        car_model: digits,
        trim: z.string(),
        city: digits,
        neighborhood: z.string(),
        production_year: digits.refine(
            (v) => Number(v) >= 1300 && Number(v) <= 2100,
            "سال ساخت معتبر وارد کنید.",
        ),
        mileage: digits,
        color: z.string().trim().min(1, "رنگ را وارد کنید."),
        body_status: z.string().min(1, "وضعیت بدنه را انتخاب کنید."),
        body_note: z.string(),
        title: z
            .string()
            .trim()
            .min(5, "عنوان باید حداقل پنج حرف باشد.")
            .max(80),
        description: z
            .string()
            .trim()
            .min(20, "توضیحات باید حداقل بیست حرف باشد.")
            .max(2000),
        price_type: z.enum(["fixed", "negotiable", "contact", "installment"]),
        price: optionalNumber,
        down_payment: optionalNumber,
        installment_amount: optionalNumber,
        installment_count: optionalNumber,
        installment_description: z.string(),
        is_exchangeable: z.boolean(),
        approximate_address: z.string(),
    })
    .superRefine((data, ctx) => {
        if (
            data.price_type !== "contact" &&
            (!data.price || Number(data.price) <= 0)
        )
            ctx.addIssue({
                code: "custom",
                path: ["price"],
                message: "قیمت مثبت به تومان وارد کنید.",
            });
        if (data.price_type === "installment") {
            for (const key of [
                "down_payment",
                "installment_amount",
                "installment_count",
            ]) {
                if (!data[key] || Number(data[key]) <= 0)
                    ctx.addIssue({
                        code: "custom",
                        path: [key],
                        message: "مقدار مثبت وارد کنید.",
                    });
            }
            if (Number(data.down_payment) >= Number(data.price))
                ctx.addIssue({
                    code: "custom",
                    path: ["down_payment"],
                    message: "پیش‌پرداخت باید کمتر از قیمت کل باشد.",
                });
        }
    });
export function listingToForm(listing = {}) {
    const strings = [
        "brand",
        "car_model",
        "trim",
        "city",
        "neighborhood",
        "production_year",
        "mileage",
        "color",
        "body_note",
        "title",
        "description",
        "price",
        "down_payment",
        "installment_amount",
        "installment_count",
        "installment_description",
        "approximate_address",
    ];
    // Normalized display names must never replace the server's foreign keys.
    const source = listing.raw || listing;
    return {
        ...Object.fromEntries(
            strings.map((key) => [
                key,
                source[key] == null ? "" : String(source[key]),
            ]),
        ),
        body_status: source.body_status || "",
        price_type: source.price_type || "fixed",
        is_exchangeable: Boolean(source.is_exchangeable),
    };
}
export function listingPayload(values) {
    return {
        ...values,
        trim: values.trim || null,
        neighborhood: values.neighborhood || null,
        price: values.price_type === "contact" ? null : values.price,
        down_payment:
            values.price_type === "installment" ? values.down_payment : null,
        installment_amount:
            values.price_type === "installment"
                ? values.installment_amount
                : null,
        installment_count:
            values.price_type === "installment"
                ? values.installment_count
                : null,
    };
}
