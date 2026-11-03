import { useCallback, useState } from "react";
import { inventoryApi } from "../shared/inventoryApi";
import { ActionButton, Notice, ResourceState, TextField } from "../shared/ui/controls";
import { dateError, daysBefore, formatDecimal, money, normalizeNumber, today } from "../shared/ui/format";
import { Errors, useFormState } from "../shared/ui/forms";
import { useResource } from "../shared/ui/useResource";

export function CostReportPanel({ branchId }: { branchId: string }) {
  const [end, setEnd] = useState(today);
  const [start, setStart] = useState(() => daysBefore(end, 29));
  const [applied, setApplied] = useState({ start, end });
  const form = useFormState();
  const loader = useCallback((signal: AbortSignal) => inventoryApi.report(branchId, applied.start, applied.end, signal), [branchId, applied]);
  const resource = useResource(`${branchId}:report:${applied.start}:${applied.end}`, loader);
  function validate() {
    const errors: Errors = {};
    const first = dateError(start); const last = dateError(end);
    if (first) errors.start_date = first;
    if (last) errors.end_date = last;
    if (!first && !last) {
      const days = (Date.parse(normalizeNumber(end)) - Date.parse(normalizeNumber(start))) / 86400000;
      if (days < 0 || days >= 366) errors.end_date = "بازه باید بین یک تا ۳۶۶ روز و تاریخ پایان پس از شروع باشد.";
    }
    return errors;
  }
  return <section className="inventory-report"><form className="panel inventory-report-filters" noValidate onSubmit={(event) => void form.submit(event, validate, async () => {
    setApplied({ start: normalizeNumber(start), end: normalizeNumber(end) }); resource.reload();
  })}><div><h3>بهای مواد و سود ناخالص</h3></div><TextField label="از تاریخ میلادی" name="start_date" value={start} onChange={(event) => setStart(event.target.value)} inputMode="numeric" dir="ltr" hint="قالب: 2026-10-01" error={form.errors.start_date} required /><TextField label="تا تاریخ میلادی" name="end_date" value={end} onChange={(event) => setEnd(event.target.value)} inputMode="numeric" dir="ltr" hint="قالب: 2026-10-12" error={form.errors.end_date} required /><ActionButton type="submit" busy={resource.status === "loading"}>نمایش گزارش</ActionButton>{form.error && <Notice tone="error">{form.error}</Notice>}</form>
    <p className="inventory-help">سود ناخالص فقط برای فروش‌های دارای بهای مشخص محاسبه می‌شود؛ هزینه‌های عملیاتی و ضایعات از آن کسر نشده‌اند.</p>
    <ResourceState {...resource} retry={resource.reload}>
      {resource.data && <><div className="panel"><p className="inventory-report-range">بازه ثبت‌شده: <bdi>{resource.data.start_date}</bdi> تا <bdi>{resource.data.end_date}</bdi> · {resource.data.timezone}</p>
        <dl className="inventory-readout inventory-readout--report"><div><dt>کل فروش</dt><dd>{money(resource.data.summary.sales_total)}</dd></div><div><dt>فروش دارای بهای مشخص</dt><dd>{money(resource.data.summary.costed_sales_total)}</dd></div><div><dt>بهای مواد مصرفی فروش</dt><dd>{money(resource.data.summary.cost_of_goods_sold)}</dd></div><div className="inventory-readout__emphasis"><dt>سود ناخالص فروش‌های دارای بها</dt><dd>{money(resource.data.summary.gross_profit_on_costed_sales)}</dd></div></dl>
        <p>{formatDecimal(resource.data.summary.invoice_count)} صورتحساب تسویه‌شده</p></div>
        {resource.data.summary.uncosted_line_count > 0 && <Notice tone="info">بهای {formatDecimal(resource.data.summary.uncosted_line_count)} قلم فروش مشخص نیست. این اقلام در محاسبه سود ناخالص وارد نشده‌اند؛ دستور تهیه آیتم‌ها را تکمیل کنید.</Notice>}
        {resource.data.summary.invoice_count === 0 && <div className="panel ui-data-state"><h4>در این بازه فروش تسویه‌شده‌ای ثبت نشده است</h4><p>بازه دیگری انتخاب کنید یا پس از تسویه سفارش‌ها گزارش بگیرید.</p></div>}
      </>}
    </ResourceState>
  </section>;
}
