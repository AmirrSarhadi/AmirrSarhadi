import { useCallback, useEffect, useState } from "react";
import { api, Branch, MenuItem } from "../shared/api";
import { Ingredient, MovementKind, inventoryApi } from "../shared/inventoryApi";
import { ResourceState } from "../shared/ui/controls";
import { useNavigationGuard } from "../shared/ui/navigation";
import { useResource } from "../shared/ui/useResource";
import { CostReportPanel } from "./CostReportPanel";
import { IngredientsPanel } from "./IngredientsPanel";
import { MovementsPanel } from "./MovementsPanel";
import { RecipesPanel } from "./RecipesPanel";
import { Modal } from "../shared/ui/Modal";
import { MovementForm } from "./MovementForm";
import { movementTitles } from "./movementConfig";
import { pendingKey, readPending } from "./pendingMovement";
import { StockPanel } from "./StockPanel";

const tabs = { stock: "موجودی", ingredients: "مواد اولیه", movements: "تاریخچه انبار", recipes: "دستور تهیه", report: "بهای تمام‌شده" };
type Tab = keyof typeof tabs;

export function InventoryWorkspace({ branch: activeBranch, cafeId, items }: { branch?: Branch; cafeId: string; items: MenuItem[] }) {
  const [operation, setOperation] = useState<{ kind: MovementKind; ingredient?: Ingredient } | null>(null);
  const [revision, setRevision] = useState(0);
  const [defineRequested, setDefineRequested] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("stock");
  const loader = useCallback(async (signal: AbortSignal) => {
    const [branches, identity] = await Promise.all([activeBranch ? Promise.resolve([activeBranch]) : api.branches(cafeId), inventoryApi.identity(signal)]);
    return { branches, identity };
  }, [activeBranch, cafeId]);
  const resource = useResource(`${cafeId}:inventory`, loader);
  const branches = resource.data?.branches ?? [];
  const branchId = branches[0]?.id ?? "";
  const { run } = useNavigationGuard();
  const recovery = resource.data && readPending(pendingKey(resource.data.identity.id, cafeId, branchId));
  const currentOperation = operation ?? (recovery ? { kind: recovery.payload.kind } : null);
  function create(kind: MovementKind, ingredient?: Ingredient) { run(() => setOperation({ kind, ingredient })); }
  useEffect(() => { document.title = `${tabs[tab]} | انبار کافه`; }, [tab]);
  return <section className="inventory-workspace" aria-labelledby="inventory-title"><header className="panel inventory-header section-heading"><div><h2 id="inventory-title" tabIndex={-1} data-navigation-focus>انبار کافه</h2></div></header>
    <ResourceState {...resource} retry={resource.reload} empty={!branches.length} emptyTitle="شعبه‌ای برای انبار وجود ندارد">
      <nav className="inventory-nav" aria-label="بخش‌های انبار">{Object.entries(tabs).map(([key, label]) => <button key={key} type="button" className={tab === key ? "inventory-nav__item inventory-nav__item--active" : "inventory-nav__item"} aria-current={tab === key ? "page" : undefined} onClick={() => run(() => { setDefineRequested(false); setNotice(""); setTab(key as Tab); })}>{label}</button>)}</nav>
      {notice && <p className="ui-notice ui-notice--success" role="status">{notice}</p>}
      <div key={`${cafeId}:${branchId}:${tab}:${revision}`} className="inventory-content">
        {tab === "stock" && <StockPanel branchId={branchId} onCreate={create} onDefine={() => { setDefineRequested(true); setTab("ingredients"); }} />}
        {tab === "ingredients" && <IngredientsPanel cafeId={cafeId} initialCreate={defineRequested} />}
        {tab === "movements" && <MovementsPanel branchId={branchId} onCreate={create} />}
        {tab === "recipes" && <RecipesPanel cafeId={cafeId} branchId={branchId} items={items} />}
        {tab === "report" && <CostReportPanel branchId={branchId} />}
      </div>
      {currentOperation && <Modal title={movementTitles[currentOperation.kind]} open onClose={() => setOperation(null)}><MovementForm cafeId={cafeId} branchId={branchId} branchName={branches[0].name} userId={resource.data!.identity.id} initialKind={currentOperation.kind} initialIngredient={operation?.ingredient} onSaved={() => { setOperation(null); setNotice("گردش مواد ثبت شد."); setRevision((value) => value + 1); }} /></Modal>}
    </ResourceState>
  </section>;
}
