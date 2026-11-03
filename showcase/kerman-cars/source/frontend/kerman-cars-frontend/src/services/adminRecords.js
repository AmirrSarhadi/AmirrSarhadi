import { statusLabels, bodyStatuses, conditions } from "./listingData.js";
import {
    dealerStatuses,
    reportStatuses,
    reportReasons,
    subscriptionStatuses,
    paymentStatuses,
    userRoles,
    adminDate,
    yesNo,
} from "./adminLabels.js";
import { formatPrice } from "../utils/formatters.js";

const statusColumn = (labels) => [
    "status",
    "وضعیت",
    (row) => labels[row.status] || row.status,
];
const identity = ["user_phone", "شماره کاربر"];
export const adminRecords = {
    listings: {
        title: "مدیریت آگهی‌ها",
        filters: [
            { name: "status", label: "وضعیت آگهی", choices: statusLabels },
            {
                name: "has_reports",
                label: "گزارش تخلف",
                choices: { true: "دارای گزارش", false: "بدون گزارش" },
            },
            {
                name: "is_deleted",
                label: "بایگانی حذف",
                choices: { false: "حذف‌نشده", true: "حذف‌شده" },
            },
        ],
        columns: [
            ["title", "عنوان"],
            ["public_code", "کد آگهی"],
            ["owner_phone", "فروشنده"],
            statusColumn(statusLabels),
            ["reports_count", "گزارش‌ها"],
        ],
        details: [
            ["title", "عنوان"],
            ["public_code", "کد عمومی"],
            ["owner_full_name", "مالک"],
            ["owner_phone", "موبایل مالک"],
            ["brand_name", "برند"],
            ["car_model_name", "مدل"],
            ["trim_name", "تیپ"],
            ["city_name", "شهر"],
            ["neighborhood_name", "محله"],
            ["production_year", "سال ساخت"],
            ["mileage", "کارکرد (کیلومتر)"],
            ["body_status", "وضعیت بدنه", r => bodyStatuses[r.body_status] || "ثبت نشده"],
            ["engine_status", "وضعیت موتور", r => conditions[r.engine_status] || "ثبت نشده"],
            ["front_chassis_status", "شاسی جلو", r => conditions[r.front_chassis_status] || "ثبت نشده"],
            ["rear_chassis_status", "شاسی عقب", r => conditions[r.rear_chassis_status] || "ثبت نشده"],
            ["document_status", "وضعیت مدارک", r => conditions[r.document_status] || "ثبت نشده"],
            [
                "price",
                "قیمت",
                (r) =>
                    r.price_type === "contact"
                        ? "تماس بگیرید"
                        : formatPrice(r.price),
            ],
            statusColumn(statusLabels),
            ["description", "توضیحات"],
            ["rejection_reason", "توضیح آخرین بررسی"],
            ["reviewed_at", "آخرین بررسی", (r) => adminDate(r.reviewed_at)],
            ["updated_at", "آخرین تغییر", (r) => adminDate(r.updated_at)],
            ["expires_at", "پایان نمایش", (r) => adminDate(r.expires_at)],
            ["view_count", "بازدید"],
            ["reports_count", "گزارش‌ها"],
            ["deleted_at", "زمان حذف", (r) => adminDate(r.deleted_at)],
        ],
    },
    users: {
        title: "مدیریت کاربران",
        filters: [
            { name: "role", label: "نوع حساب", choices: userRoles },
            {
                name: "is_banned",
                label: "مسدودی",
                choices: { true: "مسدود", false: "مسدود نیست" },
            },
        ],
        columns: [
            ["full_name", "نام"],
            ["phone", "موبایل"],
            ["role", "نوع حساب", (r) => userRoles[r.role]],
            ["is_banned", "مسدود", (r) => yesNo(r.is_banned)],
            ["listings_count", "آگهی‌ها"],
        ],
        details: [
            ["full_name", "نام و نام خانوادگی"],
            ["phone", "موبایل"],
            ["national_id", "کد ملی"],
            ["email", "ایمیل"],
            ["city_name", "شهر"],
            ["role", "نوع حساب", (r) => userRoles[r.role]],
            ["is_staff", "دسترسی مدیریت", (r) => yesNo(r.is_staff)],
            ["is_active", "حساب فعال", (r) => yesNo(r.is_active)],
            ["is_banned", "مسدود", (r) => yesNo(r.is_banned)],
            ["date_joined", "عضویت", (r) => adminDate(r.date_joined)],
        ],
    },
    dealers: {
        title: "درخواست‌ها و نمایشگاه‌ها",
        filters: [
            {
                name: "status",
                label: "وضعیت نمایشگاه",
                choices: dealerStatuses,
            },
        ],
        columns: [
            ["business_name", "نمایشگاه"],
            identity,
            ["city_name", "شهر"],
            statusColumn(dealerStatuses),
            ["listings_count", "آگهی‌ها"],
        ],
        details: [
            ["business_name", "نام نمایشگاه"],
            ["manager_name", "مدیر نمایشگاه"],
            ["user_full_name", "مالک حساب"],
            identity,
            ["phone", "موبایل نمایشگاه"],
            ["landline", "تلفن ثابت"],
            ["city_name", "شهر"],
            ["neighborhood_name", "محله"],
            ["address", "آدرس"],
            ["license_no", "شماره مجوز"],
            ["description", "معرفی"],
            statusColumn(dealerStatuses),
            ["rejection_reason", "توضیح بررسی"],
            ["verified_at", "زمان تأیید", (r) => adminDate(r.verified_at)],
        ],
    },
    reports: {
        title: "گزارش‌های تخلف",
        filters: [
            { name: "status", label: "وضعیت گزارش", choices: reportStatuses },
            { name: "reason", label: "دلیل گزارش", choices: reportReasons },
        ],
        columns: [
            ["listing_title", "آگهی"],
            ["reporter_phone", "گزارش‌دهنده"],
            ["reason", "علت", (r) => reportReasons[r.reason]],
            statusColumn(reportStatuses),
        ],
        details: [
            ["listing_title", "آگهی"],
            ["listing_public_code", "کد آگهی"],
            ["reporter_full_name", "گزارش‌دهنده"],
            ["reporter_phone", "شماره گزارش‌دهنده"],
            ["reason", "دلیل", (r) => reportReasons[r.reason]],
            ["description", "توضیح گزارش"],
            statusColumn(reportStatuses),
            ["review_note", "یادداشت رسیدگی"],
            ["reviewed_by_phone", "بررسی‌کننده"],
            ["reviewed_at", "زمان رسیدگی", (r) => adminDate(r.reviewed_at)],
        ],
    },
    subscriptions: {
        title: "اشتراک کاربران",
        filters: [
            {
                name: "status",
                label: "وضعیت اشتراک",
                choices: subscriptionStatuses,
            },
        ],
        columns: [
            identity,
            ["plan_name", "پلن"],
            statusColumn(subscriptionStatuses),
            [
                "payment_status",
                "پرداخت",
                (r) => paymentStatuses[r.payment_status] || "ثبت نشده",
            ],
        ],
        details: [
            identity,
            ["user_full_name", "نام کاربر"],
            ["plan_name", "پلن"],
            statusColumn(subscriptionStatuses),
            [
                "payment_status",
                "پرداخت",
                (r) => paymentStatuses[r.payment_status] || "ثبت نشده",
            ],
            ["started_at", "شروع", (r) => adminDate(r.started_at)],
            ["expires_at", "پایان", (r) => adminDate(r.expires_at)],
            ["remaining_listing_quota", "سهمیه باقی‌مانده آگهی"],
            ["remaining_featured_quota", "سهمیه باقی‌مانده ویژه"],
            ["remaining_bump_quota", "سهمیه باقی‌مانده بروزرسانی"],
        ],
    },
    payments: {
        title: "پرداخت‌ها",
        filters: [
            { name: "status", label: "وضعیت پرداخت", choices: paymentStatuses },
        ],
        columns: [
            identity,
            ["plan_name", "پلن"],
            ["amount", "مبلغ", (r) => formatPrice(r.amount)],
            statusColumn(paymentStatuses),
        ],
        details: [
            identity,
            ["user_full_name", "نام کاربر"],
            ["plan_name", "پلن"],
            ["amount", "مبلغ", (r) => formatPrice(r.amount)],
            statusColumn(paymentStatuses),
            [
                "provider",
                "نوع پرداخت",
                (r) => (r.provider === "mock" ? "آزمایشی" : r.provider),
            ],
            ["ref_id", "شماره پیگیری"],
            ["paid_at", "زمان پرداخت", (r) => adminDate(r.paid_at)],
            ["failure_reason", "توضیح نتیجه"],
            ["created_at", "ایجاد", (r) => adminDate(r.created_at)],
        ],
    },
};

