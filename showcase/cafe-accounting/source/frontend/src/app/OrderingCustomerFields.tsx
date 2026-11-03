import { useEffect, useRef, useState } from "react";
import { api, Customer, OrderingCustomer } from "../shared/api";
import { normalizeContact } from "../shared/orderingCustomer";
import { TextField } from "../shared/ui/controls";

export function OrderingCustomerFields({ branchId, value, onChange, disabled, errors = {}, required = false, onReadyChange }: { branchId: string; value: OrderingCustomer; onChange: (value: OrderingCustomer) => void; disabled: boolean; errors?: Record<string, string>; required?: boolean; onReadyChange?: (ready: boolean) => void }) {
  const phone = normalizeContact(value.phone);
  const valid = /^09[0-9]{9}$/.test(phone);
  const [revision, setRevision] = useState(0);
  const [lookup, setLookup] = useState<{ key: string; customer?: Customer | null; failed?: boolean }>();
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);
  const key = `${branchId}:${phone}:${revision}`;
  const current = lookup?.key === key;
  const ready = !valid || (current && !lookup.failed);
  useEffect(() => { onReadyChange?.(ready); }, [onReadyChange, ready]);
  useEffect(() => {
    if (!valid || !branchId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api.lookupCustomer(branchId, phone, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLookup({ key, customer: result.customer });
        if (result.customer) change.current({ phone, last_name: result.customer.last_name });
      }, () => { if (!controller.signal.aborted) setLookup({ key, failed: true }); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [branchId, key, phone, valid]);
  return <fieldset className="ordering-customer-fields" disabled={disabled}>
    <legend>سفارش‌دهنده</legend>
    <p>{required ? "شماره تماس را وارد کنید؛ مشخصات مشتری قبلی نمایش داده می‌شود." : "شماره تماس را وارد کنید؛ ثبت مشتری در این مرحله اختیاری است."}</p>
    <TextField label="شماره تماس سفارش‌دهنده" name="phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel-national" placeholder="شماره تماس" maxLength={30} required={required} value={value.phone} onChange={(event) => onChange({ phone: event.target.value, last_name: normalizeContact(event.target.value) === phone ? value.last_name : "" })} error={errors.phone}/>
    {valid && !current && <p role="status" aria-busy="true">در حال بررسی شماره…</p>}
    {valid && current && lookup.failed && <div className="customer-lookup-feedback" role="alert"><p>بررسی شماره انجام نشد؛ دوباره تلاش کنید.</p><button type="button" className="button button--secondary" onClick={() => setRevision((n) => n + 1)}>بررسی دوباره</button></div>}
    {valid && current && !lookup.failed && (lookup.customer ? <div className="registered-customer" role="status"><span>مشتری ثبت‌شده</span><strong>{lookup.customer.last_name}</strong></div> : <TextField label="نام خانوادگی سفارش‌دهنده" name="last_name" autoComplete="family-name" maxLength={100} required value={value.last_name} onChange={(event) => onChange({ ...value, last_name: event.target.value })} error={errors.last_name} hint="مشتری جدید است؛ نام خانوادگی را وارد کنید."/>)}
  </fieldset>;
}
