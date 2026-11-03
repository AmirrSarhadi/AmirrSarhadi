# Cafe Accounting — Tabs, Pages & Workflow Coverage

[← Project](README.md) · [Full image gallery](GALLERY.md) · [All published code](SOURCE_INDEX.md) · [Source scope](../SOURCE_SCOPE.md)

**90 source files · 18 captured views.** The rows below cover implemented navigation pages and selected forms/subtabs, not every possible record or dialog state. Desktop captures use demonstration records or explicit API fixtures; empty states are included where no demo record is selected. Authentication/payment/provider internals remain outside the public source release.

| Page / state | Route or navigation key | Published code | Screenshot / status |
| --- | --- | --- | --- |
| مدیریت منو | `menu` | [Code 1](source/frontend/src/app/MenuItemEditor.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/menu.jpg) |
| ثبت سفارش | `order-entry` | [Code 1](source/frontend/src/app/OrderEntry.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/order-entry.jpg) |
| سفارش‌های باز | `open-orders` | [Code 1](source/frontend/src/app/OpenOrders.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/open-orders.jpg) |
| آرشیو صورتحساب‌ها | `receipts` | [Code 1](source/frontend/src/app/ReceiptArchive.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/receipts.jpg) |
| مشتری‌ها | `customers` | [Code 1](source/frontend/src/app/CustomerDirectory.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/customers.jpg) |
| مدیریت میزها | `tables` | [Code 1](source/frontend/src/app/TableManagement.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/tables.jpg) |
| شیفت صندوق | `cash-shifts` | [Code 1](source/frontend/src/app/CashShiftManager.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/cash-shifts.jpg) |
| هزینه‌ها | `expenses` | [Code 1](source/frontend/src/app/ExpenseManager.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/expenses.jpg) |
| گزارش روزانه | `daily-report` | [Code 1](source/frontend/src/app/DailySalesReport.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/daily-report.jpg) |
| گزارش بازه‌ای | `range-report` | [Code 1](source/frontend/src/app/SalesRangeReport.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/range-report.jpg) |
| انبار و بهای تمام‌شده | `inventory` | [Code 1](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory.jpg) |
| موجودی | `inventory-stock` | [Code 1](source/frontend/src/inventory/StockPanel.tsx) · [Code 2](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory-stock.jpg) |
| مواد اولیه | `inventory-ingredients` | [Code 1](source/frontend/src/inventory/IngredientsPanel.tsx) · [Code 2](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory-ingredients.jpg) |
| تاریخچه انبار | `inventory-movements` | [Code 1](source/frontend/src/inventory/MovementsPanel.tsx) · [Code 2](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory-movements.jpg) |
| دستور تهیه | `inventory-recipes` | [Code 1](source/frontend/src/inventory/RecipesPanel.tsx) · [Code 2](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory-recipes.jpg) |
| بهای تمام‌شده | `inventory-cost-report` | [Code 1](source/frontend/src/inventory/CostReportPanel.tsx) · [Code 2](source/frontend/src/inventory/InventoryWorkspace.tsx) | [View image](../../assets/screenshots/cafe-accounting/inventory-cost-report.jpg) |
| تنظیمات | `settings` | [Code 1](source/frontend/src/app/Settings.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/settings.jpg) |
| راهنما | `help` | [Code 1](source/frontend/src/app/HelpGuide.tsx) · [Code 2](source/frontend/src/app/App.tsx) | [View image](../../assets/screenshots/cafe-accounting/help.jpg) |

[Capture manifest and image hashes](CAPTURE_MANIFEST.json)
