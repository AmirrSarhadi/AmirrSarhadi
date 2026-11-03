import PurchaseInvoiceList from "./PurchaseInvoiceList";

export default function PurchaseList() {
    return (
        <PurchaseInvoiceList
            title="فاکتورهای خرید"
            description="لیست فاکتورهای خرید ثبت‌شده در سیستم"
            apiPath="/costs/api/v2/buy_invoices/"
            createPath="/purchases/new"
        />
    );
}