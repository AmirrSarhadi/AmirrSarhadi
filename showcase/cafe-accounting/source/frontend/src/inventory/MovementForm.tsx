import { movementTitles } from "./movementConfig";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../shared/api";
import { Ingredient, MovementInput, MovementKind, inventoryApi } from "../shared/inventoryApi";
import { displayQuantity, inventoryUnit, inventoryQuantityError, storedQuantity } from "../shared/inventoryUnits";
import { ActionButton, Notice, SelectField, TextField } from "../shared/ui/controls";
import { decimalError, formatDecimal, money, normalizeNumber, unitLabels } from "../shared/ui/format";
import { Errors, useFormState } from "../shared/ui/forms";
import { useUnsavedChanges } from "../shared/ui/navigation";
import { CatalogStatus, IngredientSelect } from "./catalog";
import { useIngredientCatalog } from "./useIngredientCatalog";
import { clearPending, pendingKey, readPending, writePending } from "./pendingMovement";


const reasons = { receipt: "خرید مواد", waste: "ضایعات مواد", adjustment_in: "اصلاح افزایشی موجودی", adjustment_out: "اصلاح کاهشی موجودی" };

export function MovementForm({ cafeId, branchId, branchName, userId, initialKind, initialIngredient, onSaved }: {
  cafeId: string; branchId: string; branchName: string; userId: string; initialKind: MovementKind; initialIngredient?: Ingredient; onSaved: () => void;
}) {
  const storageKey = pendingKey(userId, cafeId, branchId);
  const [pending, setPending] = useState(() => readPending(storageKey));
  const [ingredient, setIngredient] = useState<Ingredient | null>(pending?.ingredient ?? initialIngredient ?? null);
  const [kind, setKind] = useState<MovementKind>(pending?.payload.kind ?? initialKind);
  const [quantity, setQuantity] = useState(pending ? displayQuantity(pending.payload.quantity, pending.payload.unit) : "");
  const [cost, setCost] = useState(pending?.payload.total_cost ?? "");
  const [reason, setReason] = useState(pending?.payload.reason ?? "");
  const [review, setReview] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);
  const state = useFormState(); const catalog = useIngredientCatalog(cafeId);
  const unit = inventoryUnit(ingredient?.base_unit ?? "g");
  const inward = kind === "receipt" || kind === "adjustment_in";
  const reviewing = review || !!pending;
  useUnsavedChanges(!!ingredient || !!quantity || !!cost || !!reason || !!pending, state.busy || !!pending);
  function validate() {
    if (pending) return {};
    const errors: Errors = {};
    if (!ingredient) errors.ingredient = "ماده اولیه را انتخاب کنید.";
    const quantityError = inventoryQuantityError(quantity, unit);
    if (quantityError) errors.quantity = quantityError;
    if (inward) { const error = decimalError(cost, 6); if (error) errors.total_cost = error; }
    if (reason.trim() && (reason.trim().length < 3 || reason.trim().length > 250)) errors.reason = "توضیح باید ۳ تا ۲۵۰ کاراکتر باشد.";
    return errors;
  }
  return <form className="panel inventory-form" noValidate onSubmit={(event) => void state.submit(event, validate, async () => {
    if (!reviewing) { setReview(true); return; }
    const operation = pending ?? { ingredient: ingredient!, payload: {
      ingredient: ingredient!.id, kind, ...storedQuantity(quantity, unit),
      ...(inward ? { total_cost: normalizeNumber(cost) } : {}), request_id: crypto.randomUUID(), reason: reason.trim() || reasons[kind],
    } satisfies MovementInput };
    writePending(storageKey, operation); setPending(operation);
    try {
      await inventoryApi.recordMovement(branchId, operation.payload);
      clearPending(storageKey); setPending(null); onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) { clearPending(storageKey); setPending(null); setReview(false); }
      throw error;
    }
  })}>
    {pending && <Notice tone="info">نتیجه درخواست قبلی مشخص نیست؛ «بررسی و تلاش دوباره» همان ثبت را پیگیری می‌کند. ثبت جدید نسازید.</Notice>}
    <fieldset disabled={state.busy || reviewing} hidden={reviewing}>
      {(initialKind === "adjustment_in" || initialKind === "adjustment_out") && <SelectField label="نوع اصلاح" value={kind} onChange={(event) => setKind(event.target.value as MovementKind)}><option value="adjustment_in">افزایش موجودی</option><option value="adjustment_out">کاهش موجودی</option></SelectField>}
      <IngredientSelect catalog={catalog} selected={ingredient} error={state.errors.ingredient} onSelect={setIngredient} />
      <TextField label={`مقدار (${unitLabels[unit]})`} name="quantity" value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} error={state.errors.quantity} hint={unit === "piece" ? "تعداد کامل وارد کنید." : `مثلاً ۱٫۵ ${unitLabels[unit]}؛ مقدار را با همین واحد وارد کنید.`} required />
      {inward && <TextField label={kind === "receipt" ? "مبلغ کل خرید (تومان)" : "ارزش مواد افزوده‌شده (تومان)"} name="total_cost" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} error={state.errors.total_cost} hint="مبلغ کل همین مقدار؛ نه قیمت یک واحد." required />}
      <TextField label="توضیح (اختیاری)" name="reason" value={reason} onChange={(event) => setReason(event.target.value)} error={state.errors.reason} maxLength={250} />
    </fieldset>
    {!reviewing && <CatalogStatus catalog={catalog} />}
    {reviewing && <section className="inventory-review" aria-labelledby="movement-review-title"><h3 id="movement-review-title" ref={reviewHeading} tabIndex={-1}>بررسی نهایی {movementTitles[kind]}</h3>
      <dl className="inventory-readout"><div><dt>شعبه</dt><dd>{branchName}</dd></div><div><dt>ماده اولیه</dt><dd>{ingredient?.name}</dd></div><div><dt>{inward ? "افزایش موجودی" : "کاهش موجودی"}</dt><dd>{formatDecimal(normalizeNumber(quantity))} {unitLabels[unit]}</dd></div>{inward && <div><dt>مبلغ کل</dt><dd>{money(normalizeNumber(cost))}</dd></div>}<div><dt>توضیح</dt><dd>{reason.trim() || reasons[kind]}</dd></div></dl>
      {!inward && <Notice tone="info">این مقدار از موجودی کم می‌شود؛ هزینه آن خودکار از میانگین موجودی محاسبه می‌شود.</Notice>}
    </section>}
    {state.error && <Notice tone="error">{state.error}</Notice>}
    <div className="ui-actions"><ActionButton type="submit" busy={state.busy} disabled={!pending && catalog.status !== "ready"}>{pending ? "بررسی و تلاش دوباره" : reviewing ? "تأیید و ثبت" : "بررسی و ادامه"}</ActionButton>{review && !pending && <ActionButton intent="secondary" disabled={state.busy} onClick={() => setReview(false)}>بازگشت و اصلاح</ActionButton>}</div>
  </form>;
}
