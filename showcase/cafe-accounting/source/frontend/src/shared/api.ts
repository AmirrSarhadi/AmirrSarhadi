export type Membership = { role: "owner" | "manager" | "cashier"; role_label: string; selected_branch?: string | null };
export type Cafe = { id: string; name: string; membership: Membership };
export type Branch = { id: string; name: string; timezone: string };
export type DiningTable = { id: string; label: string; capacity: number; sort_order: number };
export type Customer = { id: string; first_name: string; last_name: string; full_name: string; phone: string; notes: string };
export type OrderItem = { id: string; menu_item_id?: string; item_name: string; unit_price: number; quantity: number; line_total: number };
export type Payment = { id: string; method: "cash" | "card" | "card_to_card"; method_label: string; amount: number; reference: string; created_at: string };
export type PaymentInput = { method: "cash" | "card" | "card_to_card"; amount: number; reference?: string };
export type OrderingCustomer = { last_name: string; phone: string };
export type OpenOrder = { id: string; order_type: "dine_in" | "takeaway"; order_type_label: string; table: string | null; table_label: string; customer: string | null; customer_name: string | null; customer_last_name?: string; customer_phone?: string; status: "open" | "settled" | "cancelled"; items: OrderItem[]; payments: Payment[]; total: number; receipt_number: string; closed_at: string | null; cancellation_reason: string };
export type DailySalesReport = { date: string; timezone: string; summary: { sales_total: number; invoice_count: number; average_invoice: number; cancelled_count: number; payments: { cash: number; card: number; card_to_card?: number } }; receipts: OpenOrder[] };
export type SalesRangeReport = { start_date: string; end_date: string; timezone: string; summary: { sales_total: number; invoice_count: number }; top_items: { item_name: string; quantity_sold: number; sales_total: number }[] };
export type ReceiptArchive = { count: number; results: OpenOrder[] };
export type CashShift = { id: string; status: "open" | "closed"; opening_cash: number; closing_cash: number | null; cash_sales: number | null; expected_cash: number | null; variance: number | null; opened_by_name: string; closed_by_name?: string; opened_at: string; closed_at: string | null };
export type ExpenseCategory = "supplies" | "salary" | "rent" | "utilities" | "maintenance" | "other";
export type Expense = { id: string; category: ExpenseCategory; category_label: string; amount: number; description: string; expense_date: string; recorded_by_name: string; created_at: string; updated_at: string };
export type ExpenseInput = { category: ExpenseCategory; amount: number; description: string; expense_date: string };
export type ExpenseReport = { start_date: string; end_date: string; summary: { expense_total: number; expense_count: number }; by_category: { category: ExpenseCategory; category_label: string; total: number }[] };
export type CashShiftHistoryReport = {
  start_date: string; end_date: string; timezone: string;
  summary: { shift_count: number; cash_sales: number; net_variance: number; absolute_variance: number };
  shifts: CashShift[];
};
export type CheckoutInput = { customer_details?: OrderingCustomer; request_id: string; table: string | null; items: { menu_item: string; quantity: number; unit_price: number }[] };
export type MenuCategory = { id: string; name: string; description: string; sort_order?: number; item_count: number };
export type MenuItem = {
  id: string; category: string; category_name: string; name: string;
  description: string; price: number; is_available: boolean; image_url?: string | null;
};

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };
let csrfToken = "";

function itemBody(data: { image?: File; [key: string]: unknown }) {
  if (!data.image) return data;
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => { if (value !== undefined) body.append(key, value instanceof File ? value : String(value)); });
  return body;
}

export class ApiError extends Error {
  constructor(public status: number, public details: unknown = null) {
    super(status === 401 || status === 403 ? "UNAUTHORIZED" : "REQUEST_FAILED");
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "include",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}), ...options.headers },
    body: options.body instanceof FormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const details: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, details);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function ensureCsrf() {
  if (csrfToken) return;
  const result = await request<{ csrfToken: string }>("/auth/csrf/");
  csrfToken = result.csrfToken;
}

