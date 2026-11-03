import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { getAdminChoices } from "../../services/adminService";
import { fieldDefaults, resourcePayload } from "../../services/adminResources";
import { mediaUrl } from "../../services/listingData";
import { normalizeDigits } from "../../utils/validators";
import useUnsavedGuard from "../../hooks/useUnsavedGuard";
import ConfirmDialog from "../shared/ConfirmDialog";

function RelationField({ field, common }) {
    const query = useQuery({
        queryKey: ["admin-options", field.resource],
        queryFn: ({ signal }) => getAdminChoices(field.resource, signal),
        staleTime: 300000,
    });
    return (
        <>
            <select
                {...common}
                className="form-select"
                disabled={common.disabled || query.isPending || query.isError}
            >
                <option value="">
                    {query.isPending ? "در حال دریافت…" : "انتخاب کنید"}
                </option>
                {query.data?.map((row) => (
                    <option value={row.id} key={row.id}>
                        {[
                            row.province_name,
                            row.city_name,
                            row.brand_name,
                            row.name,
                        ]
                            .filter(Boolean)
                            .join(" — ")}
                        {row.is_active === false ? " (غیرفعال)" : ""}
                    </option>
                ))}
            </select>
            {query.isError && (
                <p role="alert">
                    {query.error.message}
                    <button type="button" onClick={() => query.refetch()}>
                        تلاش دوباره
                    </button>
                </p>
            )}
            {query.isSuccess && !query.data.length && (
                <p role="status">
                    ابتدا اطلاعات وابسته را در کاتالوگ ثبت کنید.
                </p>
            )}
        </>
    );
}

