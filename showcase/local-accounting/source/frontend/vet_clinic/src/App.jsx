const CommercialTools = lazy(() => import("./Pages/Settings/CommercialTools/CommercialTools"));
const TreasuryOpening = lazy(() => import("./Pages/BankTable/OpeningBalance/TreasuryOpening"));
// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { lazy, Suspense, useState } from "react";

// Auth
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
const Login = lazy(() => import("./Pages/Auth/Login/Login"));
import ModuleRoute from "./components/ProtectedRoute/ModuleRoute";
const Forbidden = lazy(() => import("./Pages/Auth/Forbidden/Forbidden"));



// Pages :

// dashboard
const Dashboard = lazy(() => import("./Pages/Dashboard/Dashboard"));

// settings
const UserManagement = lazy(() => import("./Pages/Settings/UserManagement/UserManagement"));
const AuditLogs = lazy(() => import("./Pages/Settings/AuditLogs/AuditLogs"));

// Accounting
const CreateDocument = lazy(() => import("./Pages/Accounting/documents/CreateDocument/CreateDocument"));
const DocumentList = lazy(() => import("./Pages/Accounting/documents/DocumentList/DocumentList"));
const DocumentDetail = lazy(() => import("./Pages/Accounting/documents/DocumentDetail/DocumentDetail"));
const EditDocument = lazy(() => import("./Pages/Accounting/documents/EditDocument/EditDocument"));
const AccountList = lazy(() => import("./Pages/Accounting/accounts/AccountList/AccountList"));
const JournalList = lazy(() => import("./Pages/Accounting/journal/JournalList/JournalList"));
const LedgerList = lazy(() => import("./Pages/Accounting/ledger/LedgerList/LedgerList"));
const TrialBalance = lazy(() => import("./Pages/Accounting/reports/TrialBalance/TrialBalance"));
const OpeningBalance = lazy(() => import("./Pages/Accounting/openingBalance/OpeningBalance/OpeningBalance"));
const FiscalYearList = lazy(() => import("./Pages/Accounting/fiscalYears/FiscalYearList/FiscalYearList"));
const ProfitLoss = lazy(() => import("./Pages/Accounting/reports/ProfitLoss/ProfitLoss"));
const BalanceSheet = lazy(() => import("./Pages/Accounting/reports/BalanceSheet/BalanceSheet"));
const DocumentSummary = lazy(() => import("./Pages/Accounting/reports/DocumentSummary/DocumentSummary"));
const AccountingDashboard = lazy(() => import("./Pages/Accounting/dashboard/AccountingDashboard/AccountingDashboard"));
const YearEndOperations = lazy(() => import("./Pages/Accounting/yearEnd/YearEndOperations/YearEndOperations"));
const DetailList = lazy(() => import("./Pages/Accounting/details/DetailAccountList/DetailList"));
const DetailLedger = lazy(() => import("./Pages/Accounting/details/DetailLedger/DetailLedger"));
const PeriodLocks = lazy(() => import("./Pages/Accounting/PeriodLocks/PeriodLocks"));

// Banking
const BankTable = lazy(() => import("./Pages/BankTable/BankTable"));
const ImprestTable = lazy(() => import("./Pages/Imprests/ImprestTable"));
const CashboxTable = lazy(() => import("./Pages/Cashboxes/CashboxTable"));
const NewTransfer = lazy(() => import("./Pages/BankTable/Transfer/NewTransfer"));
const BankTransferList = lazy(() => import("./Pages/BankTable/Transfer/BankTransferList"));
const ReceivedChecksTable = lazy(() => import("./Pages/BankTable/ReceivedChecks/ReceivedChecksTable"));
const PaidChecksTable = lazy(() => import("./Pages/BankTable/PaidChecks/PaidChecksTable"));
const TreasuryVoucherList = lazy(() => import("./Pages/BankTable/Treasury/Vouchers/TreasuryVoucherList"));
const TreasuryVoucherForm = lazy(() => import("./Pages/BankTable/Treasury/Vouchers/TreasuryVoucherForm"));
const TreasuryVoucherDetail = lazy(() => import("./Pages/BankTable/Treasury/Vouchers/TreasuryVoucherDetail"));
const TreasuryDashboard = lazy(() => import("./Pages/BankTable/Treasury/Dashboard/TreasuryDashboard"));
const ChequeDashboard = lazy(() => import("./Pages/BankTable/ChequeDashboard/ChequeDashboard"));
const ChequeAccountingAudit = lazy(() => import("./Pages/BankTable/ChequeAccountingAudit/ChequeAccountingAudit"));

