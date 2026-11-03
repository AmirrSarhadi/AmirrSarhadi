import { useCallback, useState } from "react";
import { MovementKind, inventoryApi } from "../shared/inventoryApi";
import { displayQuantity, inventoryUnit } from "../shared/inventoryUnits";
import { ActionButton, Pagination, ResourceState } from "../shared/ui/controls";
import { dateTime, formatDecimal, money, unitLabels } from "../shared/ui/format";
import { useResource } from "../shared/ui/useResource";

const movementLabels = { receipt: "خرید", waste: "ضایعات", adjustment_in: "افزایش موجودی", adjustment_out: "کاهش موجودی", sale: "مصرف فروش" };

export function MovementsPanel({ branchId, onCreate }: { branchId: string; onCreate: (kind: MovementKind) => void }) {
  const [page, setPage] = useState(1);
  const loader = useCallback((signal: AbortSignal) => inventoryApi.movements(branchId, page, signal), [branchId, page]);
  const resource = useResource(`${branchId}:movements:${page}`, loader);
  return <div className="inventory-single"><div className="ui-actions"><ActionButton onClick={() => onCreate("receipt")}>ثبت خرید</ActionButton><ActionButton intent="secondary" onClick={() => onCreate("waste")}>ثبت ضایعات</ActionButton><ActionButton intent="secondary" onClick={() => onCreate("adjustment_in")}>اصلاح موجودی</ActionButton></div>
    <section className="panel inventory-table-panel"><div className="inventory-panel-heading"><div><h3>تاریخچه گردش مواد</h3></div></div>
      <ResourceState {...resource} retry={resource.reload} empty={!resource.data?.count} emptyTitle="گردشی برای این شعبه ثبت نشده است">
        <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="جدول گردش مواد"><table className="inventory-table"><caption className="sr-only">تاریخچه گردش مواد شعبه</caption><thead><tr><th scope="col">ماده و عملیات</th><th scope="col">تغییر مقدار</th><th scope="col">تغییر ارزش</th><th scope="col">موجودی پس از ثبت</th><th scope="col">زمان و ثبت‌کننده</th></tr></thead><tbody>{resource.data?.results.map((movement) => <tr key={movement.id}><th scope="row">{movement.ingredient_name}<small>{movementLabels[movement.kind]}</small><small>{movement.reason}</small></th><td>{formatDecimal(displayQuantity(movement.quantity_delta, movement.unit))} {unitLabels[inventoryUnit(movement.unit)]}</td><td>{money(movement.value_delta)}</td><td>{formatDecimal(displayQuantity(movement.quantity_after, movement.unit))} {unitLabels[inventoryUnit(movement.unit)]}</td><td>{dateTime(movement.created_at)}<small>{movement.recorded_by_name}</small></td></tr>)}</tbody></table></div>
      </ResourceState><Pagination count={resource.data?.count ?? 0} page={page} busy={resource.status === "loading"} onPage={setPage} />
    </section>
  </div>;
}
