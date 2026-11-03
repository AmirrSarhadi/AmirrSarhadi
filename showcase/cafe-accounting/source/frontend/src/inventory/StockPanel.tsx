import { displayQuantity, displayUnitCost, inventoryUnit } from "../shared/inventoryUnits";
import { useCallback, useState } from "react";
import { Ingredient, MovementKind, inventoryApi } from "../shared/inventoryApi";
import { ActionButton, Pagination, ResourceState } from "../shared/ui/controls";
import { formatDecimal, money, unitLabels } from "../shared/ui/format";
import { useResource } from "../shared/ui/useResource";

export function StockPanel({ branchId, onCreate, onDefine }: { branchId: string; onCreate: (kind: MovementKind, ingredient?: Ingredient) => void; onDefine: () => void }) {
  const [page, setPage] = useState(1);
  const loader = useCallback((signal: AbortSignal) => inventoryApi.stock(branchId, page, signal), [branchId, page]);
  const resource = useResource(`${branchId}:stock:${page}`, loader);
  return <section className="panel inventory-table-panel"><div className="inventory-panel-heading"><div><h3>موجودی مواد اولیه</h3></div><div className="ui-actions"><ActionButton onClick={() => onCreate("receipt")}>ثبت خرید</ActionButton><ActionButton intent="secondary" onClick={() => onCreate("waste")}>ثبت ضایعات</ActionButton><ActionButton intent="secondary" onClick={() => onCreate("adjustment_in")}>اصلاح موجودی</ActionButton><ActionButton intent="text" onClick={onDefine}>تعریف ماده اولیه</ActionButton></div></div>

    <ResourceState {...resource} retry={resource.reload} empty={!resource.data?.count} emptyTitle="برای این شعبه هنوز ورود مواد ثبت نشده است">
      <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="جدول موجودی مواد اولیه"><table className="inventory-table inventory-stock-table"><caption className="sr-only">موجودی شعبه</caption><thead><tr><th scope="col">ماده اولیه</th><th scope="col">موجودی</th><th scope="col">میانگین قیمت واحد</th><th scope="col">ارزش موجودی</th><th scope="col">وضعیت</th><th scope="col">خرید</th></tr></thead><tbody>{resource.data?.results.map((stock) => <tr key={stock.id}><th scope="row">{stock.ingredient_name}</th><td data-label="موجودی">{formatDecimal(displayQuantity(stock.quantity, stock.unit))} {unitLabels[inventoryUnit(stock.unit)]}</td><td data-label="میانگین قیمت واحد">{money(displayUnitCost(stock.average_unit_cost, stock.unit))}<small>هر {unitLabels[inventoryUnit(stock.unit)]}</small></td><td data-label="ارزش موجودی">{money(stock.value)}</td><td data-label="وضعیت"><span className={`inventory-badge ${stock.is_low_stock ? "inventory-badge--warning" : "inventory-badge--success"}`}>{stock.is_low_stock ? "نیاز به تامین" : "بالاتر از حد هشدار"}</span></td><td className="inventory-stock-table__action"><ActionButton intent="text" aria-label={`ثبت خرید ${stock.ingredient_name}`} onClick={() => onCreate("receipt", { id: stock.ingredient, name: stock.ingredient_name, base_unit: stock.unit, reorder_level: stock.reorder_level })}>خرید</ActionButton></td></tr>)}</tbody></table></div>
    </ResourceState>
    <Pagination count={resource.data?.count ?? 0} page={page} busy={resource.status === "loading"} onPage={setPage} />
  </section>;
}
