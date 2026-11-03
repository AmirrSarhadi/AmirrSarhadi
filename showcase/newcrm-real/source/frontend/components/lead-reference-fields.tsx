"use client";
import { Target, Settings2, CircleDollarSign, FileText } from "lucide-react";
import { leadFields } from "../lib/leads";
import { RecordFields } from "./record-fields";
import { FormField } from "./customer-controls";
import type { ReactNode } from "react";
export function LeadReferenceFields({
  draft,
  errors,
  disabled,
  onChange,
  ownerControl,
}: {
  draft: Record<string, string>;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
  ownerControl: ReactNode;
}) {
  const fields = (names: string[]) =>
    names.flatMap((name) => leadFields.filter((f) => f.name === name));
  const common = { draft, errors, disabled, onChange, prefix: "lead-field" };
  return (
    <>
      <h2 className="customer-form-section">
        <Target size={18} aria-hidden="true" />
        اطلاعات اصلی لید
      </h2>
      <div className="lead-title-field">
        <RecordFields {...common} fields={fields(["title"])} />
      </div>
      <div className="customer-fields">
        <RecordFields
          {...common}
          fields={fields(["first_name", "last_name"])}
        />
        {[
          ["contact_email", "ایمیل", "emails"],
          ["contact_phone", "تلفن", "phones"],
        ].map(([name, label, canonical]) => (
          <FormField
            key={name}
            id={`lead-field-${name}`}
            label={label}
            error={errors[canonical]}
          >
            <input
              id={`lead-field-${name}`}
              dir="ltr"
              value={draft[name] || ""}
              disabled={disabled}
              aria-invalid={!!errors[canonical]}
              aria-describedby={`lead-field-${name}-error`}
              onChange={(e) => onChange(name, e.target.value)}
            />
          </FormField>
        ))}
        <RecordFields
          {...common}
          fields={fields(["company_name", "contact_title"])}
        />
      </div>
      <details className="customer-extra-contacts">
        <summary>شماره‌ها و ایمیل‌های بیشتر</summary>
        <div className="customer-fields">
          <RecordFields {...common} fields={fields(["phones", "emails"])} />
        </div>
      </details>
      <h2 className="customer-form-section">
        <Settings2 size={18} aria-hidden="true" />
        وضعیت و اولویت
      </h2>
      <div className="customer-fields lead-management-fields">
        <RecordFields
          {...common}
          fields={fields(["status", "priority", "source"])}
        />
        {ownerControl}
      </div>
      {draft.status === "rejected" && (
        <RecordFields {...common} fields={fields(["rejection_reason"])} />
      )}
      <h2 className="customer-form-section">
        <CircleDollarSign size={18} aria-hidden="true" />
        اطلاعات مالی
      </h2>
      <div className="customer-fields lead-financial-fields">
        <RecordFields
          {...common}
          fields={fields([
            "estimated_amount",
            "probability",
            "expected_close_date",
          ])}
        />
      </div>
      <h2 className="customer-form-section">
        <FileText size={18} aria-hidden="true" />
        توضیحات و یادداشت‌ها
      </h2>
      <div className="customer-fields">
        <RecordFields
          {...common}
          fields={fields(["description", "notes", "tags"])}
        />
      </div>
    </>
  );
}
