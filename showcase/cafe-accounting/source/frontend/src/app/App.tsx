import { AvailabilityLabel } from "../shared/ui/AvailabilityLabel";
import { OrderEntry } from "./OrderEntry";
import { CreateDialog } from "../shared/ui/CreateDialog";
import { MenuPhotoField } from "../shared/ui/MenuPhotoField";
import { AppNavigation, Section } from "./AppNavigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { api, Branch, Cafe, MenuCategory, MenuItem } from "../shared/api";
import { TableManagement } from "./TableManagement";
import { OpenOrders } from "./OpenOrders";
import { DailySalesReport } from "./DailySalesReport";
import { SalesRangeReport } from "./SalesRangeReport";
import { CashShiftManager } from "./CashShiftManager";
import { MenuItemEditor } from "./MenuItemEditor";
import { MenuCategoryManager } from "./MenuCategoryManager";
import { CustomerDirectory } from "./CustomerDirectory";
import { ReceiptArchive } from "./ReceiptArchive";
import { ExpenseManager } from "./ExpenseManager";
import { InventoryWorkspace } from "../inventory/InventoryWorkspace";
import { NavigationGuardProvider } from "../shared/ui/NavigationGuard";
import { useNavigationGuard } from "../shared/ui/navigation";

import { HelpGuide } from "./HelpGuide";
import { Settings } from "./Settings";