// Warehousing
const InventoryTable = lazy(() => import("./Pages/Inventory/InventoryTable"));
const ReceiptsTable = lazy(() => import("./Pages/Inventory/ReceiptsTable"));
const AddReceiptStep2 = lazy(() => import("./Pages/Inventory/AddReceiptStep2"));
const EditReceipt = lazy(() => import("./Pages/Inventory/EditReceipt"));
const StockItems = lazy(() => import("./Pages/Inventory/StockItems"));
const AllWarehousesInventory = lazy(() => import("./Pages/Inventory/AllWarehousesInventory"));
const StockTakingList = lazy(() => import("./Pages/Inventory/StockTakingList"));
const StockTakingCreate = lazy(() => import("./Pages/Inventory/StockTakingCreate"));

// Services / Products
const ProductItemsTable = lazy(() => import("./Pages/Products/Items/ProductItemsTable"));
const AddProductForm = lazy(() => import("./Pages/Products/Items/AddProduct/AddProductForm"));
const ServiceItemsTable = lazy(() => import("./Pages/Services/ServiceItemsTable"));
const AddServiceForm = lazy(() => import("./Pages/Services/AddServices/AddProductForm"));
const MaterialEdit = lazy(() => import("./Pages/Products/Items/EditProduct/MaterialEdit"));
const ServiceEdit = lazy(() => import("./Pages/Services/EditServices/ServiceEdit"));
const PriceList = lazy(() => import("./Pages/Products/Items/PriceList/PriceList"));
const BarcodeGenerator = lazy(() => import("./Pages/Products/Items/BarcodeGenerator/BarcodeGenerator"));
const BarcodePrint = lazy(() => import("./Pages/Products/Items/BarcodePrint/BarcodePrint"));
const BarcodeBulkPrint = lazy(() => import("./Pages/Products/Items/BarcodeBulkPrint/BarcodeBulkPrint"));

// Persons
const Customers = lazy(() => import("./Pages/Persons/CustomerList"));
const CustomerForm = lazy(() => import("./Pages/Persons/CustomerForm"));
const Vendors = lazy(() => import("./Pages/Persons/VendorList"));
const VendorForm = lazy(() => import("./Pages/Persons/VendorForm"));
const Sellers = lazy(() => import("./Pages/Persons/SellerList"));
const SellerForm = lazy(() => import("./Pages/Persons/SellerForm"));
const StaffList = lazy(() => import("./Pages/Persons/StaffList"));
const StaffForm = lazy(() => import("./Pages/Persons/StaffForm"));
const DriverList = lazy(() => import("./Pages/Persons/DriverList"));
const DriverForm = lazy(() => import("./Pages/Persons/DriverForm"));
const ShareHolderList = lazy(() => import("./Pages/Persons/ShareHolderList"));
const ShareHolderForm = lazy(() => import("./Pages/Persons/ShareHolderForm"));
const PersonPaymentList = lazy(() => import("./Pages/Persons/Payment/PersonPaymentList"));
const PersonPaymentForm = lazy(() => import("./Pages/Persons/Payment/PersonPaymentForm"));
const PersonReceiveList = lazy(() => import("./Pages/Persons/Receive/PersonReceiveList"));
const PersonReceiveForm = lazy(() => import("./Pages/Persons/Receive/PersonReceiveForm"));
const PersonBalancesReport = lazy(() => import("./Pages/Persons/Reports/PersonBalancesReport"));
const PersonDetailAudit = lazy(() => import("./Pages/Persons/Reports/PersonDetailAudit"));

