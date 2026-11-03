import { normalizeDigits } from "../../utils/validators";
import { ArrowRight, Check, Circle, ShieldCheck } from "lucide-react";
import BrandPicker from "../../components/listing/BrandPicker";
import { toPersianNumber } from "../../utils/formatters";
import useUnsavedGuard from "../../hooks/useUnsavedGuard";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import {
    getListing,
    saveListing,
    listingAction,
} from "../../services/listingService";
import {
    listingFormSchema,
    listingPayload,
    listingToForm,
} from "../../features/listings/listingForm";
import useAuthStore from "../../store/authStore";
import useCatalog from "../../hooks/useCatalog";
import QueryStatus from "../../components/shared/QueryStatus";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import "./CreateListingPage.scss";

const sections = [
    ["انتخاب خودرو", ["brand", "car_model", "trim", "production_year"]],
    ["مشخصات خودرو", ["mileage", "color", "body_status", "body_note"]],
    [
        "قیمت و توضیحات",
        [
            "title",
            "description",
            "price_type",
            "price",
            "down_payment",
            "installment_amount",
            "installment_count",
            "installment_description",
        ],
    ],
    ["موقعیت خودرو", ["city", "neighborhood", "approximate_address"]],
    ["تصاویر خودرو", []],
    ["بررسی و ثبت", []],
];

function Field({
    name,
    label,
    register,
    errors,
    choices,
    query,
    onChange,
    multiline,
    ...props
}) {
    const options = choices || query?.data;
    const common = {
        id: name,
        className: multiline
            ? "form-control"
            : options || query
              ? "form-select"
              : "form-control",
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `${name}-error` : undefined,
        ...register(name, { onChange }),
        ...props,
    };
    return (
        <div className="col-12 col-md-6 listing-form-field mb-3">
            <label htmlFor={name} className="form-label">
                {label}
            </label>
            {multiline ? (
                <textarea
                    {...common}
                    rows={5}
                    className="form-control resize-none"
                />
            ) : options || query ? (
                <select
                    {...common}
                    disabled={
                        query?.isFetching || query?.isError || props.disabled
                    }
                >
                    <option value="">
                        {query?.isFetching ? "در حال دریافت…" : "انتخاب کنید"}
                    </option>
                    {(Array.isArray(options)
                        ? options.map((v) => [v.id, v.name])
                        : Object.entries(options || {})
                    ).map(([value, text]) => (
                        <option value={value} key={value}>
                            {text}
                        </option>
                    ))}
                </select>
            ) : (
                <input {...common} />
            )}
            {errors[name] && (
                <span
                    id={`${name}-error`}
                    className="listing-form-field__error"
                >
                    {errors[name].message}
                </span>
            )}
            {query?.isError && (
                <p role="alert">
                    {query.error.message}{" "}
                    <button type="button" onClick={() => query.refetch()}>
                        تلاش دوباره
                    </button>
                </p>
            )}
            {query?.isSuccess && !query.data.length && (
                <p role="status">گزینه‌ای در سامانه ثبت نشده است.</p>
            )}
        </div>
    );
}

export default function CreateListingPage() {
    const { listingId } = useParams();
    const user = useAuthStore((s) => s.user);
    const detail = useQuery({
        queryKey: ["listing", listingId],
        queryFn: ({ signal }) => getListing(listingId, signal),
        enabled: Boolean(listingId),
        retry: false,
    });
    if (
        detail.data &&
        detail.data.raw.owner !== user?.id &&
        user?.role !== "ADMIN"
    )
        return (
            <section role="alert">
                <p>فقط مالک آگهی امکان ویرایش آن را دارد.</p>
                <Link to="/cars">بازگشت به آگهی‌ها</Link>
            </section>
        );
    return listingId ? (
        <QueryStatus query={detail}>
            <ListingEditor key={listingId} initial={detail.data} />
        </QueryStatus>
    ) : (
        <ListingEditor key="new" />
    );
}

