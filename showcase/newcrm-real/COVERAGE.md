# NewCRM — Tabs, Pages & Workflow Coverage

[← Project](README.md) · [Full image gallery](GALLERY.md) · [All published code](SOURCE_INDEX.md) · [Source scope](../SOURCE_SCOPE.md)

**97 source files · 24 captured views.** The rows below cover implemented navigation pages and selected forms/subtabs, not every possible record or dialog state. Desktop captures use demonstration records or explicit API fixtures; empty states are included where no demo record is selected. Authentication/payment/provider internals remain outside the public source release.

The source sidebar also labels Users and Roles/Access as pending. They are not implemented navigation tabs and are not represented by fabricated screenshots.

| Page / state | Route or navigation key | Published code | Screenshot / status |
| --- | --- | --- | --- |
| داشبورد | `/workspace` | [Code 1](source/frontend/components/reference-dashboard.tsx) · [Code 2](source/frontend/app/workspace/page.tsx) | [View image](../../assets/screenshots/newcrm-real/workspace.jpg) |
| مشتریان | `/customers` | [Code 1](source/frontend/components/customer-workspace.tsx) · [Code 2](source/frontend/app/customers/page.tsx) | [View image](../../assets/screenshots/newcrm-real/customers.jpg) |
| شرکت‌ها | `/companies` | [Code 1](source/frontend/components/customer-workspace.tsx) · [Code 2](source/frontend/app/companies/page.tsx) | [View image](../../assets/screenshots/newcrm-real/companies.jpg) |
| لیدها | `/leads` | [Code 1](source/frontend/components/lead-workspace.tsx) · [Code 2](source/frontend/app/leads/page.tsx) | [View image](../../assets/screenshots/newcrm-real/leads.jpg) |
| وظایف | `/activities` | [Code 1](source/frontend/components/activity-workspace.tsx) · [Code 2](source/frontend/app/activities/page.tsx) | [View image](../../assets/screenshots/newcrm-real/activities.jpg) |
| فروش | `/sales` | [Code 1](source/frontend/components/order-workspace.tsx) · [Code 2](source/frontend/app/sales/page.tsx) | [View image](../../assets/screenshots/newcrm-real/sales.jpg) |
| فروش — فرم ایجاد | `/sales` | [Code 1](source/frontend/components/order-workspace.tsx) · [Code 2](source/frontend/app/sales/page.tsx) | [View image](../../assets/screenshots/newcrm-real/sales-create.jpg) |
| فرصت‌ها و قیف فروش | `/opportunities` | [Code 1](source/frontend/components/sales-workspace.tsx) · [Code 2](source/frontend/app/opportunities/page.tsx) | [View image](../../assets/screenshots/newcrm-real/opportunities.jpg) |
| محصولات | `/products` | [Code 1](source/frontend/components/product-workspace.tsx) · [Code 2](source/frontend/app/products/page.tsx) | [View image](../../assets/screenshots/newcrm-real/products.jpg) |
| گزارش‌ها | `/reports` | [Code 1](source/frontend/components/reports-workspace.tsx) · [Code 2](source/frontend/app/reports/page.tsx) | [View image](../../assets/screenshots/newcrm-real/reports.jpg) |
| تنظیمات | `/settings` | [Code 1](source/frontend/components/settings-workspace.tsx) · [Code 2](source/frontend/app/settings/page.tsx) | [View image](../../assets/screenshots/newcrm-real/settings.jpg) |
| انتخاب سازمان | `/organizations` | [Code 1](source/frontend/components/organization-picker.tsx) | [View image](../../assets/screenshots/newcrm-real/organizations.jpg) |
| نشست‌های حساب | `/account/sessions` | [Code 1](source/frontend/components/session-manager.tsx) | [View image](../../assets/screenshots/newcrm-real/account-sessions.jpg) |
| تغییر رمز | `/account/password` | [Code 1](source/frontend/app/account/password/page.tsx) | [View image](../../assets/screenshots/newcrm-real/account-password.jpg) |
| افزودن مشتری جدید | `/customers` | [Code 1](source/frontend/components/customer-workspace.tsx) · [Code 2](source/frontend/app/customers/page.tsx) | [View image](../../assets/screenshots/newcrm-real/customers-form.jpg) |
| افزودن سریع شرکت | `/companies` | [Code 1](source/frontend/components/customer-workspace.tsx) · [Code 2](source/frontend/app/companies/page.tsx) | [View image](../../assets/screenshots/newcrm-real/companies-form.jpg) |
| ثبت سرنخ | `/leads` | [Code 1](source/frontend/components/lead-workspace.tsx) · [Code 2](source/frontend/app/leads/page.tsx) | [View image](../../assets/screenshots/newcrm-real/leads-form.jpg) |
| ثبت فعالیت | `/activities` | [Code 1](source/frontend/components/activity-workspace.tsx) · [Code 2](source/frontend/app/activities/page.tsx) | [View image](../../assets/screenshots/newcrm-real/activities-form.jpg) |
| ثبت فرصت | `/opportunities` | [Code 1](source/frontend/components/sales-workspace.tsx) · [Code 2](source/frontend/app/opportunities/page.tsx) | [View image](../../assets/screenshots/newcrm-real/opportunities-form.jpg) |
| افزودن محصول جدید | `/products` | [Code 1](source/frontend/components/product-workspace.tsx) · [Code 2](source/frontend/app/products/page.tsx) | [View image](../../assets/screenshots/newcrm-real/products-form.jpg) |
| اعلان‌های من | `/activities` | [Code 1](source/frontend/components/activity-workspace.tsx) · [Code 2](source/frontend/app/activities/page.tsx) | [View image](../../assets/screenshots/newcrm-real/activities-notifications.jpg) |
| لوگو و آیکون مرورگر | `/settings` | [Code 1](source/frontend/components/settings-workspace.tsx) · [Code 2](source/frontend/app/settings/page.tsx) | [View image](../../assets/screenshots/newcrm-real/settings-section-1.jpg) |
| آمار سازمان | `/settings` | [Code 1](source/frontend/components/settings-workspace.tsx) · [Code 2](source/frontend/app/settings/page.tsx) | [View image](../../assets/screenshots/newcrm-real/settings-section-2.jpg) |
| ابزارهای سیستم | `/settings` | [Code 1](source/frontend/components/settings-workspace.tsx) · [Code 2](source/frontend/app/settings/page.tsx) | [View image](../../assets/screenshots/newcrm-real/settings-section-3.jpg) |

[Capture manifest and image hashes](CAPTURE_MANIFEST.json)
