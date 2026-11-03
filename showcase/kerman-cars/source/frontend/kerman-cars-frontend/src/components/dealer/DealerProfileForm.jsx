import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";
import useCatalog from "../../hooks/useCatalog";
import useUnsavedGuard from "../../hooks/useUnsavedGuard";
import QueryStatus from "../shared/QueryStatus";
import ConfirmDialog from "../shared/ConfirmDialog";
import { dealerSchema } from "../../features/dealers/dealerSchema";
import {
    dealerDefaults,
    dealerPayload,
    dealerTextFields,
    dealerFiles,
} from "../../services/dealerProfileData";
import { saveOwnerDealer } from "../../services/dealerOwnerService";
import { mediaUrl } from "../../services/listingData";
import "./DealerProfileForm.scss";

export default function DealerProfileForm({ record }) {
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();
    const prefix = useId();
    const [files, setFiles] = useState({});
    const [serverError, setServerError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors, isSubmitting, isDirty },
    } = useForm({
        resolver: zodResolver(dealerSchema),
        defaultValues: dealerDefaults(record, user),
    });
    const city = useWatch({ control, name: "city" });
    const neighborhood = useWatch({ control, name: "neighborhood" });
    const cities = useCatalog("locations/cities/");
    const neighborhoods = useCatalog(
        "locations/neighborhoods/",
        { city },
        Boolean(city),
    );
    const { blocker, allowNavigation } = useUnsavedGuard(
        isDirty || Object.values(files).some((value) => value !== undefined),
    );
    const returnTo =
        record?.status === "approved" ? "/dealer-dashboard" : "/dealer/status";
    const submit = async (values) => {
        setServerError("");
        try {
            await saveOwnerDealer(
                Boolean(record),
                dealerPayload(values, record),
                files,
                allowNavigation,
            );
            allowNavigation();
            toast.success(
                record?.status === "approved"
                    ? "اطلاعات نمایشگاه ذخیره شد."
                    : "درخواست نمایشگاه روی سرور ثبت شد.",
            );
            navigate(returnTo, { replace: true });
        } catch (error) {
            setServerError(error.message);
            if (!error.response || error.response.status >= 500)
                setUncertain(true);
            let focused = false;
            for (const [name, message] of Object.entries(
                error.response?.data ?? {},
            )) {
                if (
                    name in dealerDefaults(record, user) ||
                    dealerFiles.some((file) => file.name === name)
                ) {
                    setError(
                        name,
                        {
                            message: Array.isArray(message)
                                ? message.join(" ")
                                : String(message),
                        },
                        { shouldFocus: !focused },
                    );
                    focused = true;
                }
            }
        }
    };
    const common = (name) => ({
        id: `${prefix}-${name}`,
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name]
            ? `${prefix}-${name}-error`
            : undefined,
        ...register(name),
    });
    const errorFor = (name) =>
        errors[name] && (
            <p id={`${prefix}-${name}-error`} className="text-danger">
                {errors[name].message}
            </p>
        );
    return (
        <section className="dealer-owner-form">
            <div className="d-flex justify-content-between gap-3 flex-wrap mb-4">
                <h1>
                    {record
                        ? "ویرایش اطلاعات نمایشگاه"
                        : "ثبت درخواست نمایشگاه"}
                </h1>
                <Link to={record ? returnTo : "/dashboard"}>بازگشت</Link>
            </div>
            <p>
                {record?.status === "rejected"
                    ? "ذخیرهٔ اصلاحات، درخواست ردشده را دوباره برای مدیریت ارسال می‌کند."
                    : record?.status === "suspended"
                      ? "ویرایش اطلاعات، تعلیق را رفع نمی‌کند؛ تصمیم با مدیریت است."
                      : record
                        ? "تغییرات پس از ذخیره از سرور دریافت می‌شوند."
                        : "ثبت درخواست به‌معنای تأیید نمایشگاه نیست. وضعیت بررسی را در صفحهٔ درخواست پیگیری کنید."}
            </p>
            <form noValidate onSubmit={handleSubmit(submit)}>
                <fieldset
                    disabled={isSubmitting || uncertain}
                    className="border-0 p-0"
                >
                    <div className="row g-3">
                        {dealerTextFields.map((field) => (
                            <div
                                className={
                                    field.multiline
                                        ? "col-12"
                                        : "col-12 col-md-6"
                                }
                                key={field.name}
                            >
                                <label
                                    className="form-label"
                                    htmlFor={`${prefix}-${field.name}`}
                                >
                                    {field.label}
                                    {field.required ? " *" : ""}
                                </label>
                                {field.multiline ? (
                                    <textarea
                                        {...common(field.name)}
                                        rows={4}
                                        className="form-control resize-none"
                                    />
                                ) : (
                                    <input
                                        {...common(field.name)}
                                        className="form-control"
                                        type={field.type ?? "text"}
                                        maxLength={field.maxLength}
                                        inputMode={
                                            field.numeric
                                                ? "decimal"
                                                : undefined
                                        }
                                        dir={
                                            field.type || field.numeric
                                                ? "ltr"
                                                : undefined
                                        }
                                    />
                                )}
                                {field.name === "hours_description" &&
                                    record?.business_hours &&
                                    Object.keys(record.business_hours).some(
                                        (key) => key !== "description",
                                    ) && (
                                        <p className="small">
                                            برنامهٔ روزهای ثبت‌شده حفظ می‌شود؛
                                            این فیلد توضیح تکمیلی آن است.
                                        </p>
                                    )}
                                {errorFor(field.name)}
                            </div>
                        ))}
                        <div className="col-12 col-md-6">
                            <label
                                className="form-label"
                                htmlFor={`${prefix}-city`}
                            >
                                شهر
                            </label>
                            <select
                                {...common("city")}
                                value={city}
                                className="form-select"
                                disabled={cities.isPending || cities.isError}
                                onChange={(event) => {
                                    setValue("city", event.target.value, {
                                        shouldDirty: true,
                                    });
                                    setValue("neighborhood", "", {
                                        shouldDirty: true,
                                    });
                                }}
                            >
                                <option value="">انتخاب کنید</option>
                                {record?.city &&
                                    !cities.data?.some(
                                        (row) => row.id === record.city,
                                    ) && (
                                        <option value={record.city}>
                                            شهر ثبت‌شده (شناسه {record.city})
                                        </option>
                                    )}
                                {cities.data?.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        {row.name}
                                        {row.province_name
                                            ? ` — ${row.province_name}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                            <QueryStatus query={cities} />
                            {cities.isSuccess && !cities.data.length && (
                                <p role="status">
                                    شهری برای انتخاب ثبت نشده است.
                                </p>
                            )}
                            {errorFor("city")}
                        </div>
                        <div className="col-12 col-md-6">
                            <label
                                className="form-label"
                                htmlFor={`${prefix}-neighborhood`}
                            >
                                محله
                            </label>
                            <select
                                {...common("neighborhood")}
                                value={neighborhood}
                                className="form-select"
                                disabled={
                                    !city ||
                                    neighborhoods.isPending ||
                                    neighborhoods.isError
                                }
                            >
                                <option value="">بدون محله</option>
                                {record?.neighborhood &&
                                    String(record.city) === city &&
                                    !neighborhoods.data?.some(
                                        (row) => row.id === record.neighborhood,
                                    ) && (
                                        <option value={record.neighborhood}>
                                            محله ثبت‌شده (شناسه{" "}
                                            {record.neighborhood})
                                        </option>
                                    )}
                                {neighborhoods.data?.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        {row.name}
                                    </option>
                                ))}
                            </select>
                            {city && <QueryStatus query={neighborhoods} />}
                            {errorFor("neighborhood")}
                        </div>
                        {dealerFiles.map((field) => (
                            <div className="col-12 col-md-6" key={field.name}>
                                <label
                                    className="form-label"
                                    htmlFor={`${prefix}-${field.name}`}
                                >
                                    {field.label}
                                </label>
                                {record?.[field.name] &&
                                    files[field.name] !== null && (
                                        <div className="mb-2">
                                            {field.image ? (
                                                <img
                                                    className="dealer-owner-form__preview"
                                                    src={mediaUrl(
                                                        record[field.name],
                                                    )}
                                                    alt={field.label}
                                                />
                                            ) : (
                                                <a
                                                    href={mediaUrl(
                                                        record[field.name],
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    مشاهدهٔ مدرک ثبت‌شده
                                                </a>
                                            )}
                                        </div>
                                    )}
                                <input
                                    {...common(field.name)}
                                    type="file"
                                    className="form-control"
                                    accept={
                                        field.image
                                            ? "image/png,image/jpeg,image/webp"
                                            : ".pdf,image/png,image/jpeg,image/webp"
                                    }
                                    onChange={(event) => {
                                        setFiles((old) => ({
                                            ...old,
                                            [field.name]: event.target.files[0],
                                        }));
                                    }}
                                />
                                {files[field.name] instanceof File ? (
                                    <div>
                                        <p className="small">
                                            {files[field.name].name}
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary mt-2"
                                            onClick={() => {
                                                setFiles((old) => {
                                                    const next = { ...old };
                                                    delete next[field.name];
                                                    return next;
                                                });
                                                document.getElementById(
                                                    `${prefix}-${field.name}`,
                                                ).value = "";
                                            }}
                                        >
                                            لغو انتخاب فایل جدید
                                        </button>
                                    </div>
                                ) : (
                                    record?.[field.name] && (
                                        <label className="d-block mt-2">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    files[field.name] === null
                                                }
                                                onChange={(event) =>
                                                    setFiles((old) => ({
                                                        ...old,
                                                        [field.name]: event
                                                            .target.checked
                                                            ? null
                                                            : undefined,
                                                    }))
                                                }
                                            />{" "}
                                            حذف فایل فعلی
                                        </label>
                                    )
                                )}
                                {errorFor(field.name)}
                            </div>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary mt-4"
                        disabled={isSubmitting || uncertain}
                    >
                        {isSubmitting
                            ? "در حال ذخیره…"
                            : record
                              ? "ذخیره اطلاعات نمایشگاه"
                              : "ثبت درخواست بررسی"}
                    </button>
                </fieldset>
                {serverError && (
                    <p role="alert" className="text-danger mt-3">
                        {serverError}
                    </p>
                )}
                {uncertain && (
                    <div>
                        <p role="status">
                            نتیجهٔ ذخیره تأیید نشد. برای جلوگیری از درخواست
                            تکراری، ابتدا وضعیت ذخیره را از سرور بررسی کنید.
                            بارگذاری دوباره، اطلاعات فرم را با اطلاعات سرور
                            جایگزین می‌کند.
                        </p>
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => window.location.reload()}
                        >
                            بارگذاری دوباره از سرور
                        </button>
                    </div>
                )}
            </form>
            {blocker.state === "blocked" && (
                <ConfirmDialog
                    title="خروج بدون ذخیره؟"
                    confirmLabel="خروج بدون ذخیره"
                    pending={isSubmitting}
                    onCancel={() => blocker.reset()}
                    onConfirm={() => blocker.proceed()}
                >
                    <p>تغییرات و فایل‌های انتخاب‌شده از دست می‌روند.</p>
                </ConfirmDialog>
            )}
        </section>
    );
}
