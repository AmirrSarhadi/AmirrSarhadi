"use client";
import { UserRound, Phone, Settings2 } from "lucide-react";
import { fieldSpecs, type Draft } from "../lib/customers";
import { RecordFields } from "./record-fields";
import { FormField } from "./customer-controls";
import { CustomerPicker } from "./customer-picker";
export function CustomerReferenceFields({
  draft,
  errors,
  disabled,
  onChange,
  organizationId,
  userId,
  ownerControl,
}: {
  ownerControl?: React.ReactNode;
  draft: Draft;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (field: string, value: string) => void;
  organizationId: string;
  userId: number;
}) {
  const group = (names: string[]) =>
    names.flatMap((name) =>
      fieldSpecs.people.filter((field) => field.name === name),
    );
  const props = { draft, errors, disabled, onChange };
  return (
    <>
      <h2 className="customer-form-section">
        <UserRound size={18} aria-hidden="true" />
        اطلاعات اصلی
      </h2>
      <div className="customer-fields">
        <RecordFields {...props} fields={group(["customer_type"])} />
        {(draft.customer_type === "legal" ||
          draft.primary_company_id ||
          draft.primary_company_locked) && (
          <div className="customer-field customer-company-field">
            <CustomerPicker
              organizationId={organizationId}
              userId={userId}
              compact
              kind="companies"
              value={draft.primary_company_id}
              currentLabel={draft.primary_company_label}
              label="شرکت اصلی مشتری"
              defaultLabel={
                draft.primary_company_locked
                  ? "شرکت فعلی در دسترس نیست؛ بدون تغییر حفظ می‌شود"
                  : "شرکت را انتخاب کنید"
              }
              error={errors.primary_company_id}
              disabled={disabled}
              onChange={(id, label) => {
                onChange("primary_company_id", id);
                onChange("primary_company_label", label);
              }}
            />
            <a className="customer-link" href="/customers?kind=companies">
              شرکت‌ها
            </a>
          </div>
        )}
        <RecordFields
          {...props}
          fields={group(["first_name", "last_name", "industry", "title"])}
        />
      </div>
      <h2 className="customer-form-section">
        <Phone size={18} aria-hidden="true" />
        اطلاعات تماس
      </h2>
      <div className="customer-fields">
        {(
          [
            { name: "contact_landline", label: "تلفن ثابت" },
            { name: "contact_mobile", label: "موبایل" },
            { name: "contact_email", label: "ایمیل" },
          ] as const
        ).map((field) => (
          <FormField
            key={field.name}
            id={"field-" + field.name}
            label={field.label}
            error={
              errors[field.name] ||
              (field.name === "contact_email" ? errors.emails : errors.phones)
            }
          >
            <input
              id={"field-" + field.name}
              value={draft[field.name] || ""}
              dir="ltr"
              type={field.name === "contact_email" ? "email" : "text"}
              disabled={disabled}
              aria-invalid={
                !!(
                  errors[field.name] ||
                  (field.name === "contact_email"
                    ? errors.emails
                    : errors.phones)
                )
              }
              aria-describedby={"field-" + field.name + "-error"}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
          </FormField>
        ))}
        <RecordFields
          {...props}
          fields={group([
            "street",
            "city",
            "province",
            "postal_code",
            "website",
          ])}
        />
      </div>
      <details className="customer-extra-contacts">
        <summary>شماره‌ها و ایمیل‌های بیشتر</summary>
        <div className="customer-fields">
          <RecordFields {...props} fields={group(["phones", "emails"])} />
        </div>
      </details>
      <h2 className="customer-form-section">
        <Settings2 size={18} aria-hidden="true" />
        اطلاعات مدیریتی
      </h2>
      <div className="customer-fields">
        <FormField id="field-status" label="وضعیت مشتری" error={errors.status}>
          <select
            id="field-status"
            value={draft.status}
            disabled={disabled}
            aria-invalid={!!errors.status}
            aria-describedby="field-status-error"
            onChange={(e) => onChange("status", e.target.value)}
          >
            <option value="active">فعال</option>
            <option value="potential">مشتری بالقوه</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </FormField>
        <RecordFields {...props} fields={group(["source"])} />
        {ownerControl}
        <RecordFields {...props} fields={group(["tags", "notes"])} />
      </div>
    </>
  );
}
