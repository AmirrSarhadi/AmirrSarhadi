import { DiningTable, OpenOrder } from "../shared/api";

export function TableStatusGrid({ tables, orders, selectedTableId, onSelectTable, onViewOrder }: {
  tables: DiningTable[];
  orders: OpenOrder[];
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
  onViewOrder: (order: OpenOrder) => void;
}) {
  const openOrderByTable = new Map(
    orders.filter((order) => order.table).map((order) => [order.table, order]),
  );

  return <section className="table-status" aria-labelledby="table-status-title">
    <div className="table-status__heading">
      <div><h3 id="table-status-title">وضعیت میزها</h3><p>برای انتخاب یا مشاهده سفارش روی میز بزنید.</p></div>
      <div className="table-status__legend" aria-label="راهنمای وضعیت میزها"><span><i className="status-dot status-dot--free"/>آزاد</span><span><i className="status-dot status-dot--busy"/>در حال سرویس</span></div>
    </div>
    <div className="table-status__grid">
      {tables.map((table) => {
        const order = openOrderByTable.get(table.id);
        const isSelected = !order && selectedTableId === table.id;
        return <button
          key={table.id}
          type="button"
          className={`table-status-card ${order ? "table-status-card--busy" : "table-status-card--free"}${isSelected ? " table-status-card--selected" : ""}`}
          aria-pressed={isSelected}
          onClick={() => order ? onViewOrder(order) : onSelectTable(table.id)}
        >
          <strong>{table.label}</strong>
          <span>{order ? "در حال سرویس" : isSelected ? "انتخاب‌شده" : "آزاد"}</span>
          <small>{order ? `${order.customer_name || "مهمان"} · مشاهده سفارش` : `ظرفیت ${new Intl.NumberFormat("fa-IR").format(table.capacity)} نفر`}</small>
        </button>;
      })}
    </div>
  </section>;
}
