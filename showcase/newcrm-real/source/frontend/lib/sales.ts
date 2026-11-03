import { api, type ApiOptions } from "./api";
import { parsePersianDate, parseToman, persianDate } from "./sales-entry";
export type Stage = {
  id: string;
  name: string;
  position: number;
  kind: "open" | "won" | "lost";
};
export type Pipeline = {
  id: string;
  name: string;
  version: number;
  stages: Stage[];
};
export type Opportunity = {
  id: string;
  title: string;
  organization_id: string;
  owner_id: number;
  owner_label: string;
  version: number;
  person_id: string | null;
  company_id: string | null;
  customer_label: string;
  pipeline_id: string;
  pipeline_name: string;
  stage_id: string;
  stage_name: string;
  state: "open" | "won" | "lost";
  amount: string | null;
  amount_unit: "TOMAN";
  expected_close_date: string | null;
  closed_at: string | null;
  loss_reason: string;
  source_lead_id: string | null;
};
export type SaleEvent = {
  id: number;
  action: string;
  version: number;
  previous_stage_name: string;
  stage_name: string;
  stage_kind: string;
  amount: string | null;
  reason: string;
  created_at: string;
};
export type SaleDraft = {
  title: string;
  pipeline_id: string;
  stage_id: string;
  amount: string;
  expected_close_date: string;
};
export const blankSale = (): SaleDraft => ({
  title: "",
  pipeline_id: "",
  stage_id: "",
  amount: "",
  expected_close_date: "",
});
export const saleDraft = (sale: Opportunity): SaleDraft => ({
  title: sale.title,
  pipeline_id: sale.pipeline_id,
  stage_id: sale.stage_id,
  amount: sale.amount ?? "",
  expected_close_date: persianDate(sale.expected_close_date),
});
export function saleInput(draft: SaleDraft, includeStage = true) {
  const errors: Record<string, string> = {};
  const body: Record<string, unknown> = { title: draft.title.trim() };
  if (!body.title) errors.title = "عنوان فرصت را وارد کنید.";
  if (includeStage) {
    body.stage_id = draft.stage_id;
    if (!draft.stage_id) errors.stage_id = "قیف و مرحله باز را انتخاب کنید.";
  }
  try {
    body.amount = parseToman(draft.amount);
  } catch (e) {
    errors.amount = (e as Error).message;
  }
  try {
    body.expected_close_date = parsePersianDate(draft.expected_close_date);
  } catch (e) {
    errors.expected_close_date = (e as Error).message;
  }
  return { body, errors };
}
export function salesApi<T>(
  org: string,
  user: number,
  path: string,
  options: ApiOptions = {},
) {
  return api<T>(path, {
    ...options,
    namespace: "sales",
    organizationId: org,
    expectedUserId: user,
  });
}
