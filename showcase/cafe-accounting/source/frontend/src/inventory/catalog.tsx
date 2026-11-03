import { inventoryUnit } from "../shared/inventoryUnits";
import { Ingredient } from "../shared/inventoryApi";
import { ActionButton, SelectField } from "../shared/ui/controls";
import { formatDecimal, unitLabels } from "../shared/ui/format";
import { Catalog } from "./useIngredientCatalog";

export function CatalogStatus({ catalog }: { catalog: Catalog }) {
  return <div className="inventory-catalog-status">
    <span>{catalog.status === "loading" ? "در حال دریافت مواد اولیه…" : `${formatDecimal(catalog.options.length)} ماده قابل انتخاب`}</span>
    {catalog.status === "error" && <ActionButton intent="secondary" onClick={catalog.reload}>دریافت دوباره مواد</ActionButton>}
    {catalog.data?.next && <ActionButton intent="text" onClick={catalog.loadMore}>دریافت مواد بیشتر</ActionButton>}
  </div>;
}
export function IngredientSelect({ catalog, selected, onSelect, error, name = "ingredient", label = "ماده اولیه", disabled }: { catalog: Catalog; selected: Ingredient | null; onSelect: (ingredient: Ingredient | null) => void; error?: string; name?: string; label?: string; disabled?: boolean }) {
  const options = selected && !catalog.options.some((option) => option.id === selected.id) ? [selected, ...catalog.options] : catalog.options;
  return <SelectField label={label} name={name} error={error} disabled={disabled || catalog.status === "loading"} value={selected?.id ?? ""} onChange={(event) => onSelect(options.find((option) => option.id === event.target.value) ?? null)}>
    <option value="">ماده اولیه را انتخاب کنید</option>{options.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} · {unitLabels[inventoryUnit(ingredient.base_unit)]}</option>)}
  </SelectField>;
}
