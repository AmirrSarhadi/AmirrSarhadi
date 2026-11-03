import { displayQuantity, inventoryUnit, InventoryUnit, inventoryQuantityError, storedQuantity } from "../shared/inventoryUnits";
import { Modal } from "../shared/ui/Modal";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { useCallback, useRef, useState } from "react";
import { Ingredient, inventoryApi } from "../shared/inventoryApi";
import { ActionButton, Notice, Pagination, ResourceState, SelectField, TextField } from "../shared/ui/controls";
import { formatDecimal, unitLabels } from "../shared/ui/format";
import { Errors, useFormState } from "../shared/ui/forms";
import { useNavigationGuard, useUnsavedChanges } from "../shared/ui/navigation";
import { useResource } from "../shared/ui/useResource";

function IngredientForm({ cafeId, ingredient, onSaved, onCancel }: { cafeId: string; ingredient: Ingredient | null; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState<InventoryUnit>(inventoryUnit(ingredient?.base_unit ?? "g"));
  const [threshold, setThreshold] = useState(ingredient ? displayQuantity(ingredient.reorder_level, ingredient.base_unit) : "0");
  const state = useFormState();
  const dirty = name !== (ingredient?.name ?? "") || unit !== inventoryUnit(ingredient?.base_unit ?? "g") || threshold !== (ingredient ? displayQuantity(ingredient.reorder_level, ingredient.base_unit) : "0");
  useUnsavedChanges(dirty, state.busy);
  const { run } = useNavigationGuard();
  function validate() {
    const errors: Errors = {};
    if (!name.trim() || name.trim().length > 120) errors.name = "نام ماده را وارد کنید؛ حداکثر ۱۲۰ کاراکتر.";
    const error = inventoryQuantityError(threshold || "0", unit, true);
    if (error) errors.reorder_level = error;
    return errors;
  }
  return <form className="inventory-form panel" noValidate onSubmit={(event) => void state.submit(event, validate, async () => {
    const stored = storedQuantity(threshold || "0", unit);
    const data = { name: name.trim(), base_unit: stored.unit as Ingredient["base_unit"], reorder_level: stored.quantity };
    if (ingredient) await inventoryApi.updateIngredient(cafeId, ingredient.id, data);
    else await inventoryApi.createIngredient(cafeId, data);
    onSaved();
  })}>
    <h3>{ingredient ? `ویرایش ${ingredient.name}` : "تعریف ماده اولیه"}</h3>
    <p className="inventory-help">مواد برای همه شعبه‌های این کافه مشترک‌اند؛ موجودی هر شعبه جدا ثبت می‌شود.</p>
    <fieldset disabled={state.busy}><TextField label="نام ماده" name="name" value={name} onChange={(event) => setName(event.target.value)} error={state.errors.name} maxLength={120} required />
      <SelectField label="واحد پایه" value={unit} onChange={(event) => setUnit(event.target.value as InventoryUnit)} disabled={!!ingredient} hint="واحد پایه پس از تعریف تغییر نمی‌کند."><option value="kg">کیلوگرم</option><option value="l">لیتر</option><option value="piece">عدد</option></SelectField>
      <TextField label={`حد هشدار (${unitLabels[unit]})`} name="reorder_level" inputMode="decimal" value={threshold} onChange={(event) => setThreshold(event.target.value)} error={state.errors.reorder_level} hint="اختیاری؛ در این مقدار یا کمتر هشدار می‌گیرید. صفر یعنی هشدار هنگام اتمام." />
    </fieldset>
    {state.error && <Notice tone="error">{state.error}</Notice>}
    <div className="ui-actions"><ActionButton type="submit" busy={state.busy}>{ingredient ? "ذخیره ماده اولیه" : "ثبت ماده اولیه"}</ActionButton><ActionButton intent="text" disabled={state.busy} onClick={() => run(onCancel)}>انصراف</ActionButton></div>
  </form>;
}

export function IngredientsPanel({ cafeId, initialCreate = false }: { cafeId: string; initialCreate?: boolean }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Ingredient | null | undefined>(initialCreate ? null : undefined);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const loader = useCallback((signal: AbortSignal) => inventoryApi.ingredients(cafeId, page, signal), [cafeId, page]);
  const resource = useResource(`${cafeId}:ingredients:${page}`, loader);
  const { run } = useNavigationGuard();
  async function editIngredient(ingredient: Ingredient) {
    try { const fresh = await inventoryApi.ingredient(cafeId, ingredient.id); setNotice(""); setEditing(fresh); }
    catch { setNotice("دریافت اطلاعات تازه انجام نشد؛ دوباره تلاش کنید."); }
  }
  return <div className={editing !== undefined ? "inventory-split" : "inventory-single"}>
    <section className="panel inventory-table-panel"><div className="inventory-panel-heading"><div><h3 ref={heading} tabIndex={-1} data-navigation-focus>مواد اولیه کافه</h3></div><ActionButton disabled={editing !== undefined} onClick={() => { setNotice(""); setEditing(null); }}>ماده اولیه جدید</ActionButton></div>
      {notice && <Notice>{notice}</Notice>}
      <ResourceState {...resource} retry={resource.reload} empty={!resource.data?.count} emptyTitle="هنوز ماده اولیه‌ای تعریف نشده است">
        <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="جدول مواد اولیه"><table className="inventory-table"><caption className="sr-only">مواد اولیه کافه</caption><thead><tr><th scope="col">ماده اولیه</th><th scope="col">واحد پایه</th><th scope="col">حد هشدار</th><th scope="col">عملیات</th></tr></thead><tbody>{resource.data?.results.map((ingredient) => <tr key={ingredient.id}><th scope="row">{ingredient.name}</th><td>{unitLabels[inventoryUnit(ingredient.base_unit)]}</td><td>{formatDecimal(displayQuantity(ingredient.reorder_level, ingredient.base_unit))}</td><td><ActionButton intent="text" onClick={() => run(() => { void editIngredient(ingredient); })}><ActionIcon kind="edit" label={`ویرایش ${ingredient.name}`} /></ActionButton></td></tr>)}</tbody></table></div>
      </ResourceState>
      <Pagination count={resource.data?.count ?? 0} page={page} busy={resource.status === "loading"} onPage={(next) => run(() => setPage(next))} />
    </section>
    {editing !== undefined && <Modal title={editing ? "ویرایش ماده اولیه" : "ماده اولیه جدید"} open onClose={() => setEditing(undefined)}><IngredientForm key={editing?.id ?? "new"} cafeId={cafeId} ingredient={editing} onCancel={() => { setEditing(undefined); heading.current?.focus(); }} onSaved={() => { setNotice(editing ? "ماده اولیه ذخیره شد." : "ماده اولیه ثبت شد."); setEditing(undefined); resource.reload(); heading.current?.focus(); }} /></Modal>}
  </div>;
}
