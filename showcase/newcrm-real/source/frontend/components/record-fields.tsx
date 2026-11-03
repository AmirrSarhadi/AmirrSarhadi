"use client";
import { AutoTextarea, FormField } from "./customer-controls";
import type { FieldSpec } from "../lib/fields";
import type { ReactNode } from "react";

export function RecordStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <span className={`record-status record-status-${tone}`}>{children}</span>
  );
}

export function RecordFields({
  fields,
  draft,
  errors,
  disabled,
  onChange,
  prefix = "field",
}: {
  fields: FieldSpec[];
  draft: Record<string, string>;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
  prefix?: string;
}) {
  return (
    <>
      {fields.map((field) => {
        const id = `${prefix}-${field.name}`;
        const props = {
          id,
          name: field.name,
          value: draft[field.name] || "",
          disabled,
          dir: field.direction,
          maxLength: field.length,
          "aria-invalid": !!errors[field.name],
          "aria-describedby": `${id}-error${field.hint ? ` ${id}-hint` : ""}`,
          onChange: (
            event: React.ChangeEvent<
              HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >,
          ) => onChange(field.name, event.target.value),
        };
        return (
          <FormField
            key={field.name}
            id={id}
            label={field.label}
            hint={field.hint}
            error={errors[field.name]}
          >
            {field.options ? (
              <select {...props}>
                {field.options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.lines ? (
              <AutoTextarea {...props} rows={field.list ? 2 : 4} />
            ) : (
              <input
                {...props}
                type={field.type || "text"}
                readOnly={field.readOnly}
                list={field.suggestionsId}
                autoComplete="off"
              />
            )}
          </FormField>
        );
      })}
    </>
  );
}

export function RecordValues({
  fields,
  record,
  format,
}: {
  fields: FieldSpec[];
  record: Record<string, unknown>;
  format?: (field: string, value: unknown) => string;
}) {
  return (
    <>
      {fields.map((field) => {
        const value = record[field.name];
        return (
          <div key={field.name}>
            <dt>{field.label}</dt>
            <dd>
              {Array.isArray(value) ? (
                value.length ? (
                  value.map((item, index) => (
                    <bdi
                      className="customer-value-line record-value-multiline"
                      dir={field.direction}
                      key={index}
                    >
                      {String(item)}
                    </bdi>
                  ))
                ) : (
                  "ثبت نشده"
                )
              ) : (
                <bdi
                  dir={field.direction}
                  className={field.lines ? "record-value-multiline" : undefined}
                >
                  {format
                    ? format(field.name, value)
                    : String(value || "ثبت نشده")}
                </bdi>
              )}
            </dd>
          </div>
        );
      })}
    </>
  );
}