export const api = {
  async login(email: string, password: string) {
    await ensureCsrf();
    const result = await request<{ csrfToken: string }>("/auth/login/", { method: "POST", body: { email, password } });
    csrfToken = result.csrfToken;
  },
  currentUser: () => request<{ id: string }>("/auth/me/"),
  async checkout(branchId: string, data: CheckoutInput) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/checkout/`, { method: "POST", body: data });
  },
  cafes: () => request<Cafe[]>("/organizations/cafes/"),
  async saveBranch(cafeId: string, branchId: string) {
    await ensureCsrf();
    return request<{ selected_branch: string }>(`/organizations/cafes/${cafeId}/settings/`, { method: "PATCH", body: { selected_branch: branchId } });
  },
  branches: (cafeId: string) => request<Branch[]>(`/organizations/cafes/${cafeId}/branches/`),
  tables: (branchId: string) => request<DiningTable[]>(`/floor/branches/${branchId}/tables/`),
  categories: (cafeId: string) => request<MenuCategory[]>(`/menu/cafes/${cafeId}/categories/`),
  items: (cafeId: string) => request<MenuItem[]>(`/menu/cafes/${cafeId}/items/`),
  async createCategory(cafeId: string, name: string) {
    await ensureCsrf();
    return request<MenuCategory>(`/menu/cafes/${cafeId}/categories/`, { method: "POST", body: { name } });
  },
  async updateCategory(cafeId: string, categoryId: string, data: { name: string; description: string; sort_order: number }) {
    await ensureCsrf();
    return request<MenuCategory>(`/menu/cafes/${cafeId}/categories/${categoryId}/`, { method: "PATCH", body: data });
  },
  async deleteCategory(cafeId: string, categoryId: string) {
    await ensureCsrf();
    return request<void>(`/menu/cafes/${cafeId}/categories/${categoryId}/`, { method: "DELETE" });
  },
  async createItem(cafeId: string, data: { category: string; name: string; price: number; is_available?: boolean; image?: File }) {
    await ensureCsrf();
    return request<MenuItem>(`/menu/cafes/${cafeId}/items/`, { method: "POST", body: itemBody(data) });
  },
  async deleteItem(cafeId: string, itemId: string) {
    await ensureCsrf();
    return request<void>(`/menu/cafes/${cafeId}/items/${itemId}/`, { method: "DELETE" });
  },
  async updateItem(cafeId: string, itemId: string, data: { category: string; name: string; price: number; is_available: boolean; image?: File }) {
    await ensureCsrf();
    return request<MenuItem>(`/menu/cafes/${cafeId}/items/${itemId}/`, { method: "PATCH", body: itemBody(data) });
  },
  async createTable(branchId: string, data: { label: string; capacity: number }) {
    await ensureCsrf();
    return request<DiningTable>(`/floor/branches/${branchId}/tables/`, {
      method: "POST",
      body: data,
    });
  },
  async updateTable(branchId: string, tableId: string, data: { label: string; capacity: number; sort_order: number }) {
    await ensureCsrf();
    return request<DiningTable>(`/floor/branches/${branchId}/tables/${tableId}/`, { method: "PATCH", body: data });
  },
  async deleteTable(branchId: string, tableId: string) {
    await ensureCsrf();
    return request<void>(`/floor/branches/${branchId}/tables/${tableId}/`, { method: "DELETE" });
  },
  customerDirectory: (branchId: string, search = "", page = 1) =>
    request<{ count: number; results: Customer[] }>(`/orders/branches/${branchId}/customers/?${new URLSearchParams({ search, page: String(page) })}`),
  async lookupCustomer(branchId: string, phone: string, signal?: AbortSignal) {
    await ensureCsrf();
    return request<{ customer: Customer | null }>(`/orders/branches/${branchId}/customers/lookup/`, { method: "POST", body: { phone }, signal });
  },
  customers: (branchId: string, search = "") =>
    request<Customer[]>(`/orders/branches/${branchId}/customers/?search=${encodeURIComponent(search)}`),
  openOrders: (branchId: string) => request<OpenOrder[]>(`/orders/branches/${branchId}/orders/`),
  receipts: (branchId: string, search = "", date = "") => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (date) query.set("date", date);
    return request<ReceiptArchive>(`/orders/branches/${branchId}/receipts/?${query.toString()}`);
  },
  async createCustomer(branchId: string, data: { first_name: string; last_name: string; phone: string }) {
    await ensureCsrf();
    return request<Customer>(`/orders/branches/${branchId}/customers/`, { method: "POST", body: data });
  },
  async updateCustomer(branchId: string, customerId: string, data: { first_name: string; last_name: string; phone: string; notes: string }) {
    await ensureCsrf();
    return request<Customer>(`/orders/branches/${branchId}/customers/${customerId}/`, { method: "PATCH", body: data });
  },
  async deleteCustomer(branchId: string, customerId: string) {
    await ensureCsrf();
    return request<void>(`/orders/branches/${branchId}/customers/${customerId}/`, { method: "DELETE" });
  },
  async createOrder(branchId: string, data: { order_type: "dine_in" | "takeaway"; table?: string; customer?: string }) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/orders/`, { method: "POST", body: data });
  },
  async addOrderItems(branchId: string, orderId: string, data: Omit<CheckoutInput, "table">) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/orders/${orderId}/additions/`, { method: "POST", body: data });
  },
  async addOrderItem(branchId: string, orderId: string, data: { menu_item: string; quantity: number }) {
    await ensureCsrf();
    return request<OrderItem>(`/orders/branches/${branchId}/orders/${orderId}/items/`, { method: "POST", body: data });
  },
  async updateOrderItem(branchId: string, orderId: string, itemId: string, quantity: number) {
    await ensureCsrf();
    return request<OrderItem>(`/orders/branches/${branchId}/orders/${orderId}/items/${itemId}/`, { method: "PATCH", body: { quantity } });
  },
  async deleteOrderItem(branchId: string, orderId: string, itemId: string) {
    await ensureCsrf();
    return request<void>(`/orders/branches/${branchId}/orders/${orderId}/items/${itemId}/`, { method: "DELETE" });
  },
  async transferOrder(branchId: string, orderId: string, tableId: string) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/orders/${orderId}/transfer/`, {
      method: "POST",
      body: { table: tableId },
    });
  },
  async settleOrder(branchId: string, orderId: string, payments: PaymentInput[], customerDetails?: OrderingCustomer) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/orders/${orderId}/settle/`, { method: "POST", body: { payments, ...(customerDetails ? { customer_details: customerDetails } : {}) } });
  },
  async cancelOrder(branchId: string, orderId: string, reason: string) {
    await ensureCsrf();
    return request<OpenOrder>(`/orders/branches/${branchId}/orders/${orderId}/cancel/`, { method: "POST", body: { reason } });
  },
  dailySalesReport: (branchId: string, date: string) =>
    request<DailySalesReport>(`/orders/branches/${branchId}/reports/daily/?date=${encodeURIComponent(date)}`),
  salesRangeReport: (branchId: string, startDate: string, endDate: string) =>
    request<SalesRangeReport>(`/orders/branches/${branchId}/reports/range/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`),
  async salesRangeCsv(branchId: string, startDate: string, endDate: string) {
    const query = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&output=csv`;
    const response = await fetch(`/api/v1/orders/branches/${branchId}/reports/range/?${query}`, { credentials: "include" });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "UNAUTHORIZED" : "REQUEST_FAILED");
    return response.blob();
  },
  currentCashShift: (branchId: string) => request<{ shift: CashShift | null }>(`/cash-register/branches/${branchId}/shifts/current/`),
  cashShiftHistory: (branchId: string, startDate: string, endDate: string) =>
    request<CashShiftHistoryReport>(`/cash-register/branches/${branchId}/shifts/history/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`),
  async openCashShift(branchId: string, openingCash: number) {
    await ensureCsrf();
    return request<CashShift>(`/cash-register/branches/${branchId}/shifts/open/`, { method: "POST", body: { opening_cash: openingCash } });
  },
  async closeCashShift(branchId: string, closingCash: number) {
    await ensureCsrf();
    return request<CashShift>(`/cash-register/branches/${branchId}/shifts/close/`, { method: "POST", body: { closing_cash: closingCash } });
  },
  expenses: (branchId: string) => request<Expense[]>(`/expenses/branches/${branchId}/`),
  expenseReport: (branchId: string, startDate: string, endDate: string) => request<ExpenseReport>(`/expenses/branches/${branchId}/report/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`),
  async createExpense(branchId: string, data: ExpenseInput) {
    await ensureCsrf();
    return request<Expense>(`/expenses/branches/${branchId}/`, { method: "POST", body: data });
  },
  async updateExpense(branchId: string, expenseId: string, data: Partial<ExpenseInput>) {
    await ensureCsrf();
    return request<Expense>(`/expenses/branches/${branchId}/${expenseId}/`, { method: "PATCH", body: data });
  },
  async deleteExpense(branchId: string, expenseId: string) {
    await ensureCsrf();
    return request<void>(`/expenses/branches/${branchId}/${expenseId}/`, { method: "DELETE" });
  },
};
