import {
  FaTachometerAlt,
  FaUsers,
  FaPiggyBank,
  FaHandHoldingUsd,
  FaShoppingCart,
  FaBoxOpen,
  FaBook,
  FaPlus,
  FaChartBar,
  FaCogs,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaFileInvoiceDollar,
  FaUndo,
  FaBolt,
  FaListUl,
  FaHandshake,
  FaPercent,
  FaMoneyBillWave,
  FaBalanceScale,
  FaSave,
  FaTable,
  FaCompressArrowsAlt,
  FaBars,
} from "react-icons/fa";

export const menuConfig = [
  {
    path: "/dashboard",
    label: "داشبورد",
    icon: <FaTachometerAlt />,
    module: "dashboard",
  },

  {
    label: "اشخاص",
    icon: <FaUsers />,
    module: "persons",
    dropdown: [
      { path: "/persons/customers", label: "مشتریان" },
      { path: "/persons/vendors", label: "تأمین‌کنندگان" },
      { path: "/persons/sellers", label: "فروشندگان" },
      { path: "/persons/staff", label: "کارمندان" },
      { path: "/persons/drivers", label: "رانندگان" },
      { path: "/persons/shareholders", label: "سهام‌داران" },
      { module: "banking", path: "/persons/payment", label: "پرداخت ها" },
      { module: "banking", path: "/persons/receive", label: "دریافت‌ ها" },
      { path: "/persons/balances-report", label: "گزارش مانده اشخاص" },
      { path: "/persons/detail-audit", label: "کنترل تفضیل اشخاص" },
    ],
  },

  {
    label: "کالاها و خدمات",
    icon: <FaBoxOpen />,
    module: "catalog",
    dropdown: [
      { path: "/products/items", label: "کالاها" },
      { path: "/products/add", label: "کالای جدید", action: "write" },
      { path: "/services/items", label: "خدمات" },
      { path: "/services/add", label: "خدمت جدید", action: "write" },
      { path: "/products/price-list", label: "به روز رسانی لیست قیمت", action: "write" },
      { path: "/products/materialPrices", label: "لیست قیمت کالا ها" },
      { path: "/product/barcode-generator", label: "ساخت بارکد", action: "write" },
      { path: "/product/barcode-print", label: "چاپ بارکد", action: "write" },
      { path: "/product/barcode-bulk-print", label: "چاپ بارکد تعدادی", action: "write" },
    ],
  },

  {
    label: "بانکداری",
    icon: <FaPiggyBank />,
    module: "banking",
    dropdown: [
      { path: "/banking/banks", label: "بانک‌ها" },
      { path: "/banking/cashboxes", label: "صندوق‌ها" },
      { path: "/banking/imprest", label: "تنخواه‌گردان‌ها" },
      { path: "/banking/transfers/new", label: "انتقال بانکی", action: "write" },
      { path: "/banking/transfers", label: "لیست انتقال‌های بانکی" },
      { path: "/treasury/dashboard", label: "داشبورد خزانه" },
      { path: "/treasury/vouchers", label: "سند های خزانه" },
      { path: "/treasury/vouchers/new", label: "سند خزانه جدید", action: "write" },
      { path: "/banking/opening-balances", label: "افتتاحیه خزانه", action: "write" },
      { path: "/banking/received-checks", label: "لیست چک های دریافتی" },
      { path: "/banking/paid-checks", label: "لیست چک های پرداختی" },
      { path: "/banking/cheque-dashboard", label: "داشبورد چک‌ها" },
      {
        path: "/banking/cheque-accounting-audit",
        label: "کنترل اسناد چک‌ها",
      },
    ],
  },

  {
    label: "فروش و درآمد",
    icon: <FaHandHoldingUsd />,
    module: "sales",
    dropdown: [
      {
        path: "/sales/new",
        label: "فاکتور فروش جدید",
        icon: <FaFileInvoiceDollar />,
        action: "write"
      },
      {
        path: "/sales/quick-invoice",
        label: "فاکتور سریع",
        icon: <FaBolt />,
        action: "write"
      },
      {
        path: "/sales/returns/new",
        label: "فاکتور برگشت از فروش جدید",
        icon: <FaUndo />,
        action: "write"
      },
      {
        path: "/sales/list",
        label: "فاکتور های فروش",
        icon: <FaListUl />,
      },
      {
        path: "/sales/returns",
        label: "فاکتورهای برگشت از فروش",
        icon: <FaListUl />,
      },
      {
        path: "/sales/income/new",
        label: "درآمد جدید",
        icon: <FaMoneyBillWave />,
        action: "write"
      },
      {
        path: "/sales/income",
        label: "لیست درآمد ها",
        icon: <FaListUl />,
      },
      {
        path: "/sales/installment/contracts/new",
        label: "قرارداد فروش قسطی",
        icon: <FaHandshake />,
        action: "write"
      },
      {
        path: "/sales/installment/contracts",
        label: "لیست فروش قسطی",
        icon: <FaListUl />,
      },
      {
        path: "/sales/discounts",
        label: "لیست اقلام تخفیف دار",
        icon: <FaPercent />,
      },
    ],
  },

  {
    label: "خرید و هزینه",
    icon: <FaShoppingCart />,
    module: "purchases",
    dropdown: [
      {
        path: "/purchases/new",
        label: "فاکتور خرید جدید",
        icon: <FaFileInvoiceDollar />,
        action: "write"
      },
      {
        path: "/purchases/returns/new",
        label: "فاکتور برگشت از خرید جدید",
        icon: <FaUndo />,
        action: "write"
      },
      {
        path: "/purchases/invoices",
        label: "فاکتور های خرید",
        icon: <FaListUl />,
      },
      {
        path: "/purchases/returns",
        label: "فاکتور های برگشت از خرید",
        icon: <FaListUl />,
      },
      {
        path: "/purchases/expense/new",
        label: "هزینه جدید",
        icon: <FaMoneyBillWave />,
        action: "write"
      },
      {
        path: "/purchases/expense",
        label: "لیست هزینه ها",
        icon: <FaListUl />,
      },
      {
        path: "/purchases/waste/new",
        label: "ضایعات جدید",
        icon: <FaCompressArrowsAlt />,
        action: "write"
      },
      {
        path: "/purchases/waste",
        label: "لیست ضایعات",
        icon: <FaListUl />,
      },
    ],
  },

  {
    label: "انبارداری",
    icon: <FaBoxOpen />,
    module: "warehousing",
    dropdown: [
      { path: "/inventory/warehouses", label: "انبارها" },
      { path: "/inventory/transfers", label: "رسید و حواله های انبار" },
      { path: "/inventory/stock/items", label: "موجودی کالا" },
      { path: "/inventory/stock/all", label: "موجودی تمامی انبارها" },
      { path: "/inventory/stocktaking", label: "انبارگردانی", action: "write" },
    ],
  },

  {
    label: "حسابداری",
    icon: <FaBook />,
    module: "accounting",
    dropdown: [
      {
        path: "/accounting/dashboard",
        label: "داشبورد حسابداری",
        icon: <FaTable />,
      },
      {
        path: "/accounting/documents/create",
        label: "سند جدید",
        icon: <FaFileInvoiceDollar />,
        action: "write"
      },
      {
        path: "/accounting/documents",
        label: "لیست اسناد",
        icon: <FaListUl />,
      },
      {
        path: "/accounting/accounts",
        label: "جدول حساب ها",
        icon: <FaListUl />,
      },
      {
        path: "/accounting/details",
        label: "لیست تفصیل‌ها",
        icon: <FaListUl />,
      },
      {
        path: "/accounting/ledger",
        label: "دفتر کل",
        icon: <FaListUl />,
      },
      {
        path: "/accounting/trial-balance",
        label: "تراز آزمایشی",
        icon: <FaListUl />,
      },
      {
        path: "/accounting/opening-balance",
        label: "تراز افتتاحیه",
        icon: <FaBalanceScale />,
        action: "write"
      },
      {
        path: "/accounting/fiscal-years",
        label: "بستن سال مالی",
        icon: <FaSave />,
        action: "write"
      },
      {
        path: "/accounting/period-locks",
        label: "قفل دوره‌های مالی",
        icon: <FaSave />,
        action: "write"
      },
      {
        path: "/accounting/profit-loss",
        label: "سود و زیان",
        icon: <FaSave />,
      },
      {
        path: "/accounting/balance-sheet",
        label: "ترازنامه",
        icon: <FaSave />,
      },
      {
        path: "/accounting/document-summary",
        label: "تجمیع اسناد",
        icon: <FaCompressArrowsAlt />,
      },
      {
        path: "/accounting/year-end",
        label: "عملیات پایان سال",
        icon: <FaCompressArrowsAlt />,
        action: "write"
      },
    ],
  },

  {
    path: "/reports",
    label: "گزارش‌ها",
    icon: <FaChartBar />,
    module: "reports",
  },
  {
    label: "تنظیمات",
    icon: <FaCogs />,
    module: "settings",
    dropdown: [
      { path: "/settings/commercial-tools", label: "ابزارهای تجاری" },
      {
        path: "/settings",
        label: "مدیریت کاربران و نقش‌ها",
        action: "write",
      },
      {
        path: "/settings/audit-logs",
        label: "گزارش فعالیت کاربران",
        action: "read",
      },
    ],
  },
  {
    path: "/others",
    label: "سایر",
    icon: <FaPlus />,
    module: "others",
  },
];

