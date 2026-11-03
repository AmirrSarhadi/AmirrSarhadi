export type FieldSpec = {
  name: string;
  label: string;
  length?: number;
  lines?: boolean;
  hint?: string;
  direction?: "ltr";
  type?: string;
  readOnly?: boolean;
  options?: { value: string; label: string; disabled?: boolean }[];
  list?: boolean;
  suggestionsId?: string;
};
