import { ensureCsrf, request } from "./api";

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type BaseUnit = "g" | "ml" | "piece";
export type Unit = BaseUnit | "kg" | "l";
export type Ingredient = { id: string; name: string; base_unit: BaseUnit; reorder_level: string };
export type IngredientInput = Omit<Ingredient, "id">;
export type Stock = {
  id: string; ingredient: string; ingredient_name: string; unit: BaseUnit; quantity: string;
  value: string; average_unit_cost: string; reorder_level: string; is_low_stock: boolean;
};
export type MovementKind = "receipt" | "waste" | "adjustment_in" | "adjustment_out";
export type MovementInput = {
  ingredient: string; kind: MovementKind; quantity: string; unit: Unit;
  total_cost?: string; request_id: string; reason: string;
};
export type Movement = {
  id: string; ingredient: string; ingredient_name: string; kind: MovementKind | "sale";
  unit: BaseUnit; quantity_delta: string; value_delta: string; quantity_after: string;
  value_after: string; reason: string; recorded_by_name: string; created_at: string;
};
export type Recipe = {
  menu_item: string; updated_at: string;
  components: { ingredient: string; ingredient_name: string; quantity: string; unit: BaseUnit }[];
};
export type RecipeInput = {
  components: { ingredient: string; quantity: string; unit: Unit }[];
  expected_updated_at: string | null;
};
export type RecipeCost = {
  selling_price: number; estimated_cost: string | null; can_prepare: boolean;
  components: { ingredient: string; name: string; unit: BaseUnit; quantity: string;
    available_quantity: string; is_short: boolean; estimated_cost: string | null }[];
};
export type CostReport = {
  start_date: string; end_date: string; timezone: string;
  summary: { sales_total: number; costed_sales_total: number; cost_of_goods_sold: string;
    gross_profit_on_costed_sales: string; uncosted_line_count: number; invoice_count: number };
};

const cafePath = (id: string) => `/inventory/cafes/${id}`;
const branchPath = (id: string) => `/inventory/branches/${id}`;
export const inventoryApi = {
  identity: (signal?: AbortSignal) => request<{ id: string }>("/auth/me/", { signal }),
  ingredients: (cafe: string, page = 1, signal?: AbortSignal, size = 25) =>
    request<Page<Ingredient>>(`${cafePath(cafe)}/ingredients/?page=${page}&page_size=${size}`, { signal }),
  ingredient: (cafe: string, id: string) => request<Ingredient>(`${cafePath(cafe)}/ingredients/${id}/`),
  async createIngredient(cafe: string, data: IngredientInput) {
    await ensureCsrf();
    return request<Ingredient>(`${cafePath(cafe)}/ingredients/`, { method: "POST", body: data });
  },
  async updateIngredient(cafe: string, id: string, data: Pick<IngredientInput, "name" | "reorder_level">) {
    await ensureCsrf();
    return request<Ingredient>(`${cafePath(cafe)}/ingredients/${id}/`, { method: "PATCH", body: data });
  },
  stock: (branch: string, page = 1, signal?: AbortSignal) =>
    request<Page<Stock>>(`${branchPath(branch)}/stock/?page=${page}`, { signal }),
  movements: (branch: string, page = 1, signal?: AbortSignal) =>
    request<Page<Movement>>(`${branchPath(branch)}/movements/?page=${page}`, { signal }),
  async recordMovement(branch: string, data: MovementInput) {
    await ensureCsrf();
    return request<Movement>(`${branchPath(branch)}/movements/`, { method: "POST", body: data });
  },
  recipe: (cafe: string, item: string, signal?: AbortSignal) =>
    request<Recipe>(`${cafePath(cafe)}/menu-items/${item}/recipe/`, { signal }),
  async saveRecipe(cafe: string, item: string, data: RecipeInput) {
    await ensureCsrf();
    return request<Recipe>(`${cafePath(cafe)}/menu-items/${item}/recipe/`, { method: "PUT", body: data });
  },
  recipeCost: (branch: string, item: string, signal?: AbortSignal) =>
    request<RecipeCost>(`${branchPath(branch)}/menu-items/${item}/cost/`, { signal }),
  report: (branch: string, start: string, end: string, signal?: AbortSignal) =>
    request<CostReport>(`${branchPath(branch)}/reports/cost/?start_date=${start}&end_date=${end}`, { signal }),
};