function ListingEditor({ initial }) {
    const userId = useAuthStore((s) => s.user?.id);
    const sessionVersion = useAuthStore((s) => s.sessionVersion);
    const navigate = useNavigate();
    const draftKey = `kc-server-listing-form:${userId}:${initial?.id || "new"}`;
    const [defaults] = useState(() => {
        try {
            return (
                JSON.parse(sessionStorage.getItem(draftKey)) ||
                listingToForm(initial)
            );
        } catch {
            return listingToForm(initial);
        }
    });
    const {
        register,
        control,
        subscribe,
        handleSubmit,
        trigger,
        setValue,
        setError,
        setFocus,
        getFieldState,
        formState: { errors, isDirty },
    } = useForm({
        defaultValues: defaults,
        resolver: zodResolver(listingFormSchema),
    });
    const values = useWatch({ control });
    const [step, setStep] = useState(0);
    const [furthestStep, setFurthestStep] = useState(initial ? 5 : 0);
    const headingRef = useRef(null);
    const firstStepRender = useRef(true);
    useEffect(() => {
        if (firstStepRender.current) {
            firstStepRender.current = false;
            return;
        }
        headingRef.current?.focus({ preventScroll: true });
        headingRef.current?.scrollIntoView({
            block: "start",
            behavior: "instant",
        });
    }, [step]);
    const [images, setImages] = useState(() =>
        (initial?.imageRecords || []).map((image) => ({
            id: String(image.id),
            imageId: image.id,
            preview: image.image,
        })),
    );
    const [validating, setValidating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setFormError] = useState("");
    const [resetOpen, setResetOpen] = useState(false);
    const previews = useRef(new Set());
    const { blocker, allowNavigation } = useUnsavedGuard(
        busy || images.some((image) => image.file),
        isDirty || images.some((image) => image.file),
    );
    const brands = useCatalog("cars/brands/");
    const models = useCatalog(
        "cars/models/",
        { brand: values.brand },
        Boolean(values.brand),
    );
    const trims = useCatalog(
        "cars/trims/",
        { car_model: values.car_model },
        Boolean(values.car_model),
    );
    const cities = useCatalog("locations/cities/");
    const neighborhoods = useCatalog(
        "locations/neighborhoods/",
        { city: values.city },
        Boolean(values.city),
    );
    const options = useQuery({
        queryKey: ["listing-options"],
        queryFn: async ({ signal }) =>
            (
                await apiClient.get("listings/options/", {
                    signal,
                    skipAuth: true,
                })
            ).data,
    });

    useEffect(() => {
        return subscribe({
            formState: { values: true },
            callback: ({ values: data }) =>
                sessionStorage.setItem(draftKey, JSON.stringify(data)),
        });
    }, [subscribe, draftKey]);
    useEffect(() => {
        const urls = previews.current;
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, []);

    const field = (name, label, props = {}) => (
        <Field
            key={name}
            name={name}
            label={label}
            register={register}
            errors={errors}
            {...props}
        />
    );
    const addImages = async (event) => {
        const files = [...event.target.files];
        event.target.value = "";
        setValidating(true);
        setFormError("");
        const accepted = [];
        const failures = [];
        try {
            for (const file of files) {
                if (
                    images.length + accepted.length >=
                    options.data.max_images
                ) {
                    failures.push(
                        `حداکثر ${options.data.max_images} تصویر مجاز است.`,
                    );
                    break;
                }
                if (
                    !/\.(jpe?g|png|webp)$/i.test(file.name) ||
                    file.size > options.data.max_image_size ||
                    !file.size
                ) {
                    failures.push(`${file.name}: فرمت یا حجم مجاز نیست.`);
                    continue;
                }
                try {
                    const bitmap = await createImageBitmap(file);
                    const pixels = bitmap.width * bitmap.height;
                    bitmap.close();
                    if (pixels > options.data.max_image_pixels) {
                        failures.push(
                            `${file.name}: ابعاد تصویر بیش از حد مجاز است.`,
                        );
                        continue;
                    }
                    const preview = URL.createObjectURL(file);
                    previews.current.add(preview);
                    accepted.push({ id: crypto.randomUUID(), file, preview });
                } catch {
                    failures.push(`${file.name}: تصویر قابل خواندن نیست.`);
                }
            }
            setImages((current) => [...current, ...accepted]);
            setFormError(failures.join(" "));
        } finally {
            setValidating(false);
        }
    };
    const removeImage = (image) => {
        if (image.file) {
            URL.revokeObjectURL(image.preview);
            previews.current.delete(image.preview);
        }
        setImages((current) => current.filter((item) => item.id !== image.id));
    };
    const move = (index, delta) =>
        setImages((current) => {
            const copy = [...current];
            [copy[index], copy[index + delta]] = [
                copy[index + delta],
                copy[index],
            ];
            return copy;
        });
    const save = async (data, event) => {
        if (busy) return;
        const review = event.nativeEvent.submitter?.value === "review";
        if (review && !images.length) {
            setStep(4);
            setFormError("برای ارسال به بررسی حداقل یک تصویر لازم است.");
            return;
        }
        setBusy(true);
        setFormError("");
        try {
            const saved = await saveListing(
                initial?.id,
                listingPayload(data),
                images.filter((image) => image.file).map((image) => image.file),
                images
                    .filter((image) => image.imageId)
                    .map((image) => image.imageId),
                ({ loaded, total }) =>
                    setProgress(
                        total ? Math.round((loaded / total) * 100) : null,
                    ),
            );
            if (useAuthStore.getState().sessionVersion !== sessionVersion)
                return;
            sessionStorage.removeItem(draftKey);
            if (review && ["draft", "needs_edit"].includes(saved.status)) {
                try {
                    await listingAction(saved.id, "submit");
                    toast.success("آگهی برای بررسی ارسال شد.");
                } catch (submitError) {
                    toast.error(
                        `پیش‌نویس ذخیره شد، اما ارسال برای بررسی انجام نشد: ${submitError.message}`,
                        { duration: 7000 },
                    );
                }
            } else
                toast.success(
                    saved.status === "pending"
                        ? "تغییرات ذخیره شد و آگهی در انتظار بررسی است."
                        : saved.status === "draft"
                          ? "پیش‌نویس آگهی ذخیره شد."
                          : "تغییرات آگهی ذخیره شد.",
                );
            allowNavigation();
            navigate("/dashboard/listings", { replace: true });
        } catch (saveError) {
            setFormError(saveError.message);
            let firstField;
            for (const [name, messages] of Object.entries(
                saveError.response?.data || {},
            )) {
                if (name in defaults) {
                    setError(name, {
                        message: Array.isArray(messages)
                            ? messages.join(" ")
                            : String(messages),
                    });
                    firstField ??= name;
                }
            }
            if (firstField) {
                const fieldStep = sections.findIndex(([, names]) =>
                    names.includes(firstField),
                );
                if (fieldStep >= 0) setStep(fieldStep);
                requestAnimationFrame(() => setFocus(firstField));
            }
        } finally {
            setBusy(false);
            setProgress(null);
        }
    };
    const invalid = (formErrors) => {
        const first = sections.findIndex(([, names]) =>
            names.some((name) => formErrors[name]),
        );
        if (first >= 0) {
            setStep(first);
            requestAnimationFrame(() => setFocus(Object.keys(formErrors)[0]));
        }
        setFormError("فیلدهای مشخص‌شده را اصلاح کنید.");
    };
    const goToStep = async (index) => {
        if (busy || validating) return;
        if (index > step) {
            for (let previous = 0; previous < index; previous++) {
                if (
                    !(await trigger(sections[previous][1], {
                        shouldFocus: true,
                    }))
                ) {
                    setStep(previous);
                    requestAnimationFrame(() => {
                        const name = sections[previous][1].find(
                            (fieldName) => getFieldState(fieldName).invalid,
                        );
                        if (name) setFocus(name);
                    });
                    return;
                }
            }
        }
        setStep(index);
        setFurthestStep((previous) => Math.max(previous, index));
    };
    const next = () => goToStep(Math.min(step + 1, 5));
    const questions = [
        "برند و مدل خودروی شما چیست؟",
        "مشخصات و وضعیت خودرو را وارد کنید",
        "قیمت و توضیحات آگهی را مشخص کنید",
        "خودرو در کدام شهر است؟",
        "تصاویر خودرو را اضافه کنید",
        "اطلاعات آگهی را بررسی کنید",
    ];
    const summaries = [
        [
            brands.data?.find((row) => String(row.id) === String(values.brand))
                ?.name,
            models.data?.find(
                (row) => String(row.id) === String(values.car_model),
            )?.name,
        ]
            .filter(Boolean)
            .join("، "),
        values.mileage &&
        Number.isFinite(Number(normalizeDigits(values.mileage)))
            ? `${toPersianNumber(Number(normalizeDigits(values.mileage)))} کیلومتر`
            : "",
        values.title,
        cities.data?.find((row) => String(row.id) === String(values.city))
            ?.name,
        images.length ? `${toPersianNumber(images.length)} تصویر` : "",
        "ذخیره یا ارسال برای بررسی",
    ];

    return (
        <div className="create-listing-page">
            <div className="kc-container">
                <div className="create-listing-page__heading">
                    <h1>{initial ? "ویرایش آگهی خودرو" : "ثبت آگهی خودرو"}</h1>
                    <Link to="/dashboard/listings">
                        <ArrowRight size={18} aria-hidden="true" />
                        آگهی‌های من
                    </Link>
                </div>
                {initial?.rejection_reason && (
                    <p role="status">
                        نظر بررسی‌کننده: {initial.rejection_reason}
                    </p>
                )}
                <div className="listing-editor-layout">
                    <aside
                        className="listing-editor-sidebar"
                        aria-label="مراحل ثبت آگهی"
                    >
                        <p className="listing-editor-sidebar__title">
                            مراحل فروش خودرو
                        </p>
                        <nav
                            className="listing-stepper"
                            aria-label="مراحل فرم آگهی"
                        >
                            {sections.map(([title], index) => (
                                <button
                                    type="button"
                                    key={title}
                                    className={`listing-stepper__item ${index === step ? "listing-stepper__item--active" : ""}`}
                                    disabled={
                                        index > furthestStep ||
                                        busy ||
                                        validating
                                    }
                                    onClick={() => goToStep(index)}
                                    aria-current={
                                        index === step ? "step" : undefined
                                    }
                                >
                                    <span
                                        className="listing-stepper__number"
                                        aria-hidden="true"
                                    >
                                        {index < step ? (
                                            <Check size={16} />
                                        ) : (
                                            toPersianNumber(index + 1)
                                        )}
                                    </span>
                                    <span className="listing-stepper__copy">
                                        <strong>{title}</strong>
                                        {summaries[index] && (
                                            <small>{summaries[index]}</small>
                                        )}
                                    </span>
                                    {index === step && (
                                        <Circle
                                            className="listing-stepper__current"
                                            size={8}
                                            fill="currentColor"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            ))}
                        </nav>
                        <p className="listing-editor-sidebar__note">
                            <ShieldCheck size={19} aria-hidden="true" />
                            آگهی پس از بررسی منتشر می‌شود. ذخیرهٔ پیش‌نویس به
                            معنی انتشار نیست.
                        </p>
                    </aside>
                    <div className="listing-editor-content">
                        <div className="listing-editor-progress">
                            <span>
                                مرحلهٔ {toPersianNumber(step + 1)} از{" "}
                                {toPersianNumber(sections.length)}
                            </span>
                            <strong>{sections[step][0]}</strong>
                            <progress
                                max={sections.length}
                                value={step + 1}
                                aria-label="مرحلهٔ فعلی ثبت آگهی"
                            />
                        </div>
                        <QueryStatus query={options}>
                            <QueryStatus query={brands}>
                                <QueryStatus query={cities}>
                                    <form
                                        noValidate
                                        onSubmit={(event) =>
                                            handleSubmit(save, invalid)(event)
                                        }
                                        className="listing-form-card"
                                    >
                                        <fieldset
                                            disabled={busy || validating}
                                            className="border-0 p-0"
                                        >
                                            <legend className="visually-hidden">
                                                {sections[step][0]}
                                            </legend>
                                            {error && (
                                                <p role="alert">{error}</p>
                                            )}
                                            <h2
                                                className="listing-editor-question"
                                                ref={headingRef}
                                                tabIndex={-1}
                                            >
                                                {questions[step]}
                                            </h2>
                                            <div className="row">
                                                {step === 0 && (
                                                    <>
                                                        <BrandPicker
                                                            rows={
                                                                brands.data ||
                                                                []
                                                            }
                                                            value={values.brand}
                                                            register={register}
                                                            error={errors.brand}
                                                            onChange={() => {
                                                                setValue(
                                                                    "car_model",
                                                                    "",
                                                                    {
                                                                        shouldDirty: true,
                                                                    },
                                                                );
                                                                setValue(
                                                                    "trim",
                                                                    "",
                                                                    {
                                                                        shouldDirty: true,
                                                                    },
                                                                );
                                                            }}
                                                        />
                                                        {values.brand && (
                                                            <div className="col-12 listing-editor-vehicle-fields">
                                                                <h3>
                                                                    مدل، تیپ و
                                                                    سال ساخت
                                                                </h3>
                                                                <p>
                                                                    مدل‌های
                                                                    موجود بر
                                                                    اساس برند
                                                                    انتخاب‌شده
                                                                    نمایش داده
                                                                    می‌شوند.
                                                                </p>
                                                            </div>
                                                        )}
                                                        {values.brand && (
                                                            <>
                                                                {field(
                                                                    "car_model",
                                                                    "مدل خودرو",
                                                                    {
                                                                        query: models,
                                                                        disabled:
                                                                            !values.brand,
                                                                        onChange:
                                                                            () =>
                                                                                setValue(
                                                                                    "trim",
                                                                                    "",
                                                                                ),
                                                                    },
                                                                )}
                                                                {field(
                                                                    "trim",
                                                                    "تیپ خودرو (اختیاری)",
                                                                    {
                                                                        query: trims,
                                                                        disabled:
                                                                            !values.car_model,
                                                                    },
                                                                )}
                                                                {field(
                                                                    "production_year",
                                                                    "سال ساخت",
                                                                    {
                                                                        inputMode:
                                                                            "numeric",
                                                                    },
                                                                )}
                                                                <p>
                                                                    نوع سوخت و
                                                                    گیربکس از
                                                                    تیپ
                                                                    انتخاب‌شده
                                                                    دریافت
                                                                    می‌شود.
                                                                </p>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                {step === 1 && (
                                                    <>
                                                        {field(
                                                            "mileage",
                                                            "کارکرد (کیلومتر)",
                                                            {
                                                                inputMode:
                                                                    "numeric",
                                                            },
                                                        )}
                                                        {field(
                                                            "color",
                                                            "رنگ بدنه",
                                                        )}
                                                        {field(
                                                            "body_status",
                                                            "وضعیت بدنه",
                                                            {
                                                                choices:
                                                                    options.data
                                                                        ?.body_statuses,
                                                            },
                                                        )}
                                                        {field(
                                                            "body_note",
                                                            "توضیحات وضعیت بدنه",
                                                            { multiline: true },
                                                        )}
                                                    </>
                                                )}
                                                {step === 2 && (
                                                    <>
                                                        {field(
                                                            "title",
                                                            "عنوان آگهی",
                                                        )}
                                                        {field(
                                                            "description",
                                                            "توضیحات خودرو",
                                                            { multiline: true },
                                                        )}
                                                        {field(
                                                            "price_type",
                                                            "نحوه اعلام قیمت",
                                                            {
                                                                choices:
                                                                    options.data
                                                                        ?.price_types,
                                                            },
                                                        )}
                                                        {values.price_type !==
                                                            "contact" &&
                                                            field(
                                                                "price",
                                                                "قیمت کل (تومان)",
                                                                {
                                                                    inputMode:
                                                                        "numeric",
                                                                },
                                                            )}
                                                        {values.price_type ===
                                                            "installment" && (
                                                            <>
                                                                {field(
                                                                    "down_payment",
                                                                    "پیش‌پرداخت (تومان)",
                                                                    {
                                                                        inputMode:
                                                                            "numeric",
                                                                    },
                                                                )}
                                                                {field(
                                                                    "installment_amount",
                                                                    "مبلغ هر قسط (تومان)",
                                                                    {
                                                                        inputMode:
                                                                            "numeric",
                                                                    },
                                                                )}
                                                                {field(
                                                                    "installment_count",
                                                                    "تعداد اقساط",
                                                                    {
                                                                        inputMode:
                                                                            "numeric",
                                                                    },
                                                                )}
                                                                {field(
                                                                    "installment_description",
                                                                    "توضیحات اقساط",
                                                                    {
                                                                        multiline: true,
                                                                    },
                                                                )}
                                                            </>
                                                        )}
                                                        <label className="mb-3">
                                                            <input
                                                                type="checkbox"
                                                                {...register(
                                                                    "is_exchangeable",
                                                                )}
                                                            />{" "}
                                                            امکان معاوضه دارد
                                                        </label>
                                                    </>
                                                )}
                                                {step === 3 && (
                                                    <>
                                                        {field(
                                                            "city",
                                                            "شهر خودرو",
                                                            {
                                                                query: cities,
                                                                onChange: () =>
                                                                    setValue(
                                                                        "neighborhood",
                                                                        "",
                                                                    ),
                                                            },
                                                        )}
                                                        {field(
                                                            "neighborhood",
                                                            "محله (اختیاری)",
                                                            {
                                                                query: neighborhoods,
                                                                disabled:
                                                                    !values.city,
                                                            },
                                                        )}
                                                        {field(
                                                            "approximate_address",
                                                            "محدوده آدرس (اختیاری)",
                                                        )}
                                                    </>
                                                )}
                                                {step === 4 && (
                                                    <>
                                                        <p>
                                                            حداکثر{" "}
                                                            {
                                                                options.data
                                                                    ?.max_images
                                                            }{" "}
                                                            تصویر، هر فایل تا{" "}
                                                            {Math.round(
                                                                (options.data
                                                                    ?.max_image_size ||
                                                                    0) /
                                                                    1024 /
                                                                    1024,
                                                            )}{" "}
                                                            مگابایت؛ JPG، PNG یا
                                                            WEBP. اولین تصویر،
                                                            تصویر اصلی است.
                                                        </p>
                                                        <label
                                                            htmlFor="listing-images"
                                                            className="form-label"
                                                        >
                                                            افزودن تصاویر خودرو
                                                        </label>
                                                        <input
                                                            id="listing-images"
                                                            type="file"
                                                            accept=".jpg,.jpeg,.png,.webp"
                                                            multiple
                                                            onChange={addImages}
                                                            disabled={
                                                                images.length >=
                                                                options.data
                                                                    ?.max_images
                                                            }
                                                        />
                                                        <p role="status">
                                                            {validating
                                                                ? "در حال بررسی تصاویر…"
                                                                : `${images.length} تصویر انتخاب شده`}
                                                        </p>
                                                        <p>
                                                            فایل‌های انتخابی پس
                                                            از خروج از فرم
                                                            نگهداری نمی‌شوند. در
                                                            ویرایش، عکس‌های جدید
                                                            بعد از عکس‌های
                                                            ذخیره‌شده اضافه
                                                            می‌شوند؛ پس از ذخیره
                                                            می‌توانید ترتیب کل
                                                            عکس‌ها را تغییر
                                                            دهید.
                                                        </p>
                                                        {images.map(
                                                            (image, index) => (
                                                                <div
                                                                    key={
                                                                        image.id
                                                                    }
                                                                    className="col-6 col-md-3 mb-3"
                                                                >
                                                                    <img
                                                                        src={
                                                                            image.preview
                                                                        }
                                                                        alt={`تصویر ${index + 1}`}
                                                                        style={{
                                                                            width: "100%",
                                                                            height: 150,
                                                                            objectFit:
                                                                                "cover",
                                                                        }}
                                                                    />
                                                                    <div className="d-flex flex-wrap gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeImage(
                                                                                    image,
                                                                                )
                                                                            }
                                                                            aria-label={`حذف تصویر ${index + 1}`}
                                                                        >
                                                                            حذف
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                !index ||
                                                                                Boolean(
                                                                                    image.file,
                                                                                ) !==
                                                                                    Boolean(
                                                                                        images[
                                                                                            index -
                                                                                                1
                                                                                        ]
                                                                                            ?.file,
                                                                                    )
                                                                            }
                                                                            onClick={() =>
                                                                                move(
                                                                                    index,
                                                                                    -1,
                                                                                )
                                                                            }
                                                                            aria-label={`انتقال تصویر ${index + 1} به قبل`}
                                                                        >
                                                                            قبل
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                index ===
                                                                                    images.length -
                                                                                        1 ||
                                                                                Boolean(
                                                                                    image.file,
                                                                                ) !==
                                                                                    Boolean(
                                                                                        images[
                                                                                            index +
                                                                                                1
                                                                                        ]
                                                                                            ?.file,
                                                                                    )
                                                                            }
                                                                            onClick={() =>
                                                                                move(
                                                                                    index,
                                                                                    1,
                                                                                )
                                                                            }
                                                                            aria-label={`انتقال تصویر ${index + 1} به بعد`}
                                                                        >
                                                                            بعد
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </>
                                                )}
                                                {step === 5 && (
                                                    <div>
                                                        <h2>{values.title}</h2>
                                                        <p>
                                                            {values.description}
                                                        </p>
                                                        <dl>
                                                            {[
                                                                [
                                                                    "برند",
                                                                    brands.data?.find(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            String(
                                                                                item.id,
                                                                            ) ===
                                                                            values.brand,
                                                                    )?.name,
                                                                ],
                                                                [
                                                                    "مدل",
                                                                    models.data?.find(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            String(
                                                                                item.id,
                                                                            ) ===
                                                                            values.car_model,
                                                                    )?.name,
                                                                ],
                                                                [
                                                                    "تیپ",
                                                                    trims.data?.find(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            String(
                                                                                item.id,
                                                                            ) ===
                                                                            values.trim,
                                                                    )?.name,
                                                                ],
                                                                [
                                                                    "شهر",
                                                                    cities.data?.find(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            String(
                                                                                item.id,
                                                                            ) ===
                                                                            values.city,
                                                                    )?.name,
                                                                ],
                                                                [
                                                                    "محله",
                                                                    neighborhoods.data?.find(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            String(
                                                                                item.id,
                                                                            ) ===
                                                                            values.neighborhood,
                                                                    )?.name,
                                                                ],
                                                                [
                                                                    "رنگ",
                                                                    values.color,
                                                                ],
                                                                [
                                                                    "وضعیت بدنه",
                                                                    options.data
                                                                        ?.body_statuses[
                                                                        values
                                                                            .body_status
                                                                    ],
                                                                ],
                                                            ]
                                                                .filter(
                                                                    ([
                                                                        ,
                                                                        value,
                                                                    ]) => value,
                                                                )
                                                                .map(
                                                                    ([
                                                                        label,
                                                                        value,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                label
                                                                            }
                                                                        >
                                                                            <dt>
                                                                                {
                                                                                    label
                                                                                }
                                                                            </dt>
                                                                            <dd>
                                                                                {
                                                                                    value
                                                                                }
                                                                            </dd>
                                                                        </div>
                                                                    ),
                                                                )}
                                                        </dl>
                                                        {initial?.status ===
                                                            "published" && (
                                                            <p>
                                                                ویرایش این آگهی،
                                                                آن را برای بررسی
                                                                مجدد از نمایش
                                                                عمومی خارج
                                                                می‌کند.
                                                            </p>
                                                        )}
                                                        <div className="row g-2">
                                                            {images.map(
                                                                (
                                                                    image,
                                                                    index,
                                                                ) => (
                                                                    <div
                                                                        className="col-4"
                                                                        key={
                                                                            image.id
                                                                        }
                                                                    >
                                                                        <img
                                                                            src={
                                                                                image.preview
                                                                            }
                                                                            alt={`پیش‌نمایش تصویر ${index + 1}`}
                                                                            style={{
                                                                                width: "100%",
                                                                                height: 100,
                                                                                objectFit:
                                                                                    "cover",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                        <p>
                                                            {
                                                                values.production_year
                                                            }{" "}
                                                            — {values.mileage}{" "}
                                                            کیلومتر
                                                        </p>
                                                        <p>
                                                            {values.price_type ===
                                                            "contact"
                                                                ? "تماس بگیرید"
                                                                : `${new Intl.NumberFormat("fa-IR").format(Number(values.price))} تومان`}
                                                        </p>
                                                        <p>
                                                            {images.length}{" "}
                                                            تصویر
                                                        </p>
                                                        <p>
                                                            ذخیرهٔ پیش‌نویس آن
                                                            را منتشر نمی‌کند. پس
                                                            از ارسال برای بررسی،
                                                            نتیجه در آگهی‌های من
                                                            نمایش داده می‌شود.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="listing-editor-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary"
                                                    disabled={!step}
                                                    onClick={() =>
                                                        setStep((s) => s - 1)
                                                    }
                                                >
                                                    مرحله قبل
                                                </button>
                                                {step < 5 ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={next}
                                                    >
                                                        مرحله بعد
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="submit"
                                                            value="draft"
                                                            className="btn btn-outline-primary"
                                                        >
                                                            {initial &&
                                                            ![
                                                                "draft",
                                                                "needs_edit",
                                                            ].includes(
                                                                initial.status,
                                                            )
                                                                ? "ذخیره تغییرات"
                                                                : "ذخیره پیش‌نویس"}
                                                        </button>
                                                        {(!initial ||
                                                            [
                                                                "draft",
                                                                "needs_edit",
                                                                "published",
                                                            ].includes(
                                                                initial.status,
                                                            )) && (
                                                            <button
                                                                type="submit"
                                                                value="review"
                                                                className="btn btn-primary"
                                                            >
                                                                {initial?.status ===
                                                                "published"
                                                                    ? "ذخیره و ارسال مجدد برای بررسی"
                                                                    : "ذخیره و ارسال برای بررسی"}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary"
                                                    onClick={() =>
                                                        setResetOpen(true)
                                                    }
                                                >
                                                    حذف اطلاعات ذخیره‌نشده
                                                </button>
                                            </div>
                                        </fieldset>
                                        {busy && (
                                            <p role="status">
                                                {progress === null
                                                    ? "در حال ذخیره…"
                                                    : `ارسال فایل‌ها: ${progress}٪؛ منتظر تأیید سرور بمانید.`}
                                            </p>
                                        )}
                                    </form>
                                </QueryStatus>
                            </QueryStatus>
                        </QueryStatus>
                    </div>
                </div>
                {blocker.state === "blocked" && (
                    <ConfirmDialog
                        title="خروج از فرم آگهی؟"
                        pending={busy}
                        onCancel={() => blocker.reset()}
                        onConfirm={() => blocker.proceed()}
                        confirmLabel="خروج از فرم"
                    >
                        <p>
                            متن فرم در همین مرورگر حفظ می‌شود، اما عکس‌های جدیدی
                            که هنوز ذخیره نشده‌اند از دست می‌روند.
                        </p>
                    </ConfirmDialog>
                )}
                {resetOpen && (
                    <ConfirmDialog
                        title="حذف اطلاعات ذخیره‌نشده؟"
                        onCancel={() => setResetOpen(false)}
                        onConfirm={() => {
                            sessionStorage.removeItem(draftKey);
                            allowNavigation();
                            navigate("/dashboard/listings");
                        }}
                        confirmLabel="حذف و بازگشت"
                    >
                        <p>اطلاعات ذخیره‌شده روی سرور حذف نمی‌شود.</p>
                    </ConfirmDialog>
                )}
            </div>
        </div>
    );
}
