const text = (name, label, extra = {}) => ({
    name,
    label,
    type: "text",
    ...extra,
});
const number = (name, label, extra = {}) => ({
    name,
    label,
    type: "number",
    min: 0,
    ...extra,
});
const checkbox = (name, label, value = true) => ({
    name,
    label,
    type: "checkbox",
    defaultValue: value,
});
const relation = (name, label, resource) => ({
    name,
    label,
    type: "relation",
    resource,
    required: true,
});
const image = (name, label, required = false) => ({
    name,
    label,
    type: "file",
    required,
});
const select = (name, label, choices, value = "") => ({
    name,
    label,
    type: "select",
    choices,
    defaultValue: value,
});
const name = text("name", "نام", { required: true, maxLength: 100 });
const active = checkbox("is_active", "فعال");
const order = number("sort_order", "ترتیب نمایش", { defaultValue: 0 });
export const catalogResources = [
    "brands",
    "car-models",
    "car-trims",
    "provinces",
    "cities",
    "neighborhoods",
];
export const adminResources = {
    articles: {
        title: "مجله کرمان کارز",
        singular: "مطلب",
        itemLabel: "عنوان",
        activeLabel: "انتشار",
        fields: [
            text("title", "عنوان مطلب", { required: true, maxLength: 180 }),
            text("excerpt", "خلاصه مطلب", {
                required: true,
                multiline: true,
                maxLength: 350,
            }),
            text("content", "متن مطلب", {
                required: true,
                multiline: true,
                maxLength: 30000,
                help: "متن ساده وارد کنید؛ HTML اجرا نمی‌شود.",
            }),
            image("cover_image", "تصویر مطلب"),
            text("cover_alt", "توضیح تصویر", { maxLength: 180 }),
            checkbox("is_active", "انتشار مطلب", false),
            {
                name: "published_at",
                label: "زمان انتشار (میلادی، زمان تهران)",
                type: "datetime",
                nullable: true,
                help: "خالی: انتشار هنگام فعال‌کردن؛ زمان آینده: انتشار زمان‌بندی‌شده.",
            },
        ],
    },
    faqs: {
        title: "سؤال‌های متداول",
        singular: "پرسش",
        itemLabel: "پرسش",
        activeLabel: "نمایش",
        fields: [
            text("question", "پرسش", { required: true, maxLength: 180 }),
            text("answer", "پاسخ", {
                required: true,
                multiline: true,
                maxLength: 3000,
            }),
            order,
            active,
        ],
    },
    brands: {
        title: "برندهای خودرو",
        singular: "برند خودرو",
        deletable: true,
        fields: [name, image("logo", "نشان برند"), active, order],
    },
    "car-models": {
        title: "مدل‌های خودرو",
        singular: "مدل خودرو",
        deletable: true,
        fields: [
            relation("brand", "برند خودرو", "brands"),
            name,
            select("body_type", "نوع بدنه", {
                sedan: "سدان",
                hatchback: "هاچ‌بک",
                suv: "شاسی‌بلند",
                crossover: "کراس‌اوور",
                pickup: "پیکاپ",
                van: "ون",
                coupe: "کوپه",
                convertible: "کروک",
                wagon: "استیشن",
            }),
            active,
            order,
        ],
    },
    "car-trims": {
        title: "تیپ‌های خودرو",
        singular: "تیپ خودرو",
        deletable: true,
        fields: [
            relation("car_model", "مدل خودرو", "car-models"),
            name,
            number("engine_volume", "حجم موتور (لیتر)", {
                step: "0.1",
                nullable: true,
            }),
            select("fuel_type", "سوخت", {
                gasoline: "بنزینی",
                diesel: "دیزلی",
                hybrid: "هیبریدی",
                electric: "برقی",
                cng: "دوگانه‌سوز",
            }),
            select("transmission", "گیربکس", {
                manual: "دستی",
                automatic: "اتومات",
                cvt: "CVT",
                dct: "DCT",
            }),
            active,
            order,
        ],
    },
    provinces: {
        title: "استان‌ها",
        singular: "استان",
        deletable: true,
        fields: [name, active],
    },
    cities: {
        title: "شهرها",
        singular: "شهر",
        deletable: true,
        fields: [relation("province", "استان", "provinces"), name, active],
    },
    neighborhoods: {
        title: "محله‌ها",
        singular: "محله",
        deletable: true,
        fields: [relation("city", "شهر", "cities"), name, active],
    },
    plans: {
        title: "پلن‌های نمایشگاهی",
        singular: "پلن",
        fields: [
            name,
            text("slug", "شناسهٔ خوانا در نشانی", {
                required: true,
                pattern: /^[a-zA-Z0-9_-]+$/,
                help: "حروف انگلیسی، عدد و خط تیره؛ باید یکتا باشد.",
            }),
            number("price", "قیمت (تومان)", {
                required: true,
                defaultValue: 0,
            }),
            number("duration_days", "مدت اعتبار (روز)", {
                required: true,
                defaultValue: 30,
            }),
            number("max_active_listings", "حداکثر آگهی فعال هم‌زمان", {
                required: true,
                defaultValue: 10,
            }),
            number("monthly_listing_quota", "سهمیه ثبت آگهی در دوره", {
                required: true,
                defaultValue: 20,
            }),
            number("featured_quota", "سهمیه ویژه‌سازی", {
                required: true,
                defaultValue: 0,
            }),
            number("bump_quota", "سهمیه بروزرسانی آگهی", {
                required: true,
                defaultValue: 0,
            }),
            number("feature_duration_days", "مدت ویژه بودن (روز)", {
                required: true,
                min: 1,
                defaultValue: 7,
            }),
            number("bump_cooldown_hours", "فاصله مجاز بروزرسانی (ساعت)", {
                required: true,
                defaultValue: 24,
            }),
            number("priority_level", "اولویت نمایش", {
                required: true,
                defaultValue: 0,
            }),
            active,
        ],
    },
    banners: {
        title: "بنرهای صفحه اصلی",
        singular: "بنر",
        deletable: true,
        fields: [
            text("title", "عنوان", { maxLength: 150 }),
            text("subtitle", "زیرعنوان", { maxLength: 255 }),
            image("image", "تصویر بنر", true),
            image("mobile_image", "تصویر موبایل"),
            text("alt_text", "متن جایگزین تصویر", { maxLength: 150 }),
            text("link_url", "نشانی مقصد", { url: true }),
            checkbox("open_in_new_tab", "باز شدن مقصد در صفحه جدید", false),
            select(
                "position",
                "محل نمایش",
                {
                    hero: "بنر اصلی",
                    top: "بالای صفحه",
                    middle: "میانه صفحه",
                    sidebar: "کنار صفحه",
                },
                "hero",
            ),
            active,
            {
                name: "starts_at",
                label: "شروع نمایش (میلادی، زمان تهران)",
                type: "datetime",
                nullable: true,
            },
            {
                name: "ends_at",
                label: "پایان نمایش (میلادی، زمان تهران)",
                type: "datetime",
                nullable: true,
            },
            order,
        ],
    },
};
export const homepageFields = [
    text("site_name", "نام سامانه", { required: true }),
    text("hero_title", "عنوان اصلی", {
        help: "اگر خالی باشد، عنوان پیش‌فرض نمایش داده می‌شود.",
    }),
    text("hero_subtitle", "توضیح عنوان اصلی", { multiline: true }),
    text("featured_section_title", "عنوان آگهی‌های ویژه"),
    text("latest_section_title", "عنوان آخرین آگهی‌ها"),
    text("contact_phone", "تلفن پشتیبانی"),
    text("whatsapp_number", "شماره واتساپ"),
    text("contact_email", "ایمیل پشتیبانی", { maxLength: 254 }),
    text("contact_address", "نشانی پشتیبانی", { multiline: true }),
    text("about_content", "متن درباره ما", {
        multiline: true,
        help: "این متن پس از ذخیره در صفحهٔ درباره ما عمومی می‌شود. متن ساده وارد کنید؛ کد HTML اجرا نمی‌شود.",
    }),
    text("terms_content", "متن قوانین استفاده", {
        multiline: true,
        help: "متن مصوب کسب‌وکار را وارد کنید. ذخیرهٔ این فیلد، متن را بلافاصله در صفحهٔ قوانین عمومی می‌کند.",
    }),
    text("privacy_content", "متن حریم خصوصی", {
        multiline: true,
        help: "متن مصوب کسب‌وکار را وارد کنید. ذخیرهٔ این فیلد، متن را بلافاصله در صفحهٔ حریم خصوصی عمومی می‌کند.",
    }),
    text("seo_title", "عنوان در نتایج جست‌وجو"),
    text("seo_description", "توضیحات در نتایج جست‌وجو", { multiline: true }),
    checkbox("show_featured_listings", "نمایش آگهی‌های ویژه"),
    checkbox("show_latest_listings", "نمایش آخرین آگهی‌ها"),
];
export function resourcePath(resource) {
    return catalogResources.includes(resource)
        ? `/admin/catalog/${resource}`
        : `/admin/${resource}`;
}
export function tehranDateInput(value) {
    if (!value || Number.isNaN(Date.parse(value))) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(value));
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
export function fieldDefaults(fields, record = {}) {
    return Object.fromEntries(
        fields
            .filter((field) => field.type !== "file")
            .map((field) => [
                field.name,
                field.type === "datetime"
                    ? tehranDateInput(record[field.name])
                    : (record[field.name] ??
                      field.defaultValue ??
                      (field.type === "checkbox" ? false : "")),
            ]),
    );
}
export function resourcePayload(fields, values, files = {}) {
    const payload = {};
    for (const field of fields) {
        if (field.type === "file") {
            if (files[field.name] !== undefined)
                payload[field.name] = files[field.name];
            continue;
        }
        const value = values[field.name];
        if (field.type === "datetime")
            payload[field.name] = value
                ? new Date(`${value}+03:30`).toISOString()
                : null;
        else
            payload[field.name] = value === "" && field.nullable ? null : value;
    }
    return payload;
}
