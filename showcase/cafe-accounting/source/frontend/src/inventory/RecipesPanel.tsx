import { convertQuantity, displayQuantity, inventoryUnit, inventoryQuantityError, storedQuantity } from "../shared/inventoryUnits";
import { Modal } from "../shared/ui/Modal";
import { ActionIcon } from "../shared/ui/ActionIcon";
import { useCallback, useRef, useState } from "react";
import { ApiError, MenuItem } from "../shared/api";
import { Ingredient, Recipe, Unit, inventoryApi } from "../shared/inventoryApi";
import { ActionButton, Notice, ResourceState, SelectField, TextField } from "../shared/ui/controls";
import { formatDecimal, money, unitLabels } from "../shared/ui/format";
import { Errors, useFormState } from "../shared/ui/forms";
import { useNavigationGuard, useUnsavedChanges } from "../shared/ui/navigation";
import { useResource } from "../shared/ui/useResource";
import { CatalogStatus, IngredientSelect } from "./catalog";
import { useIngredientCatalog } from "./useIngredientCatalog";

type Row = { key: string; ingredient: Ingredient | null; quantity: string; unit: Unit };
const emptyRow = (): Row => ({ key: crypto.randomUUID(), ingredient: null, quantity: "", unit: "g" });

function RecipeForm({ cafeId, itemId, recipe, onSaved, onReload }: { cafeId: string; itemId: string; recipe: Recipe | null; onSaved: () => void; onReload: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => recipe ? recipe.components.map((component) => ({
    key: crypto.randomUUID(), ingredient: { id: component.ingredient, name: component.ingredient_name, base_unit: component.unit, reorder_level: "0" }, quantity: component.quantity, unit: component.unit,
  })) : [emptyRow()]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(rows));
  const state = useFormState(); const catalog = useIngredientCatalog(cafeId); const { run } = useNavigationGuard();
  useUnsavedChanges(JSON.stringify(rows) !== baseline, state.busy);
  function update(key: string, change: Partial<Row>) { setRows((current) => current.map((row) => row.key === key ? { ...row, ...change } : row)); }
  function validate() {
    const errors: Errors = {}; const seen = new Set<string>();
    if (!rows.length) errors.components = "حداقل یک ماده اولیه اضافه کنید.";
    for (const row of rows) {
      if (!row.ingredient) errors[`ingredient-${row.key}`] = "ماده اولیه را انتخاب کنید.";
      else if (seen.has(row.ingredient.id)) errors[`ingredient-${row.key}`] = "هر ماده فقط یک‌بار در دستور تهیه وارد شود.";
      if (row.ingredient) seen.add(row.ingredient.id);
      const error = inventoryQuantityError(row.quantity, row.unit);
      if (error) errors[`quantity-${row.key}`] = error;
    }
    return errors;
  }
  return <form className="inventory-form panel" noValidate onSubmit={(event) => void state.submit(event, validate, async () => {
    await inventoryApi.saveRecipe(cafeId, itemId, { expected_updated_at: recipe?.updated_at ?? null, components: rows.map((row) => ({ ingredient: row.ingredient!.id, ...storedQuantity(row.quantity, row.unit) })) });
    setBaseline(JSON.stringify(rows)); onSaved();
  })}>
    <h4>مواد مصرفی یک واحد فروش</h4><p className="inventory-help">مقدار مصرف واقعی، شامل پرت معمول تهیه، را وارد کنید. مصرف انبار هنگام تسویه ثبت می‌شود.</p>
    <fieldset disabled={state.busy}><div className="recipe-rows">{rows.map((row, index) => <div key={row.key} className="recipe-row"><div className="recipe-row__heading"><strong>ماده {formatDecimal(index + 1)}</strong><ActionButton intent="text" onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}><ActionIcon kind="delete" label={`حذف ماده ${formatDecimal(index + 1)}`} /></ActionButton></div>
      <IngredientSelect catalog={catalog} selected={row.ingredient} name={`ingredient-${row.key}`} label={`ماده اولیه ${formatDecimal(index + 1)}`} error={state.errors[`ingredient-${row.key}`]} onSelect={(ingredient) => update(row.key, { ingredient, quantity: row.ingredient?.id === ingredient?.id ? row.quantity : "", unit: ingredient?.base_unit ?? "g" })} />
      <div className="inventory-two-fields"><TextField label={`مقدار مصرف ${formatDecimal(index + 1)}`} name={`quantity-${row.key}`} inputMode="decimal" value={row.quantity} onChange={(event) => update(row.key, { quantity: event.target.value })} error={state.errors[`quantity-${row.key}`]} required /><SelectField label={`واحد مصرف ${formatDecimal(index + 1)}`} value={row.unit} onChange={(event) => update(row.key, { unit: event.target.value as Unit, quantity: convertQuantity(row.quantity, row.unit, event.target.value as Unit) })}>{(row.ingredient?.base_unit === "ml" ? ["ml", "l"] : row.ingredient?.base_unit === "piece" ? ["piece"] : ["g", "kg"]).map((unit) => <option key={unit} value={unit}>{unitLabels[unit as Unit]}</option>)}</SelectField></div>
    </div>)}</div><ActionButton intent="secondary" disabled={rows.length >= 100} onClick={() => setRows((current) => [...current, emptyRow()])}>افزودن</ActionButton></fieldset>
    <CatalogStatus catalog={catalog} />
    {state.errors.components && <Notice tone="error">{state.errors.components}</Notice>}
    {state.error && <Notice tone="error">{state.error}</Notice>}
    <div className="ui-actions"><ActionButton type="submit" busy={state.busy} disabled={catalog.status !== "ready"}>ذخیره دستور تهیه</ActionButton><ActionButton intent="secondary" disabled={state.busy} onClick={() => run(onReload)}>دریافت نسخه ثبت‌شده</ActionButton></div>
  </form>;
}

