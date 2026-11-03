import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function AdminActionDialog({
    title,
    description,
    confirmLabel,
    fields = [],
    submit,
    onDone,
    onCancel,
    intent = "danger",
}) {
    const id = useId();
    const [serverError, setServerError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: Object.fromEntries(
            fields.map((field) => [field.name, field.defaultValue || ""]),
        ),
    });
    const save = async (values) => {
        setServerError("");
        try {
            await submit(values);
            toast.success("تغییر با موفقیت ثبت شد.");
            onDone();
        } catch (error) {
            setServerError(error.message);
            if (!error.response) setUncertain(true);
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
        <ConfirmDialog
            title={title}
            pending={isSubmitting}
            confirmDisabled={uncertain}
            intent={intent}
            onCancel={onCancel}
            onConfirm={() => handleSubmit(save)()}
            confirmLabel={confirmLabel}
        >
            <p>{description}</p>
            <form noValidate onSubmit={(event) => handleSubmit(save)(event)}>
                <fieldset disabled={isSubmitting} className="border-0 p-0">
                    {fields.map((field) => (
                        <div className="mb-3" key={field.name}>
                            <label
                                className="form-label"
                                htmlFor={`${id}-${field.name}`}
                            >
                                {field.label}
                            </label>
                            <textarea
                                id={`${id}-${field.name}`}
                                className="form-control resize-none"
                                rows={3}
                                aria-invalid={Boolean(errors[field.name])}
                                aria-describedby={
                                    errors[field.name]
                                        ? `${id}-${field.name}-error`
                                        : undefined
                                }
                                {...register(field.name, {
                                    validate: (value) =>
                                        !field.required ||
                                        Boolean(value.trim()) ||
                                        "این توضیح را وارد کنید.",
                                    maxLength: field.maxLength
                                        ? {
                                              value: field.maxLength,
                                              message: "توضیحات طولانی است.",
                                          }
                                        : undefined,
                                })}
                            />
                            {errors[field.name] && (
                                <span
                                    id={`${id}-${field.name}-error`}
                                    className="text-danger"
                                >
                                    {errors[field.name].message}
                                </span>
                            )}
                        </div>
                    ))}
                </fieldset>
            </form>
            {serverError && <p role="alert">{serverError}</p>}
            {uncertain && (
                <p role="status">
                    نتیجهٔ عملیات تأیید نشد. پنجره را ببندید و وضعیت تازه را
                    دریافت کنید؛ پیش از بررسی نتیجه، عملیات را تکرار نکنید.
                </p>
            )}
        </ConfirmDialog>
    );
}