type ViewState = "loading" | "login" | "ready" | "error";
const formatPrice = (price: number) => `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;

export function App() {
  return <NavigationGuardProvider><CafeApp /></NavigationGuardProvider>;
}

function CafeApp() {
  const { run } = useNavigationGuard();
  const [view, setView] = useState<ViewState>("loading");
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [cafeId, setCafeId] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const activeCategory = categories.some((category) => category.id === selectedCategory) ? selectedCategory : "all";
  const visibleItems = activeCategory === "all" ? items : items.filter((item) => item.category === activeCategory);
  function filterCategory(id: string) { run(() => setSelectedCategory(id)); }
  const [notice, setNotice] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("menu");
  const activeCafe = useMemo(() => cafes.find((cafe) => cafe.id === cafeId), [cafes, cafeId]);
  const activeBranch = branches.find((branch) => branch.id === branchId);
  const canManage = activeCafe?.membership.role === "owner" || activeCafe?.membership.role === "manager";

  useEffect(() => { document.title = activeSection === "help" ? "راهنمای برنامه | مدیریت کافه" : activeSection === "inventory" ? "انبار و بهای تمام‌شده | مدیریت کافه" : "مدیریت کافه"; }, [activeSection]);

  const loadMenu = useCallback(async (selectedCafeId: string) => {
    const [nextCategories, nextItems] = await Promise.all([api.categories(selectedCafeId), api.items(selectedCafeId)]);
    setCategories(nextCategories);
    setItems(nextItems);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const nextCafes = await api.cafes();
      setCafes(nextCafes);
      const selectedId = nextCafes[0]?.id ?? "";
      setCafeId(selectedId);
      if (selectedId) {
        const available = await api.branches(selectedId);
        setBranches(available);
        const saved = nextCafes[0].membership.selected_branch;
        setBranchId(saved ?? "");
        await loadMenu(selectedId);
      }
      setView("ready");
    } catch (error) {
      setView(error instanceof Error && error.message === "UNAUTHORIZED" ? "login" : "error");
    }
  }, [loadMenu]);

  useEffect(() => {
    // Initial data loading is the external synchronization owned by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setNotice("");
    try {
      await api.login(String(data.get("email")), String(data.get("password")));
      await bootstrap();
    } catch { setNotice("ایمیل یا رمز عبور نادرست است."); }
  }

  function selectSection(section: Section) {
    run(() => {
      setNotice("");
      setActiveSection(section);
      if (section === "menu") void loadMenu(cafeId).catch(() => setNotice("دریافت منو ممکن نشد؛ دوباره مدیریت منو را انتخاب کنید."));
      requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>("[data-section-content] h1, [data-section-content] h2");
        if (heading) { heading.tabIndex = -1; heading.setAttribute("data-navigation-focus", ""); heading.focus(); }
      });
    });
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("categoryName")).trim();
    if (!name) return;
    try {
      const category = await api.createCategory(cafeId, name);
      setCategories((current) => [...current, { ...category, item_count: 0 }]);
      form.reset(); setNotice("دسته‌بندی با موفقیت افزوده شد.");
    } catch { setNotice("ثبت دسته‌بندی انجام نشد. دوباره تلاش کنید."); }
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (itemSaving) return;
    setItemSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const item = await api.createItem(cafeId, { category: String(data.get("category")), name: String(data.get("itemName")).trim(), price: Number(data.get("price")), is_available: data.get("available") === "on", ...(data.get("image") instanceof File && (data.get("image") as File).size ? { image: data.get("image") as File } : {}) });
      setItems((current) => [...current, item]);
      setCategories((current) => current.map((category) => category.id === item.category ? { ...category, item_count: category.item_count + 1 } : category));
      form.reset(); setNotice("آیتم منو با موفقیت افزوده شد.");
    } catch { setNotice("ثبت آیتم انجام نشد. اطلاعات را بررسی کنید."); } finally { setItemSaving(false); }
  }

  async function updateMenuItem(itemId: string, data: { category: string; name: string; price: number; is_available: boolean; image?: File }) {
    const previous = items.find((item) => item.id === itemId);
    const updated = await api.updateItem(cafeId, itemId, data);
    if (previous && previous.category !== updated.category) setCategories((current) => current.map((category) => ({ ...category, item_count: Math.max(0, category.item_count + (category.id === updated.category ? 1 : 0) - (category.id === previous.category ? 1 : 0)) })));
    setItems((current) => current.map((item) => item.id === itemId ? updated : item));
    setNotice("آیتم منو به‌روزرسانی شد.");
  }

  async function deleteMenuItem(itemId: string) {
    const removed = items.find((item) => item.id === itemId);
    await api.deleteItem(cafeId, itemId);
    if (removed) setCategories((current) => current.map((category) => category.id === removed.category ? { ...category, item_count: Math.max(0, category.item_count - 1) } : category));
    setItems((current) => current.filter((item) => item.id !== itemId));
    setNotice("آیتم از منو حذف شد.");
  }

  async function updateMenuCategory(categoryId: string, data: { name: string; description: string; sort_order: number }) {
    const updated = await api.updateCategory(cafeId, categoryId, data);
    setCategories((current) => current.map((category) => category.id === categoryId ? updated : category));
    setItems((current) => current.map((item) => item.category === categoryId ? { ...item, category_name: updated.name } : item));
    setNotice("دسته‌بندی به‌روزرسانی شد.");
  }

  async function deleteMenuCategory(categoryId: string) {
    await api.deleteCategory(cafeId, categoryId);
    setCategories((current) => current.filter((category) => category.id !== categoryId));
    setItems((current) => current.filter((item) => item.category !== categoryId));
    setNotice("دسته‌بندی حذف شد.");
  }

  if (view === "loading") return <main className="center-state" aria-busy="true"><p>در حال آماده‌سازی منو…</p></main>;
  if (view === "login") return (
    <main className="center-state"><form className="auth-card" onSubmit={handleLogin} aria-labelledby="login-title">
      <span className="eyebrow">ورود امن</span><h1 id="login-title">حسابداری کافه</h1><p>برای مدیریت منوی کافه وارد حساب خود شوید.</p>
      <label htmlFor="email">ایمیل</label><input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">رمز عبور</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      {notice && <p className="alert alert--error" role="alert">{notice}</p>}<button className="button button--primary" type="submit">ورود به سامانه</button>
    </form></main>
  );
  if (view === "error") return <main className="center-state"><div className="alert alert--error" role="alert">دریافت اطلاعات ممکن نشد.<button className="button button--text" onClick={() => { setView("loading"); void bootstrap(); }}>تلاش دوباره</button></div></main>;

  return <main id="main-content" className="dashboard-shell">
    <header className="dashboard-header">
      <div className="cafe-identity"><strong title={activeCafe?.name ?? "مدیریت کافه"}><bdi>{activeCafe?.name ?? "مدیریت کافه"}</bdi></strong>{activeBranch && <span className="cafe-identity__branch" title={`شعبه ${activeBranch.name}`}><bdi>شعبه {activeBranch.name}</bdi></span>}</div></header>
    {!!cafes.length && <AppNavigation active={activeSection} canManage={canManage} cafeName={activeCafe?.name ?? ""} onSelect={selectSection} />}
    <div data-section-content>
      {(activeSection === "menu" || activeSection === "settings") && <h1 tabIndex={-1} data-navigation-focus>{activeSection === "menu" ? "منوی کافه" : "تنظیمات"}</h1>}
    {notice && <p className="alert alert--success" role="status">{notice}</p>}
    {!cafes.length ? <section className="empty-state"><h2>کافه‌ای برای شما ثبت نشده است</h2><p>از مدیر سامانه بخواهید دسترسی کافه را برای حساب شما فعال کند.</p></section> : activeSection === "help" ? <HelpGuide /> : activeSection === "settings" ? <Settings key={cafeId} branches={branches} selectedId={branchId} onSave={async (id) => {
      const saved = await api.saveBranch(cafeId, id); setBranchId(saved.selected_branch);
      setCafes((current) => current.map((cafe) => cafe.id === cafeId ? { ...cafe, membership: { ...cafe.membership, selected_branch: saved.selected_branch } } : cafe));
    }} /> : activeSection !== "menu" && !activeBranch ? <section className="panel empty-state"><h2>شعبه فعال را در تنظیمات انتخاب کنید</h2><button className="button button--primary" onClick={() => selectSection("settings")}>تنظیمات</button></section> : activeSection === "orderEntry" ? <OrderEntry branch={activeBranch} cafeId={cafeId} /> : activeSection === "inventory" && canManage ? <InventoryWorkspace branch={activeBranch} key={cafeId} cafeId={cafeId} items={items} /> : activeSection === "cashShift" ? <CashShiftManager branch={activeBranch} cafeId={cafeId} canManage={canManage} /> : activeSection === "expenses" && canManage ? <ExpenseManager branch={activeBranch} cafeId={cafeId} /> : activeSection === "receipts" ? <ReceiptArchive branch={activeBranch} cafeId={cafeId} /> : activeSection === "customers" ? <CustomerDirectory branch={activeBranch} cafeId={cafeId} canManage={canManage} /> : activeSection === "rangeReports" && canManage ? <SalesRangeReport branch={activeBranch} cafeId={cafeId} /> : activeSection === "reports" && canManage ? <DailySalesReport branch={activeBranch} cafeId={cafeId} /> : activeSection === "orders" ? <OpenOrders branch={activeBranch} cafeId={cafeId} canManage={canManage} onNewOrder={() => selectSection("orderEntry")} /> : activeSection === "tables" ? <TableManagement branch={activeBranch} cafeId={cafeId} canManage={canManage} /> : <div className="dashboard-grid">
      <aside className="panel category-panel" aria-labelledby="categories-title"><div className="panel__heading"><div><h2 id="categories-title">دسته‌بندی‌ها</h2><span>{categories.length} دسته</span></div></div>
        <ul className="category-list"><li className="category-filter-row"><button type="button" className="category-select" aria-pressed={activeCategory === "all"} onClick={() => filterCategory("all")}><span>همه آیتم‌ها</span>{" "}<small>{new Intl.NumberFormat("fa-IR").format(items.length)} آیتم</small></button></li>{categories.map((category) => canManage ? <MenuCategoryManager key={category.id} category={category} selected={activeCategory === category.id} onSelect={() => filterCategory(category.id)} onSave={(data) => updateMenuCategory(category.id, data)} onDelete={() => deleteMenuCategory(category.id)}/> : <li className="category-filter-row" key={category.id}><button type="button" className="category-select" aria-pressed={activeCategory === category.id} onClick={() => filterCategory(category.id)}><span>{category.name}</span>{" "}<small>{new Intl.NumberFormat("fa-IR").format(category.item_count)} آیتم</small></button></li>)}</ul>
        {!categories.length && <p className="empty-copy">هنوز دسته‌بندی‌ای ثبت نشده است.</p>}
        {canManage && <CreateDialog prepare={() => loadMenu(cafeId)} title="افزودن دسته‌بندی" trigger="افزودن" successKey={categories.length} notice={notice}><form className="inline-form" onSubmit={handleCategorySubmit}><label htmlFor="categoryName">دسته‌بندی جدید</label><div><input id="categoryName" name="categoryName" maxLength={100} required placeholder="مثلاً نوشیدنی گرم"/><button className="button button--primary" type="submit">افزودن</button></div></form></CreateDialog>}
      </aside>
      <section className="panel menu-panel" aria-labelledby="items-title"><div className="panel__heading"><div><h2 id="items-title">آیتم‌های منو</h2><div className="menu-panel__meta"><span>{new Intl.NumberFormat("fa-IR").format(visibleItems.length)} آیتم</span>{activeCafe && <span className="role-badge">{activeCafe.membership.role_label}</span>}</div></div></div>
        {visibleItems.length ? <div className="item-grid">{visibleItems.map((item) => canManage ? <MenuItemEditor prepare={() => loadMenu(cafeId)} key={item.id} item={item} categories={categories} onSave={(data) => updateMenuItem(item.id, data)} onDelete={() => deleteMenuItem(item.id)} /> : <article className="menu-item menu-item--managed menu-item--readonly" key={item.id}>{item.image_url && <img className="menu-item-photo" src={item.image_url} alt={item.name} loading="lazy" />}<div className="menu-item__heading"><div className="menu-item__identity"><span className="menu-item__category">{item.category_name}</span><h3>{item.name}</h3></div><AvailabilityLabel available={item.is_available} /></div><div className="menu-item__footer"><strong>{formatPrice(item.price)}</strong></div></article>)}</div> : <div className="empty-state"><h3>{activeCategory === "all" ? "منو هنوز خالی است" : "این دسته‌بندی آیتمی ندارد"}</h3>{activeCategory === "all" ? <p>ابتدا یک دسته‌بندی و سپس اولین آیتم منو را اضافه کنید.</p> : <button type="button" className="button button--secondary" onClick={() => filterCategory("all")}>نمایش همه آیتم‌ها</button>}</div>}
        {canManage && categories.length > 0 && <CreateDialog prepare={() => loadMenu(cafeId)} title="آیتم جدید" trigger="افزودن" successKey={items.length} notice={notice}><form className="item-form" onSubmit={handleItemSubmit}><fieldset className="item-form__fields" disabled={itemSaving}><h3>افزودن آیتم جدید</h3><MenuPhotoField key={items.length} /><label htmlFor="itemName">نام آیتم</label><input id="itemName" name="itemName" maxLength={120} required/><label htmlFor="category">دسته‌بندی</label><select id="category" name="category" defaultValue={activeCategory === "all" ? categories[0]?.id : activeCategory} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><label htmlFor="price">قیمت (تومان)</label><input id="price" name="price" type="number" min="1" step="1" required/><label className="confirm-check"><input type="checkbox" name="available" defaultChecked />قابل سفارش</label><button className="button button--primary" type="submit" aria-busy={itemSaving}>{itemSaving ? "در حال ثبت…" : "ثبت آیتم"}</button></fieldset></form></CreateDialog>}
      </section>
    </div>}
    </div>
  </main>;
}