// Sales
const SalesCreate = lazy(() => import("./Pages/Sales/Invoices/SalesCreate"));
const SalesList = lazy(() => import("./Pages/Sales/Invoices/SalesList"));
const ReturnedSalesInvoiceCreate = lazy(() => import("./Pages/Sales/Invoices/ReturnedSalesInvoiceCreate"));
const ReturnedSalesInvoiceList = lazy(() => import("./Pages/Sales/Invoices/ReturnedSalesInvoiceList"));
const DiscountsCreate = lazy(() => import("./Pages/Sales/DiscountsCreate"));
const DiscountsList = lazy(() => import("./Pages/Sales/DiscountsList"));
const QuickSalesInvoice = lazy(() => import("./Pages/Sales/Invoices/QuickSalesInvoice"));
const IncomeCreate = lazy(() => import("./Pages/Sales/Income/IncomeCreate"));
const IncomeList = lazy(() => import("./Pages/Sales/Income/IncomeList"));
const InstallmentContractCreate = lazy(() => import("./Pages/Sales/Installments/ContractCreate"));
const InstallmentContractList = lazy(() => import("./Pages/Sales/Installments/ContractList"));
const InstallmentContractDetail = lazy(() => import("./Pages/Sales/Installments/ContractDetail"));
const InstallmentReport = lazy(() => import("./Pages/Sales/Installments/InstallmentReport"));

// Costs / Purchases
const PurchaseCreate = lazy(() => import("./Pages/Purchases/Invoices/PurchaseCreate"));
const ReturnedPurchaseCreate = lazy(() => import("./Pages/Purchases/Invoices/ReturnedPurchaseCreate"));
const PurchaseList = lazy(() => import("./Pages/Purchases/Invoices/PurchaseList"));
const ReturnedPurchaseList = lazy(() => import("./Pages/Purchases/Invoices/ReturnedPurchaseList"));
const ExpenseCreate = lazy(() => import("./Pages/Purchases/Expense/ExpenseCreate"));
const ExpenseList = lazy(() => import("./Pages/Purchases/Expense/ExpenseList"));
const WasteCreate = lazy(() => import("./Pages/Purchases/Waste/WasteCreate"));
const WasteList = lazy(() => import("./Pages/Purchases/Waste/WasteList"));

// Reports
const ReportsHub = lazy(() => import("./Pages/Reports/ReportsHub/ReportsHub"));
const CommercialReport = lazy(() => import("./Pages/Reports/CommercialReports/CommercialReport"));
const CommercialAdvancedReport = lazy(() => import("./Pages/Reports/CommercialReports/CommercialAdvancedReport"));
const TreasuryLedgerReport = lazy(() => import("./Pages/Reports/BankingReports/TreasuryLedgerReport"));
const MaterialLedgerReport = lazy(() => import("./Pages/Reports/InventoryReports/MaterialLedgerReport"));
const SerialNumberReport = lazy(() => import("./Pages/Reports/InventoryReports/SerialNumberReport"));

// Context
import { ReceiptProvider } from "./Pages/Inventory/ReceiptContext";

// Components
import Sidebar from "./components/Sidebar/Sidebar";
import TopNavbar from "./components/TopNavbar/TopNavbar";


const Placeholder = ({ title }) => <div className="page-card">{title}</div>;

const guarded = (moduleName, action, element) => (
  <ModuleRoute module={moduleName} action={action}>
    {element}
  </ModuleRoute>
);

function AuthenticatedLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ReceiptProvider>
      <Sidebar
        collapsed={mobileSidebarOpen ? false : sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopNavbar onMenuOpen={() => setMobileSidebarOpen(true)} />

        <main className="app-content">
          <Suspense fallback={<div className="page-card" role="status">در حال بارگیری صفحه...</div>}><Outlet /></Suspense>
        </main>
      </div>
    </ReceiptProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3200}
          rtl
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          pauseOnHover
          theme="light"
          aria-label="اعلان‌های سامانه"
        />

        <Suspense fallback={<div className="page-card" role="status">در حال بارگیری صفحه...</div>}>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Forbidden page */}
          <Route path="/403" element={<Forbidden />} />

          {/* Protected App */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedLayout />
              </ProtectedRoute>
            }
          >
            {/* عمومی */}
            <Route path="/" element={guarded("dashboard", "read", <Dashboard />)} />
            <Route path="/dashboard" element={guarded("dashboard", "read", <Dashboard />)} />

            {/* اشخاص */}
            <Route path="/settings/commercial-tools" element={guarded("settings", "write", <CommercialTools />)} />
            <Route path="/banking/opening-balances" element={guarded("banking", "write", <TreasuryOpening />)} />
            <Route path="/persons/customers" element={guarded("persons", "read", <Customers />)} />
            <Route path="/persons/customers/add" element={guarded("persons", "write", <CustomerForm />)} />
            <Route path="/persons/customers/edit/:id" element={guarded("persons", "write", <CustomerForm />)} />

            <Route path="/persons/vendors" element={guarded("persons", "read", <Vendors />)} />
            <Route path="/persons/vendors/add" element={guarded("persons", "write", <VendorForm />)} />
            <Route path="/persons/vendors/edit/:id" element={guarded("persons", "write", <VendorForm />)} />

            <Route path="/persons/sellers" element={guarded("persons", "read", <Sellers />)} />
            <Route path="/persons/sellers/add" element={guarded("persons", "write", <SellerForm />)} />
            <Route path="/persons/sellers/edit/:id" element={guarded("persons", "write", <SellerForm />)} />

            <Route path="/persons/staff" element={guarded("persons", "read", <StaffList />)} />
            <Route path="/persons/staff/add" element={guarded("persons", "write", <StaffForm />)} />
            <Route path="/persons/staff/edit/:id" element={guarded("persons", "write", <StaffForm />)} />

            <Route path="/persons/drivers" element={guarded("persons", "read", <DriverList />)} />
            <Route path="/persons/drivers/add" element={guarded("persons", "write", <DriverForm />)} />
            <Route path="/persons/drivers/edit/:id" element={guarded("persons", "write", <DriverForm />)} />

            <Route path="/persons/shareholders" element={guarded("persons", "read", <ShareHolderList />)} />
            <Route path="/persons/shareholders/add" element={guarded("persons", "write", <ShareHolderForm />)} />
            <Route path="/persons/shareholders/edit/:id" element={guarded("persons", "write", <ShareHolderForm />)} />

            <Route path="/persons/payment" element={guarded("banking", "read", <PersonPaymentList />)} />
            <Route path="/persons/payment/add" element={guarded("banking", "write", <PersonPaymentForm />)} />
            <Route path="/persons/receive" element={guarded("banking", "read", <PersonReceiveList />)} />
            <Route path="/persons/receive/add" element={guarded("banking", "write", <PersonReceiveForm />)} />

            <Route path="/persons/balances-report" element={guarded("persons", "read", <PersonBalancesReport />)} />
            <Route path="/persons/detail-audit" element={guarded("persons", "read", <PersonDetailAudit />)} />

            {/* بانکداری */}
            <Route path="/banking/banks" element={guarded("banking", "read", <BankTable />)} />
            <Route path="/banking/cashboxes" element={guarded("banking", "read", <CashboxTable />)} />
            <Route path="/banking/imprest" element={guarded("banking", "read", <ImprestTable />)} />
            <Route path="/banking/transfers" element={guarded("banking", "read", <BankTransferList />)} />
            <Route path="/banking/transfers/new" element={guarded("banking", "write", <NewTransfer />)} />
            <Route path="/banking/received-checks" element={guarded("banking", "read", <ReceivedChecksTable />)} />
            <Route path="/banking/paid-checks" element={guarded("banking", "read", <PaidChecksTable />)} />

            <Route path="/treasury/dashboard" element={guarded("banking", "read", <TreasuryDashboard />)} />
            <Route path="/treasury/vouchers" element={guarded("banking", "read", <TreasuryVoucherList />)} />
            <Route path="/treasury/vouchers/new" element={guarded("banking", "write", <TreasuryVoucherForm />)} />
            <Route path="/treasury/vouchers/:id" element={guarded("banking", "read", <TreasuryVoucherDetail />)} />
            <Route path="/treasury/vouchers/:id/edit" element={guarded("banking", "write", <TreasuryVoucherForm />)} />

            <Route path="/banking/cheque-dashboard" element={guarded("banking", "read", <ChequeDashboard />)} />
            <Route
              path="/banking/cheque-accounting-audit"
              element={guarded("banking", "read", <ChequeAccountingAudit />)}
            />

            {/* کالا و خدمات */}
            <Route path="/products/items" element={guarded("catalog", "read", <ProductItemsTable />)} />
            <Route path="/products/add" element={guarded("catalog", "write", <AddProductForm />)} />
            <Route path="/products/edit/:pk" element={guarded("catalog", "write", <MaterialEdit />)} />
            <Route path="/services/items" element={guarded("catalog", "read", <ServiceItemsTable />)} />
            <Route path="/services/add" element={guarded("catalog", "write", <AddServiceForm />)} />
            <Route path="/services/edit/:pk" element={guarded("catalog", "write", <ServiceEdit />)} />
            <Route path="/products/price-list" element={guarded("catalog", "write", <PriceList />)} />
            <Route path="/products/materialPrices" element={guarded("catalog", "read", <PriceList />)} />
            <Route path="/product/barcode-generator" element={guarded("catalog", "write", <BarcodeGenerator />)} />
            <Route path="/product/barcode-print" element={guarded("catalog", "write", <BarcodePrint />)} />
            <Route path="/product/barcode-bulk-print" element={guarded("catalog", "write", <BarcodeBulkPrint />)} />

            {/* انبار */}
            <Route path="/inventory/warehouses" element={guarded("warehousing", "read", <InventoryTable />)} />
            <Route path="/inventory/transfers" element={guarded("warehousing", "read", <ReceiptsTable />)} />
            <Route path="/inventory/transfers/new/edit/:id" element={guarded("warehousing", "write", <EditReceipt />)} />
            <Route path="/inventory/transfers/new/details" element={guarded("warehousing", "write", <AddReceiptStep2 />)} />
            <Route path="/inventory/stock/items" element={guarded("warehousing", "read", <StockItems />)} />
            <Route path="/inventory/stock/all" element={guarded("warehousing", "read", <AllWarehousesInventory />)} />
            <Route path="/inventory/stocktaking" element={guarded("warehousing", "read", <StockTakingList />)} />
            <Route path="/inventory/stocktaking/:id" element={guarded("warehousing", "write", <StockTakingCreate />)} />

            {/* فروش */}
            <Route path="/sales/new" element={guarded("sales", "write", <SalesCreate />)} />
            <Route path="/sales/list" element={guarded("sales", "read", <SalesList />)} />
            <Route path="/sales/returns/new" element={guarded("sales", "write", <ReturnedSalesInvoiceCreate />)} />
            <Route path="/sales/returns" element={guarded("sales", "read", <ReturnedSalesInvoiceList />)} />
            <Route path="/sales/discounts/new" element={guarded("sales", "write", <DiscountsCreate />)} />
            <Route path="/sales/discounts" element={guarded("sales", "read", <DiscountsList />)} />
            <Route path="/sales/quick-invoice" element={guarded("sales", "write", <QuickSalesInvoice />)} />
            <Route path="/sales/income/new" element={guarded("sales", "write", <IncomeCreate />)} />
            <Route path="/sales/income" element={guarded("sales", "read", <IncomeList />)} />
            <Route path="/sales/income/edit/:id" element={guarded("sales", "write", <IncomeCreate />)} />
            <Route path="/sales/installment/contracts/new" element={guarded("sales", "write", <InstallmentContractCreate />)} />
            <Route path="/sales/installment/contracts" element={guarded("sales", "read", <InstallmentContractList />)} />
            <Route path="/sales/installment/contracts/:id" element={guarded("sales", "read", <InstallmentContractDetail />)} />

            {/* خرید */}
            <Route path="/purchases/new" element={guarded("purchases", "write", <PurchaseCreate />)} />
            <Route path="/purchases/returns/new" element={guarded("purchases", "write", <ReturnedPurchaseCreate />)} />
            <Route path="/purchases/invoices" element={guarded("purchases", "read", <PurchaseList />)} />
            <Route path="/purchases/returns" element={guarded("purchases", "read", <ReturnedPurchaseList />)} />
            <Route path="/purchases/expense/new" element={guarded("purchases", "write", <ExpenseCreate />)} />
            <Route path="/purchases/expense" element={guarded("purchases", "read", <ExpenseList />)} />
            <Route path="/purchases/expense/edit/:id" element={guarded("purchases", "write", <ExpenseCreate />)} />
            <Route path="/purchases/waste/new" element={guarded("purchases", "write", <WasteCreate />)} />
            <Route path="/purchases/waste" element={guarded("purchases", "read", <WasteList />)} />

            {/* حسابداری */}
            <Route path="/accounting/documents/create" element={guarded("accounting", "write", <CreateDocument />)} />
            <Route path="/accounting/documents" element={guarded("accounting", "read", <DocumentList />)} />
            <Route path="/accounting/documents/:id" element={guarded("accounting", "read", <DocumentDetail />)} />
            <Route path="/accounting/documents/:id/edit" element={guarded("accounting", "write", <EditDocument />)} />
            <Route path="/accounting/accounts" element={guarded("accounting", "read", <AccountList />)} />
            <Route path="/accounting/journal" element={guarded("accounting", "read", <JournalList />)} />
            <Route path="/accounting/ledger" element={guarded("accounting", "read", <LedgerList />)} />
            <Route path="/accounting/trial-balance" element={guarded("accounting", "read", <TrialBalance />)} />
            <Route path="/accounting/opening-balance" element={guarded("accounting", "write", <OpeningBalance />)} />
            <Route path="/accounting/fiscal-years" element={guarded("accounting", "write", <FiscalYearList />)} />
            <Route path="/accounting/profit-loss" element={guarded("accounting", "read", <ProfitLoss />)} />
            <Route path="/accounting/balance-sheet" element={guarded("accounting", "read", <BalanceSheet />)} />
            <Route path="/accounting/document-summary" element={guarded("accounting", "read", <DocumentSummary />)} />
            <Route path="/accounting/dashboard" element={guarded("accounting", "read", <AccountingDashboard />)} />
            <Route path="/accounting/year-end" element={guarded("accounting", "write", <YearEndOperations />)} />
            <Route path="/accounting/details" element={guarded("accounting", "read", <DetailList />)} />
            <Route path="/accounting/details/:id/ledger" element={guarded("accounting", "read", <DetailLedger />)} />
            <Route path="/accounting/period-locks" element={guarded("accounting", "write", <PeriodLocks />)} />

            {/* گزارشات */}
            <Route path="/reports" element={guarded("reports", "read", <ReportsHub />)} />
            <Route path="/reports/installments" element={guarded("sales", "read", <InstallmentReport />)} />

            <Route
              path="/reports/sales-by-invoice"
              element={guarded("sales", "read", <CommercialReport type="sales" mode="invoice" />)}
            />
            <Route
              path="/reports/sales-by-item"
              element={guarded("sales", "read", <CommercialReport type="sales" mode="item" />)}
            />
            <Route
              path="/reports/purchases-by-invoice"
              element={guarded("purchases", "read", <CommercialReport type="purchases" mode="invoice" />)}
            />
            <Route
              path="/reports/purchases-by-item"
              element={guarded("purchases", "read", <CommercialReport type="purchases" mode="item" />)}
            />

            <Route path="/reports/tax" element={guarded("sales", "read", <CommercialAdvancedReport report="tax" />)} />
            <Route
              path="/reports/invoice-profit"
              element={guarded("sales", "read", <CommercialAdvancedReport report="profit" />)}
            />
            <Route
              path="/reports/sales-by-seller"
              element={guarded("sales", "read", <CommercialAdvancedReport report="sellers" />)}
            />
            <Route
              path="/reports/invoice-summary-by-person"
              element={guarded("sales", "read", <CommercialAdvancedReport report="persons" />)}
            />

            <Route
              path="/reports/bank-ledger"
              element={guarded("banking", "read", <TreasuryLedgerReport treasuryType="bank" />)}
            />
            <Route
              path="/reports/cashbox-ledger"
              element={guarded("banking", "read", <TreasuryLedgerReport treasuryType="cashbox" />)}
            />
            <Route
              path="/reports/imprest-ledger"
              element={guarded("banking", "read", <TreasuryLedgerReport treasuryType="imprest" />)}
            />

            <Route path="/reports/material-ledger" element={guarded("warehousing", "read", <MaterialLedgerReport />)} />
            <Route path="/reports/serial-numbers" element={guarded("warehousing", "read", <SerialNumberReport />)} />

            {/* سایر و تنظیمات */}
            <Route path="/others" element={guarded("others", "read", <Placeholder title="➕ سایر" />)} />
            <Route path="/settings" element={guarded("settings", "write", <UserManagement />)} />
            <Route
              path="/settings/audit-logs"
              element={guarded("settings", "read", <AuditLogs />)}
            />

            <Route path="*" element={<Placeholder title="❓ صفحه پیدا نشد" />} />
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;

