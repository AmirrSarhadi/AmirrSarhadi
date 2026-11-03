"use client";
import { CustomerPicker } from "./customer-picker";
import type { Customer } from "../lib/customers";
import type { Lead } from "../lib/leads";
import type { Opportunity } from "../lib/sales";
import type { TargetKind } from "../lib/activities";
export function ActivityTargetPicker({
  org,
  user,
  kind,
  value,
  label,
  onChange,
  disabled,
  error,
}: {
  org: string;
  user: number;
  kind: TargetKind;
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
  disabled: boolean;
  error?: string;
}) {
  if (kind === "none") return null;
  const props = {
    organizationId: org,
    userId: user,
    value,
    currentLabel: label,
    onChange,
    label: "پرونده مرتبط",
    disabled,
    error,
  };
  if (kind === "lead")
    return (
      <CustomerPicker<Lead>
        {...props}
        namespace="leads"
        kind="leads"
        isOptionDisabled={(record) =>
          record.status === "converted" || !!record.archived_at
        }
      />
    );
  if (kind === "opportunity")
    return (
      <CustomerPicker<Opportunity>
        {...props}
        namespace="sales"
        kind="opportunities"
      />
    );
  return (
    <CustomerPicker<Customer>
      {...props}
      kind={kind === "person" ? "people" : "companies"}
    />
  );
}
