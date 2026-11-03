import useUnsavedGuard from "../../hooks/useUnsavedGuard";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import CitySelect from "../../components/forms/CitySelect";
import {
    BadgeCheck,
    Hash,
    LoaderCircle,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    zodResolver,
} from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { profileSchema } from "../../features/auth/profileSchema";
import { updateProfile } from "../../services/authService";
import useAuthStore from "../../store/authStore";

import "./ProfilePage.scss";

function ProfilePage() {
    const user = useAuthStore(
        (state) => state.user,
    );

    const [serverError, setServerError] = useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const {
        register,
        reset,
        setError,
        handleSubmit,
        formState: {
            errors,
            isDirty,
        },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName ?? "",
            lastName: user?.lastName ?? "",
            nationalCode: user?.nationalCode ?? "",
            city: user?.city ?? "",
            email: user?.email ?? "",
        },
    });

    const { blocker } = useUnsavedGuard(isDirty || isSubmitting);

    const submitHandler = async (profileData) => {
        setServerError("");
        setIsSubmitting(true);

        try {
            const result = await updateProfile({
                profileData,
            });

            reset({
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                nationalCode: result.user.nationalCode,
                city: result.user.city,
                email: result.user.email,
            });

            toast.success(
                "اطلاعات حساب با موفقیت ذخیره شد.",
            );
        } catch (error) {
            setServerError(error.message);
            const names = { first_name: "firstName", last_name: "lastName", national_id: "nationalCode", city: "city", email: "email" };
            let first = true;
            for (const [key, field] of Object.entries(names)) {
                const messages = error.response?.data?.[key];
                if (!messages) continue;
                setError(field, { type: "server", message: Array.isArray(messages) ? messages.join(" ") : String(messages) }, { shouldFocus: first });
                first = false;
            }
            toast.error(
                error.message ||
                "ذخیره اطلاعات انجام نشد.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const fullName =
        `${user?.firstName ?? ""} ${user?.lastName ?? ""
            }`.trim();

    const initials = [
        user?.firstName?.[0],
        user?.lastName?.[0],
    ]
        .filter(Boolean)
        .join("");

    return (
        <div className="profile-page">
            <div className="profile-page__heading">
                <span>مدیریت حساب کاربری</span>

                <h1>اطلاعات حساب</h1>

                <p>
                    اطلاعات شخصی و هویتی خود را مشاهده و ویرایش
                    کنید.
                </p>
            </div>

            <div className="profile-page__layout">
                <aside className="profile-summary">
                    <div className="profile-summary__avatar">
                        {initials || <UserRound size={35} />}
                    </div>

                    <h2>{fullName || "کاربر KERMAN.CARS"}</h2>

                    <span dir="ltr">{user?.phone}</span>

                    <div className="profile-summary__verified">
                        <BadgeCheck size={17} />
                        شماره موبایل تأییدشده
                    </div>

                    <div className="profile-summary__info">
                        <div>
                            <span>نوع حساب</span>
                            <strong>کاربر عمومی</strong>
                        </div>

                        <div>
                            <span>وضعیت پروفایل</span>
                            <strong>تکمیل‌شده</strong>
                        </div>

                        <div>
                            <span>شهر</span>
                            <strong>{user?.cityName || "-"}</strong>
                        </div>
                    </div>
                </aside>

                <main className="profile-form-card">
                    <div className="profile-form-card__heading">
                        <div>
                            <h2>مشخصات شخصی</h2>

                            <p>
                                این اطلاعات برای ثبت و مدیریت آگهی‌ها
                                استفاده می‌شود.
                            </p>
                        </div>

                        <ShieldCheck size={24} />
                    </div>

                    {serverError && <p role="alert">{serverError}</p>}

            <form noValidate
                        onSubmit={handleSubmit(submitHandler)}
                    >
                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="firstName"
                                        className="form-label"
                                    >
                                        نام
                                    </label>

                                    <div className="profile-field__input">
                                        <UserRound size={18} />

                                        <input
                                            id="firstName"
                                            type="text"
                                            className="form-control"
                                            aria-invalid={Boolean(errors.firstName)}
                                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                                    {...register("firstName")}
                                        />
                                    </div>

                                    {errors.firstName && (
                                        <span id="firstName-error" className="profile-field__error">
                                            {errors.firstName.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="lastName"
                                        className="form-label"
                                    >
                                        نام خانوادگی
                                    </label>

                                    <div className="profile-field__input">
                                        <UserRound size={18} />

                                        <input
                                            id="lastName"
                                            type="text"
                                            className="form-control"
                                            aria-invalid={Boolean(errors.lastName)}
                                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                                    {...register("lastName")}
                                        />
                                    </div>

                                    {errors.lastName && (
                                        <span id="lastName-error" className="profile-field__error">
                                            {errors.lastName.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="nationalCode"
                                        className="form-label"
                                    >
                                        کد ملی
                                    </label>

                                    <div className="profile-field__input">
                                        <Hash size={18} />

                                        <input
                                            id="nationalCode"
                                    readOnly={Boolean(user?.nationalCode)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={10}
                                            dir="ltr"
                                            className="form-control"
                                            aria-invalid={Boolean(errors.nationalCode)}
                                    aria-describedby={errors.nationalCode ? "nationalCode-error" : undefined}
                                    {...register("nationalCode")}
                                        />
                                    </div>

                                    {errors.nationalCode && (
                                        <span id="nationalCode-error" className="profile-field__error">
                                            {errors.nationalCode.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="phone"
                                        className="form-label"
                                    >
                                        شماره موبایل
                                    </label>

                                    <div className="profile-field__input">
                                        <Phone size={18} />

                                        <input
                                            id="phone"
                                            type="text"
                                            dir="ltr"
                                            disabled
                                            value={user?.phone ?? ""}
                                            className="form-control"
                                        />
                                    </div>

                                    <small className="profile-field__hint">
                                        شماره موبایل قابل ویرایش نیست.
                                    </small>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="city"
                                        className="form-label"
                                    >
                                        شهر محل سکونت
                                    </label>

                                    <div className="profile-field__input">
                                        <MapPin size={18} />

                                <CitySelect
                                    id="city"
                                    className="form-select"
                                    registration={register("city")}
                                    error={errors.city?.message}
                                />
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="profile-field">
                                    <label
                                        htmlFor="email"
                                        className="form-label"
                                    >
                                        ایمیل
                                        <small>اختیاری</small>
                                    </label>

                                    <div className="profile-field__input">
                                        <Mail size={18} />

                                        <input
                                            id="email"
                                            type="email"
                                            dir="ltr"
                                            className="form-control"
                                            placeholder="شماره تماس"
                                            aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    {...register("email")}
                                        />
                                    </div>

                                    {errors.email && (
                                        <span id="email-error" className="profile-field__error">
                                            {errors.email.message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="profile-form-card__footer">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={
                                    isSubmitting || !isDirty
                                }
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoaderCircle
                                            size={18}
                                            className="listing-spin"
                                        />
                                        در حال ذخیره
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        ذخیره تغییرات
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
            {blocker.state === "blocked" && (
                <ConfirmDialog title="خروج بدون ذخیره؟" confirmLabel="خروج بدون ذخیره" pending={isSubmitting} onCancel={() => blocker.reset()} onConfirm={() => blocker.proceed()}>
                    <p>تغییرات ذخیره‌نشدهٔ اطلاعات حساب از دست می‌روند.</p>
                </ConfirmDialog>
            )}
        </div>
    );
}

export default ProfilePage;