export default function AdminResourceForm({
    title,
    fields,
    record,
    save,
    returnTo,
    onSaved,
    stay = false,
}) {
    const id = useId();
    const [files, setFiles] = useState({});
    const [serverError, setServerError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting, isDirty },
    } = useForm({ defaultValues: fieldDefaults(fields, record) });
    const { blocker, allowNavigation } = useUnsavedGuard(
        isDirty || Object.keys(files).length > 0,
    );
    const submit = async (values) => {
        setServerError("");
        const missingImage = fields.find(
            (field) =>
                field.type === "file" &&
                field.required &&
                !files[field.name] &&
                !record?.[field.name],
        );
        if (missingImage) {
            setError(
                missingImage.name,
                { message: "تصویر را انتخاب کنید." },
                { shouldFocus: true },
            );
            return;
        }
        try {
            const payload = resourcePayload(fields, values, files);
            const saved = await save(payload);
            toast.success("اطلاعات روی سرور ذخیره شد.");
            if (stay) {
                reset(fieldDefaults(fields, saved));
                setFiles({});
            } else allowNavigation();
            onSaved?.(saved);
        } catch (error) {
            setServerError(error.message);
            if (!error.response && error.name !== "RangeError")
                setUncertain(true);
            for (const [name, messages] of Object.entries(
                error.response?.data || {},
            )) {
                if (fields.some((field) => field.name === name))
                    setError(
                        name,
                        {
                            message: Array.isArray(messages)
                                ? messages.join(" ")
                                : String(messages),
                        },
                        { shouldFocus: true },
                    );
            }
        }
    };
    return (
        <section>
            <div className="admin-page-heading">
                <h1>{title}</h1>
                <Link to={returnTo}>بازگشت</Link>
            </div>
            <form
                noValidate
                onSubmit={(event) => handleSubmit(submit)(event)}
                className="admin-settings-card p-4"
            >
                <fieldset
                    className="border-0 p-0"
                    disabled={isSubmitting || uncertain}
                >
                    <div className="row g-3">
                        {fields.map((field) => {
                            const fieldId = `${id}-${field.name}`;
                            const common = {
                                id: fieldId,
                                className: "form-control",
                                "aria-invalid": Boolean(errors[field.name]),
                                "aria-describedby": errors[field.name]
                                    ? `${fieldId}-error`
                                    : field.help
                                      ? `${fieldId}-help`
                                      : undefined,
                                ...register(field.name, {
                                    setValueAs:
                                        field.type === "number"
                                            ? normalizeDigits
                                            : undefined,
                                    validate: (value) => {
                                        if (
                                            field.type === "file" ||
                                            field.type === "checkbox"
                                        )
                                            return true;
                                        if (
                                            field.required &&
                                            !String(value ?? "").trim()
                                        )
                                            return "این فیلد را وارد کنید.";
                                        if (!value) return true;
                                        if (
                                            field.type === "number" &&
                                            (!/^(\d+)(\.\d+)?$/.test(value) ||
                                                !Number.isFinite(
                                                    Number(value),
                                                ) ||
                                                (!field.step &&
                                                    !/^\d+$/.test(value)) ||
                                                Number(value) <
                                                    (field.min ?? 0))
                                        )
                                            return "عدد معتبر در محدوده مجاز وارد کنید.";
                                        if (
                                            field.pattern &&
                                            !field.pattern.test(value)
                                        )
                                            return "قالب مقدار واردشده معتبر نیست.";
                                        if (
                                            field.url &&
                                            !/^https?:\/\//i.test(value)
                                        )
                                            return "نشانی را با https:// یا http:// وارد کنید.";
                                        if (
                                            field.type === "datetime" &&
                                            Number.isNaN(
                                                Date.parse(`${value}+03:30`),
                                            )
                                        )
                                            return "زمان معتبر وارد کنید.";
                                        return true;
                                    },
                                    maxLength: field.maxLength
                                        ? {
                                              value: field.maxLength,
                                              message:
                                                  "مقدار واردشده طولانی است.",
                                          }
                                        : undefined,
                                }),
                            };
                            return (
                                <div
                                    className="col-12 col-md-6"
                                    key={field.name}
                                >
                                    <label
                                        htmlFor={fieldId}
                                        className="form-label"
                                    >
                                        {field.label}
                                        {field.required ? " *" : ""}
                                    </label>
                                    {field.type === "relation" ? (
                                        <RelationField
                                            field={field}
                                            common={common}
                                        />
                                    ) : field.type === "select" ? (
                                        <select
                                            {...common}
                                            className="form-select"
                                        >
                                            <option value="">
                                                انتخاب کنید
                                            </option>
                                            {Object.entries(field.choices).map(
                                                ([value, label]) => (
                                                    <option
                                                        value={value}
                                                        key={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    ) : field.type === "file" ? (
                                        <>
                                            {record?.[field.name] &&
                                                files[field.name] !== null && (
                                                    <img
                                                        src={mediaUrl(
                                                            record[field.name],
                                                        )}
                                                        alt={field.label}
                                                        style={{
                                                            display: "block",
                                                            maxWidth: "100%",
                                                            maxHeight: 150,
                                                        }}
                                                    />
                                                )}
                                            <input
                                                {...common}
                                                id={fieldId}
                                                type="file"
                                                accept="image/*"
                                                className="form-control"
                                                aria-invalid={Boolean(
                                                    errors[field.name],
                                                )}
                                                aria-describedby={
                                                    errors[field.name]
                                                        ? `${fieldId}-error`
                                                        : undefined
                                                }
                                                onChange={(event) => {
                                                    const file =
                                                        event.target.files?.[0];
                                                    clearErrors(field.name);
                                                    setFiles((old) => {
                                                        const next = { ...old };
                                                        if (file)
                                                            next[field.name] =
                                                                file;
                                                        else
                                                            delete next[
                                                                field.name
                                                            ];
                                                        return next;
                                                    });
                                                }}
                                            />
                                            {files[field.name] instanceof
                                                File && (
                                                <div>
                                                    <p role="status">
                                                        انتخاب‌شده:{" "}
                                                        {files[field.name].name}{" "}
                                                        (
                                                        {new Intl.NumberFormat(
                                                            "fa-IR",
                                                        ).format(
                                                            files[field.name]
                                                                .size,
                                                        )}{" "}
                                                        بایت)
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFiles((old) => {
                                                                const next = {
                                                                    ...old,
                                                                };
                                                                delete next[
                                                                    field.name
                                                                ];
                                                                return next;
                                                            });
                                                            document.getElementById(
                                                                fieldId,
                                                            ).value = "";
                                                        }}
                                                    >
                                                        لغو انتخاب فایل جدید
                                                    </button>
                                                </div>
                                            )}
                                            {!field.required &&
                                                record?.[field.name] &&
                                                !(
                                                    files[field.name] instanceof
                                                    File
                                                ) && (
                                                    <label className="d-block mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                files[
                                                                    field.name
                                                                ] === null
                                                            }
                                                            onChange={(event) =>
                                                                setFiles(
                                                                    (old) => ({
                                                                        ...old,
                                                                        [field.name]:
                                                                            event
                                                                                .target
                                                                                .checked
                                                                                ? null
                                                                                : undefined,
                                                                    }),
                                                                )
                                                            }
                                                        />{" "}
                                                        حذف تصویر فعلی
                                                    </label>
                                                )}
                                        </>
                                    ) : field.type === "checkbox" ? (
                                        <input
                                            {...common}
                                            className="form-check-input d-block"
                                            type="checkbox"
                                        />
                                    ) : field.multiline ? (
                                        <textarea
                                            {...common}
                                            className="form-control resize-none"
                                            rows={5}
                                        />
                                    ) : (
                                        <input
                                            {...common}
                                            type={
                                                field.type === "datetime"
                                                    ? "datetime-local"
                                                    : "text"
                                            }
                                            inputMode={
                                                field.type === "number"
                                                    ? field.step
                                                        ? "decimal"
                                                        : "numeric"
                                                    : undefined
                                            }
                                            dir={
                                                field.type === "number" ||
                                                field.type === "datetime" ||
                                                field.url
                                                    ? "ltr"
                                                    : undefined
                                            }
                                        />
                                    )}
                                    {field.help && (
                                        <p
                                            id={`${fieldId}-help`}
                                            className="small"
                                        >
                                            {field.help}
                                        </p>
                                    )}
                                    {errors[field.name] && (
                                        <span
                                            id={`${fieldId}-error`}
                                            className="text-danger"
                                        >
                                            {errors[field.name].message}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary mt-4"
                        disabled={isSubmitting || uncertain}
                    >
                        {isSubmitting ? "در حال ذخیره…" : "ذخیره اطلاعات"}
                    </button>
                </fieldset>
                {serverError && (
                    <p role="alert" className="mt-3">
                        {serverError}
                    </p>
                )}
                {uncertain && (
                    <p role="status">
                        نتیجهٔ ذخیره تأیید نشد. برای جلوگیری از ثبت تکراری،
                        ابتدا به فهرست برگردید و وضعیت تازه را بررسی کنید.
                    </p>
                )}
            </form>
            {blocker.state === "blocked" && (
                <ConfirmDialog
                    title="خروج بدون ذخیره؟"
                    pending={isSubmitting}
                    onCancel={() => blocker.reset()}
                    onConfirm={() => blocker.proceed()}
                    confirmLabel="خروج بدون ذخیره"
                >
                    <p>تغییرات ذخیره‌نشده این فرم از دست می‌روند.</p>
                </ConfirmDialog>
            )}
        </section>
    );
}
