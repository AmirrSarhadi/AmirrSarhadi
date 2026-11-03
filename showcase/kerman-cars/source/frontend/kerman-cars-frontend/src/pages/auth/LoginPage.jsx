import {
    ArrowLeft,
    LoaderCircle,
    Smartphone,
} from "lucide-react";
import { useState } from "react";
import {
    useForm,
} from "react-hook-form";
import {
    zodResolver,
} from "@hookform/resolvers/zod";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import { phoneLoginSchema } from "../../features/auth/authSchemas";
import { sendOtp } from "../../services/authService";

import "./AuthPages.scss";

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [serverError, setServerError] = useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        },
    } = useForm({
        resolver: zodResolver(phoneLoginSchema),
        defaultValues: {
            phone: "",
        },
    });

    const submitHandler = async ({ phone }) => {
        setServerError("");
        setIsSubmitting(true);

        try {
            await sendOtp(phone);

            toast.success("کد تأیید ارسال شد.");

            navigate("/auth/verify-otp", {
                state: {
                    phone,
                    from:
                        location.state?.from ?? "/dashboard",
                },
            });
        } catch (error) {
            setServerError(error.message);
            toast.error(
                error.message ||
                "ارسال کد تأیید انجام نشد.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="auth-card">
            <div className="auth-card__icon">
                <Smartphone size={28} />
            </div>

            <div className="auth-card__heading">
                <h1>ورود یا ثبت‌نام</h1>

                <p>
                    شماره موبایل خود را وارد کنید تا کد تأیید
                    برایتان ارسال شود.
                </p>
            </div>

            {serverError && <p role="alert">{serverError}</p>}

            <form noValidate onSubmit={handleSubmit(submitHandler)}>
                <div className="auth-field">
                    <label
                        htmlFor="phone"
                        className="form-label"
                    >
                        شماره موبایل
                    </label>

                    <div className="auth-field__input">
                        <Smartphone size={18} />

                        <input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            className={`form-control ${errors.phone ? "is-invalid" : ""
                                }`}
                            placeholder="شماره موبایل"
                            dir="ltr"
                            aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        {...register("phone")}
                        />
                    </div>

                    {errors.phone && (
                        <span id="phone-error" className="auth-field__error">
                            {errors.phone.message}
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
                            در حال ارسال کد
                        </>
                    ) : (
                        <>
                            ادامه
                            <ArrowLeft size={19} />
                        </>
                    )}
                </button>
            </form>


        </section>
    );
}

export default LoginPage;