export function adminActions(resource, record, currentUserId) {
    if (resource === "users")
        return record.id === currentUserId
            ? []
            : [
                  {
                      label: record.is_banned ? "رفع مسدودی" : "مسدود کردن",
                      path: `users/${record.id}/status`,
                      data: { is_banned: !record.is_banned },
                      description: record.is_banned
                          ? "مسدودی حساب رفع می‌شود؛ وضعیت فعال بودن حساب جداگانه حفظ می‌شود."
                          : "دسترسی این کاربر به حساب و عملیات احراز هویت مسدود می‌شود.",
                      intent: record.is_banned ? "primary" : "danger",
                  },
              ];
    if (resource === "dealers")
        return [
            ...(record.status !== "approved"
                ? [
                      {
                          label: "تأیید نمایشگاه",
                          status: "approved",
                          intent: "primary",
                          description:
                              "نمایشگاه در فهرست عمومی قرار می‌گیرد و حساب مالک بنگاهی می‌شود.",
                      },
                  ]
                : []),
            ...(record.status !== "rejected"
                ? [
                      {
                          label: "رد درخواست",
                          status: "rejected",
                          description:
                              "درخواست رد می‌شود و حساب مالک به شخصی تغییر می‌کند.",
                          reason: true,
                      },
                  ]
                : []),
            ...(record.status === "approved"
                ? [
                      {
                          label: "تعلیق نمایشگاه",
                          status: "suspended",
                          description:
                              "نمایشگاه از فهرست عمومی خارج می‌شود و امکانات بنگاهی آن محدود می‌شوند.",
                          reason: true,
                      },
                  ]
                : []),
        ].map((action) => ({
            ...action,
            path: `dealers/${record.id}/decision`,
            data: { status: action.status },
            fields: action.reason
                ? [
                      {
                          name: "reason",
                          label: "دلیل تصمیم",
                          required: true,
                          maxLength: 1000,
                      },
                  ]
                : [],
        }));
    if (resource === "listings" && !record.deleted_at && !record.is_deleted)
        return [
            ...(!record.is_expired && ["pending", "needs_edit", "rejected"].includes(record.status)
                ? [
                      {
                          label: "تأیید و انتشار",
                          action: "approve",
                          intent: "primary",
                          description: "آگهی برای کاربران عمومی منتشر می‌شود.",
                      },
                  ]
                : []),
            ...(["pending", "needs_edit", "published"].includes(record.status)
                ? [
                      {
                          label: "رد آگهی",
                          action: "reject",
                          description:
                              "آگهی رد و از نمایش عمومی خارج می‌شود. دلیل برای مالک ثبت می‌شود.",
                          fields: [
                              {
                                  name: "rejection_reason",
                                  label: "دلیل رد آگهی",
                                  required: true,
                                  maxLength: 3000,
                              },
                          ],
                      },
                  ]
                : []),
            ...(["pending", "published", "rejected"].includes(record.status)
                ? [
                      {
                          label: "درخواست اصلاح",
                          review: true,
                          description:
                              "آگهی به وضعیت نیازمند اصلاح می‌رود و از نمایش عمومی خارج می‌شود. مالک می‌تواند آن را ویرایش و دوباره ارسال کند.",
                          fields: [
                              {
                                  name: "rejection_reason",
                                  label: "توضیح اصلاحات لازم",
                                  required: true,
                                  maxLength: 3000,
                              },
                          ],
                      },
                  ]
                : []),
        ].map((action) => ({
            ...action,
            path: `listings/${record.id}/decision`,
            data: { action: action.action },
        }));
    if (resource === "reports" && record.status === "pending")
        return [
            {
                label: "ثبت رسیدگی",
                action: "resolve",
                intent: "primary",
                description:
                    "این گزارش رسیدگی‌شده ثبت می‌شود. وضعیت انتشار آگهی با این عملیات تغییر نمی‌کند.",
            },
            {
                label: "رد گزارش",
                action: "reject",
                description: "این گزارش رد می‌شود و نتیجه ثبت خواهد شد.",
            },
        ].map((action) => ({
            ...action,
            path: `reports/${record.id}/review`,
            data: { action: action.action },
            fields: [{ name: "note", label: "یادداشت رسیدگی (اختیاری)", maxLength: 3000 }],
        }));
    if (resource === "subscriptions")
        return [
            ...(record.status === "pending"
                ? [
                      {
                          label: "فعال‌سازی دستی",
                          action: "activate",
                          intent: "primary",
                          description:
                              "اشتراک فعال می‌شود. این کار پرداخت جدید یا تأیید بانکی ثبت نمی‌کند.",
                      },
                  ]
                : []),
            ...(["active", "pending"].includes(record.status)
                ? [
                      {
                          label: "لغو اشتراک",
                          action: "cancel",
                          description:
                              "دسترسی مربوط به این اشتراک لغو می‌شود و تمدید خودکار آن متوقف خواهد شد.",
                      },
                  ]
                : []),
            ...(record.status === "active"
                ? [
                      {
                          label: "منقضی کردن",
                          action: "expire",
                          description:
                              "اشتراک همین حالا منقضی می‌شود و تمدید خودکار آن متوقف خواهد شد.",
                      },
                  ]
                : []),
        ].map((action) => ({
            ...action,
            path: `subscriptions/${record.id}/action`,
            data: { action: action.action },
        }));
    if (resource === "payments" && record.status === "pending")
        return [
            {
                label: "لغو پرداخت در انتظار",
                path: `payments/${record.id}/action`,
                data: { action: "cancel" },
                description:
                    "پرداخت در انتظار لغو می‌شود. اگر اشتراک آن نیز در انتظار باشد، لغو خواهد شد. این عملیات بازپرداخت وجه نیست.",
                fields: [
                    {
                        name: "reason",
                        label: "دلیل لغو (اختیاری)",
                        maxLength: 255,
                    },
                ],
            },
        ];
    return [];
}
