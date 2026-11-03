import { FormEvent, useState } from "react";

import { OrderingCustomer, PaymentInput } from "../shared/api";

import { OrderingCustomerFields } from "./OrderingCustomerFields";
import { clearEditedCustomerErrors, emptyOrderingCustomer, normalizeContact, orderingCustomerErrors } from "../shared/orderingCustomer";

const formatPrice = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;

export function SettlementForm({ branchId, orderId, total, disabled, pending, customer: initialCustomer = emptyOrderingCustomer, onSettle }: {
  branchId: string;
  orderId: string;
  total: number;
  disabled: boolean;
  pending: boolean;
  customer?: OrderingCustomer;
  onSettle: (payments: PaymentInput[], customer: OrderingCustomer) => void;
}) {
  const [customerReady, setCustomerReady] = useState(true);
  const [customer, setCustomer] = useState(initialCustomer);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"single" | "split">("single");
  const [method, setMethod] = useState<PaymentInput["method"]>("card");
  const [cashAmount, setCashAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const numericCashAmount = Number(cashAmount);
  const cardAmount = Number.isFinite(numericCashAmount) ? total - numericCashAmount : total;
  const includesCard = mode === "split" || method !== "cash";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const errors = orderingCustomerErrors(customer, true); setCustomerErrors(errors);
    if (Object.keys(errors).length) { (event.currentTarget.elements.namedItem(Object.keys(errors)[0]) as HTMLElement | null)?.focus(); return; }
    const details = { last_name: customer.last_name.trim(), phone: normalizeContact(customer.phone) };
    if (mode === "split") {
      if (!cashAmount || !Number.isInteger(numericCashAmount) || numericCashAmount <= 0 || numericCashAmount >= total) {
        setError("مبلغ نقدی باید عددی صحیح، بیشتر از صفر و کمتر از جمع سفارش باشد.");
        return;
      }
      onSettle([
        { method: "cash", amount: numericCashAmount },
        { method: "card", amount: cardAmount, ...(reference.trim() ? { reference: reference.trim() } : {}) },
      ], details);
      return;
    }
    onSettle([{ method, amount: total, ...(method !== "cash" && reference.trim() ? { reference: reference.trim() } : {}) }], details);
  }

  return <form className="settlement-form" onSubmit={submit} noValidate>
    <OrderingCustomerFields branchId={branchId} onReadyChange={setCustomerReady} value={customer} onChange={(next) => { setCustomerErrors((current) => clearEditedCustomerErrors(current, customer, next)); setCustomer(next); }} disabled={pending} errors={customerErrors} required/>
    <label htmlFor={`payment-mode-${orderId}`}>نوع پرداخت</label>
    <select id={`payment-mode-${orderId}`} value={mode} onChange={(event) => { setMode(event.target.value as "single" | "split"); setError(""); }} disabled={pending}>
      <option value="single">یک روش پرداخت</option><option value="split">پرداخت ترکیبی</option>
    </select>
    {mode === "single" ? <>
      <label htmlFor={`method-${orderId}`}>روش پرداخت</label>
      <select id={`method-${orderId}`} value={method} onChange={(event) => setMethod(event.target.value as PaymentInput["method"])} disabled={pending}>
        <option value="card">کارت‌خوان</option><option value="cash">نقدی</option><option value="card_to_card">کارت به کارت</option>
      </select>
    </> : <div className="split-payment">
      <label htmlFor={`cash-amount-${orderId}`}>مبلغ نقدی (تومان)</label>
      <input id={`cash-amount-${orderId}`} type="number" inputMode="numeric" min="1" max={Math.max(total - 1, 1)} step="1" value={cashAmount} onChange={(event) => { setCashAmount(event.target.value); setError(""); }} disabled={pending}/>
      <div className="split-payment__summary" aria-live="polite"><span>مبلغ کارت‌خوان</span><strong>{cashAmount && cardAmount > 0 ? formatPrice(cardAmount) : "—"}</strong></div>
    </div>}
    {includesCard && <><label htmlFor={`reference-${orderId}`}>شماره پیگیری</label><input id={`reference-${orderId}`} value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} disabled={pending}/></>}
    {error && <p className="settlement-form__error" role="alert">{error}</p>}
    <button className="button button--settle" disabled={disabled || pending || !customerReady}>{pending ? "در حال ثبت…" : `تسویه ${formatPrice(total)}`}</button>
  </form>;
}
