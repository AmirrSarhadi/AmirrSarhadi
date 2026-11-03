import CitySelect from "../../components/forms/CitySelect";
import { ArrowLeft, Hash, LoaderCircle, MapPin, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

import { completeProfileSchema } from "../../features/auth/authSchemas";
import { updateProfile } from "../../services/authService";
import useAuthStore from "../../store/authStore";

import "./AuthPages.scss";

function CompleteProfilePage() {
    const navigate = useNavigate();
    const location = useLocation();

    const user = useAuthStore((state) => state.user);

    const updateUser = useAuthStore((state) => state.updateUser);

    const [serverError, setServerError] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(completeProfileSchema),
        defaultValues: {
            firstName: user?.firstName ?? "",
            lastName: user?.lastName ?? "",
            nationalCode: user?.nationalCode ?? "",
            city: user?.city ?? "",
            acceptRules: false,
        },
    });

    const submitHandler = async (profileData) => {
        setServerError("");
        setIsSubmitting(true);

        try {
            const result = await updateProfile({
                profileData,
            });

            updateUser(result.user);

            toast.success("اطلاعات حساب شما تکمیل شد.");

            navigate(location.state?.from || "/dashboard", {
                replace: true,
            });
        } catch (error) {
            setServerError(error.message);
            toast.error(error.message || "تکمیل اطلاعات انجام نشد.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="auth-card">
            <div className="auth-card__icon">
                <UserRound size={28} />
            </div>

            <div className="auth-card__heading">
                <h1>تکمیل اطلاعات حساب</h1>

                <p>
                    برای ثبت آگهی لازم است اطلاعات هویتی اولیه خود را تکمیل
                    کنید.
                </p>
            </div>

            {serverError && <p role="alert">{serverError}</p>}

            <form noValidate onSubmit={handleSubmit(submitHandler)}>
                <div className="row g-3">
                    <div className="col-12 col-sm-6">
                        <div className="auth-field mb-0">
                            <label htmlFor="firstName" className="form-label">
                                نام
                            </label>

                            <div className="auth-field__input">
                                <UserRound size={18} />

                                <input
                                    id="firstName"
                                    type="text"
                                    className="form-control"
                                    placeholder="نام"
                                    aria-invalid={Boolean(errors.firstName)}
                                    aria-describedby={
                                        errors.firstName
                                            ? "firstName-error"
                                            : undefined
                                    }
                                    {...register("firstName")}
                                />
                            </div>

                            {errors.firstName && (
                                <span
                                    id="firstName-error"
                                    className="auth-field__error"
                                >
                                    {errors.firstName.message}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-12 col-sm-6">
                        <div className="auth-field mb-0">
                            <label htmlFor="lastName" className="form-label">
                                نام خانوادگی
                            </label>

                            <div className="auth-field__input">
                                <UserRound size={18} />

                                <input
                                    id="lastName"
                                    type="text"
                                    className="form-control"
                                    placeholder="نام خانوادگی"
                                    aria-invalid={Boolean(errors.lastName)}
                                    aria-describedby={
                                        errors.lastName
                                            ? "lastName-error"
                                            : undefined
                                    }
                                    {...register("lastName")}
                                />
                            </div>

                            {errors.lastName && (
                                <span
                                    id="lastName-error"
                                    className="auth-field__error"
                                >
                                    {errors.lastName.message}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="auth-field mb-0">
                            <label
                                htmlFor="nationalCode"
                                className="form-label"
                            >
                                کد ملی
                            </label>

                            <div className="auth-field__input">
                                <Hash size={18} />

                                <input
                                    id="nationalCode"
                                    readOnly={Boolean(user?.nationalCode)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={10}
                                    dir="ltr"
                                    className="form-control"
                                    placeholder="کد ملی ۱۰ رقمی"
                                    aria-invalid={Boolean(errors.nationalCode)}
                                    aria-describedby={
                                        errors.nationalCode
                                            ? "nationalCode-error"
                                            : undefined
                                    }
                                    {...register("nationalCode")}
                                />
                            </div>

                            {errors.nationalCode && (
                                <span
                                    id="nationalCode-error"
                                    className="auth-field__error"
                                >
                                    {errors.nationalCode.message}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="auth-field mb-0">
                            <label htmlFor="city" className="form-label">
                                شهر محل سکونت
                            </label>

                            <div className="auth-field__input">
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
                </div>

                <div className="mt-4">
                    <label className="auth-rules">
                        <input type="checkbox" {...register("acceptRules")} />

                        <span>
                            <Link
                                to="/terms"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="قوانین استفاده (صفحه جدید)"
                            >
                                قوانین استفاده
                            </Link>{" "}
                            و{" "}
                            <Link
                                to="/privacy"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="حریم خصوصی (صفحه جدید)"
                            >
                                حریم خصوصی KERMAN.CARS
                            </Link>{" "}
                            را مطالعه کرده‌ام و می‌پذیرم.
                        </span>
                    </label>

                    {errors.acceptRules && (
                        <span
                            id="acceptRules-error"
                            className="auth-field__error"
                        >
                            {errors.acceptRules.message}
                        </span>
                    )}
                </div>

                <button
                    type="submit"
                    className="btn btn-primary auth-card__submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <LoaderCircle
                                size={19}
                                className="spinner-border spinner-border-sm"
                            />
                            در حال ثبت اطلاعات
                        </>
                    ) : (
                        <>
                            تکمیل حساب
                            <ArrowLeft size={19} />
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}

export default CompleteProfilePage;
