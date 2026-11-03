import {
    ArrowLeft,
    KeyRound,
    LoaderCircle,
    Pencil,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    useForm,
} from "react-hook-form";
import {
    zodResolver,
} from "@hookform/resolvers/zod";
import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import { otpSchema } from "../../features/auth/authSchemas";
import {
    sendOtp,
    verifyOtp,
} from "../../services/authService";
import useAuthStore from "../../store/authStore";

import "./AuthPages.scss";

const RESEND_DURATION = 60;

function VerifyOtpPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const login = useAuthStore(
        (state) => state.login,
    );

    const phone =
        location.state?.phone ||
        sessionStorage.getItem(
            "kc_pending_phone",
        );

    const destination =
        location.state?.from || "/dashboard";

    const [remainingTime, setRemainingTime] =
        useState(RESEND_DURATION);

    const [serverError, setServerError] = useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [isResending, setIsResending] =
        useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: {
            errors,
        },
    } = useForm({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            code: "",
        },
    });

    useEffect(() => {
        if (!phone) {
            navigate("/auth/login", {
                replace: true,
            });
        }
    }, [navigate, phone]);

    useEffect(() => {
        if (remainingTime <= 0) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setRemainingTime((currentValue) =>
                Math.max(currentValue - 1, 0),
            );
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [remainingTime]);

    const submitHandler = async ({ code }) => {
        if (!phone) {
            return;
        }

        setServerError("");
        setIsSubmitting(true);

        try {
            const result = await verifyOtp({
                phone,
                code,
            });

            login(result);

            if (result.user.role === "ADMIN") {
                toast.success(
                    "با موفقیت وارد پنل مدیریت شدید.",
                );

                navigate("/admin", {
                    replace: true,
                });

                return;
            }

            if (result.needsProfileCompletion) {
                navigate("/auth/complete-profile", {
                    state: { from: destination },
                    replace: true,
                });

                return;
            }

            toast.success("با موفقیت وارد شدید.");

            navigate(destination, {
                replace: true,
            });
        } catch (error) {
            setServerError(error.message);
            toast.error(
                error.message ||
                "کد تأیید صحیح نیست.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const resendOtp = async () => {
        if (
            remainingTime > 0 ||
            !phone ||
            isResending
        ) {
            return;
        }

        setIsResending(true);

        try {
            await sendOtp(phone);

            setRemainingTime(RESEND_DURATION);
            setValue("code", "");

            toast.success(
                "کد تأیید دوباره ارسال شد.",
            );
        } catch (error) {
            setServerError(error.message);
            toast.error(
                error.message ||
                "ارسال مجدد کد انجام نشد.",
            );
        } finally {
            setIsResending(false);
        }
    };

    if (!phone) {
        return null;
    }

    return (
        <section className="auth-card">
            <div className="auth-card__icon">
                <KeyRound size={28} />
            </div>

            <div className="auth-card__heading">
                <h1>تأیید شماره موبایل</h1>

                <p>
                    کد شش‌رقمی ارسال‌شده به شماره{" "}
                    <span className="auth-card__phone">
                        {phone}
                    </span>{" "}
                    را وارد کنید.
                </p>
            </div>

            {serverError && <p role="alert">{serverError}</p>}

            <form noValidate onSubmit={handleSubmit(submitHandler)}>
                <div className="auth-field">
                    <label
                        htmlFor="otp-code"
                        className="form-label"
                    >
                        کد تأیید
                    </label>

                    <input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        className="otp-input"
                        placeholder="------"
                        aria-invalid={Boolean(errors.code)}
                        aria-describedby={errors.code ? "code-error" : undefined}
                        {...register("code")}
                    />

                    {errors.code && (
                        <span id="code-error" className="auth-field__error">
                            {errors.code.message}
                        </span>
                    )}
                </div>

                <div className="otp-actions">
                    <button
                        type="button"
                        disabled={
                            remainingTime > 0 || isResending
                        }
                        onClick={resendOtp}
                    >
                        {isResending
                            ? "در حال ارسال"
                            : "ارسال مجدد کد"}
                    </button>

                    {remainingTime > 0 && (
                        <span>
                            امکان ارسال مجدد تا{" "}
                            {new Intl.NumberFormat(
                                "fa-IR",
                            ).format(remainingTime)}{" "}
                            ثانیه دیگر
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
                            در حال بررسی
                        </>
                    ) : (
                        <>
                            تأیید و ادامه
                            <ArrowLeft size={19} />
                        </>
                    )}
                </button>
            </form>

            <Link
                to="/auth/login"
                className="d-inline-flex align-items-center gap-2 mt-3 text-primary fw-bold"
            >
                <Pencil size={15} />
                ویرایش شماره موبایل
            </Link>
        </section>
    );
}

export default VerifyOtpPage;