function RecipeEditor({ cafeId, branchId, item }: { cafeId: string; branchId: string; item: MenuItem }) {
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [notice, setNotice] = useState(""); const heading = useRef<HTMLHeadingElement>(null);
  const loader = useCallback(async (signal: AbortSignal) => {
    try { return await inventoryApi.recipe(cafeId, item.id, signal); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  }, [cafeId, item.id]);
  const resource = useResource(`${cafeId}:recipe:${item.id}`, loader);
  const hasRecipe = !!resource.data;
  const costLoader = useCallback((signal: AbortSignal) => hasRecipe ? inventoryApi.recipeCost(branchId, item.id, signal) : Promise.resolve(null), [hasRecipe, branchId, item.id]);
  const cost = useResource(`${branchId}:cost:${item.id}:${hasRecipe}`, costLoader);
  return <><h3 className="inventory-section-title" ref={heading} tabIndex={-1} data-navigation-focus>دستور تهیه {item.name}</h3>{notice && <Notice>{notice}</Notice>}
    <ResourceState {...resource} retry={resource.reload}>
      {!hasRecipe && <Notice tone="info">دستور تهیه این آیتم هنوز تعریف نشده است؛ بهای مواد فروش آن فعلاً نامشخص است.</Notice>}
      <div className="inventory-split"><div><ActionButton onClick={() => { resource.reload(); setEditingRecipe(true); }}>{hasRecipe ? "ویرایش دستور تهیه" : "افزودن"}</ActionButton><Modal title="دستور تهیه" open={editingRecipe && resource.status === "ready"} onClose={() => setEditingRecipe(false)}><RecipeForm cafeId={cafeId} itemId={item.id} recipe={resource.data ?? null} onReload={resource.reload} onSaved={() => { setEditingRecipe(false); setNotice("دستور تهیه ذخیره شد."); resource.reload(); cost.reload(); heading.current?.focus(); }} /></Modal></div>
        <aside className="panel recipe-cost-panel"><h4>برآورد تهیه در این شعبه</h4><p className="inventory-help">بر اساس هزینه میانگین موجودی فعلی؛ هزینه فروش‌های قبلی تغییر نمی‌کند.</p>
          <ResourceState {...cost} retry={cost.reload} empty={!hasRecipe} emptyTitle="ابتدا دستور تهیه را ذخیره کنید">
            {cost.data && <><dl className="inventory-readout"><div><dt>قیمت فروش</dt><dd>{money(cost.data.selling_price)}</dd></div><div className="inventory-readout__emphasis"><dt>بهای مواد یک واحد</dt><dd>{cost.data.estimated_cost === null ? "قابل محاسبه نیست" : money(cost.data.estimated_cost)}</dd></div></dl>
              <p className={`inventory-badge ${cost.data.can_prepare ? "inventory-badge--success" : "inventory-badge--warning"}`}>{cost.data.can_prepare ? "مواد یک واحد موجود است" : "مواد یک واحد کامل نیست"}</p>
              <ul className="recipe-cost-list">{cost.data.components.map((component) => <li key={component.ingredient}><strong>{component.name}</strong><span>مصرف {formatDecimal(component.quantity)} {unitLabels[component.unit]} · موجودی {formatDecimal(displayQuantity(component.available_quantity, component.unit))} {unitLabels[inventoryUnit(component.unit)]}</span>{component.is_short && <span className="recipe-shortage">کمبود موجودی</span>}</li>)}</ul>
            </>}
          </ResourceState>
        </aside>
      </div>
    </ResourceState>
  </>;
}

export function RecipesPanel({ cafeId, branchId, items }: { cafeId: string; branchId: string; items: MenuItem[] }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? ""); const { run } = useNavigationGuard();
  const item = items.find((value) => value.id === itemId);
  if (!items.length) return <div className="panel ui-data-state"><h3>منو هنوز آیتمی ندارد</h3><p>ابتدا در مدیریت منو یک آیتم تعریف کنید، سپس دستور تهیه آن را اینجا ثبت کنید.</p></div>;
  return <div className="inventory-recipes"><div className="panel inventory-recipe-selector"><SelectField label="آیتم منو" value={itemId} onChange={(event) => run(() => setItemId(event.target.value))}>{items.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</SelectField></div>
    {item && <RecipeEditor key={item.id} cafeId={cafeId} branchId={branchId} item={item} />}
  </div>;
}
