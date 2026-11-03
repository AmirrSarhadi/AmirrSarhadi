import { useEffect, useMemo, useState } from "react";
import { FaChartLine, FaCheckCircle, FaEye, FaEyeSlash, FaKey, FaLock, FaShieldAlt, FaUserAlt } from "react-icons/fa";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./Login.module.css";

export default function Login() {
    const { login, verifyOtp, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    const [step, setStep] = useState("credentials");
    const [loginToken, setLoginToken] = useState("");
    const [otpDebug, setOtpDebug] = useState("");
    const [otpRemaining, setOtpRemaining] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({
        username: "",
        password: "",
        otpCode: "",
    });

    const [submitting, setSubmitting] = useState(false);

    const [lockout, setLockout] = useState({
        active: false,
        message: "",
        remainingSeconds: 0,
        lockedUntil: null,
    });

    const redirectPath =
        location.state?.from?.pathname
            ? `${location.state.from.pathname}${location.state.from.search || ""}`
            : "/dashboard";

    const isLocked = lockout.active && lockout.remainingSeconds > 0;

    const formattedRemaining = useMemo(() => {
        const total = Math.max(0, Number(lockout.remainingSeconds || 0));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [lockout.remainingSeconds]);

    useEffect(() => {
        if (!isLocked) return undefined;

        const timerId = window.setInterval(() => {
            setLockout((prev) => {
                const nextSeconds = Math.max(0, Number(prev.remainingSeconds || 0) - 1);

                if (nextSeconds <= 0) {
                    return {
                        active: false,
                        message: "",
                        remainingSeconds: 0,
                        lockedUntil: null,
                    };
                }

                return {
                    ...prev,
                    remainingSeconds: nextSeconds,
                };
            });
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [isLocked]);

    useEffect(() => {
        if (step !== "otp" || otpRemaining <= 0) return undefined;

        const timerId = window.setInterval(() => {
            setOtpRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [step, otpRemaining]);

    const formattedOtpRemaining = useMemo(() => {
        const total = Math.max(0, Number(otpRemaining || 0));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [otpRemaining]);

    const redirectAfterLogin = () => {
        window.location.replace(redirectPath || "/dashboard");
    };

    if (!loading && isAuthenticated) {
        return <Navigate to={redirectPath || "/dashboard"} replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;

        const nextValue = name === "otpCode"
            ? value.replace(/\D/g, "").slice(0, 6)
            : value;

        setForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }));
    };

    const applyLockoutFromError = (error) => {
        if (error.status !== 429) return false;

        const remainingSeconds = Number(error.remainingSeconds || 0);

        setLockout({
            active: remainingSeconds > 0,
            message: error.message || "ورود موقتاً قفل شده است.",
            remainingSeconds,
            lockedUntil: error.lockedUntil || null,
        });

        return true;
    };

    const handleCredentialSubmit = async () => {
        if (isLocked) {
            toast.error("ورود موقتاً قفل است. تا پایان تایمر صبر کن.");
            return;
        }

        if (!form.username.trim() || !form.password.trim()) {
            toast.error("نام کاربری و رمز عبور را وارد کن.");
            return;
        }

        const data = await login({
            username: form.username.trim(),
            password: form.password,
        });

        setLockout({
            active: false,
            message: "",
            remainingSeconds: 0,
            lockedUntil: null,
        });

        if (data?.requires_otp) {
            setLoginToken(data.login_token);
            setOtpDebug(data.otp_debug || "");
            setOtpRemaining(Number(data.otp_expires_in || 300));
            setStep("otp");

            if (data.otp_debug) {
                toast.info(`کد تست: ${data.otp_debug}`);
            } else {
                toast.success("کد تایید ارسال شد.");
            }

            return;
        }

        toast.success("ورود موفق بود.");
        redirectAfterLogin();
    };

    const handleOtpSubmit = async () => {
        if (isLocked) {
            toast.error("ورود موقتاً قفل است. تا پایان تایمر صبر کن.");
            return;
        }

        const otpCode = form.otpCode.trim();

        if (otpRemaining <= 0) {
            toast.error("کد تایید منقضی شده است. دوباره وارد شوید.");
            goBackToCredentials();
            return;
        }

        if (!loginToken) {
            toast.error("درخواست ورود معتبر نیست. دوباره نام کاربری و رمز عبور را وارد کن.");
            goBackToCredentials();
            return;
        }

        if (!otpCode) {
            toast.error("کد تایید را وارد کن.");
            return;
        }

        if (otpCode.length !== 6) {
            toast.error("کد تایید باید ۶ رقم باشد.");
            return;
        }

        await verifyOtp({
            loginToken,
            otpCode,
        });

        setLockout({
            active: false,
            message: "",
            remainingSeconds: 0,
            lockedUntil: null,
        });

        toast.success("ورود موفق بود.");
        redirectAfterLogin();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) return;

        try {
            setSubmitting(true);

            if (step === "credentials") {
                await handleCredentialSubmit();
            } else {
                await handleOtpSubmit();
            }
        } catch (error) {
            const handledLockout = applyLockoutFromError(error);

            if (!handledLockout) {
                toast.error(error.message || "ورود ناموفق بود.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const goBackToCredentials = () => {
        setStep("credentials");
        setLoginToken("");
        setOtpDebug("");
        setOtpRemaining(0);
        setForm((prev) => ({
            ...prev,
            password: "",
            otpCode: "",
        }));
    };

    return (
        <div className={styles.page}>
            <div className={styles.visualPanel}>
                <div className={styles.visualBrand}>
                    <div className={styles.visualLogo}>آ</div>
                    <div><strong>حسابداری آرن</strong><span>سامانه یکپارچه مدیریت مالی</span></div>
                </div>
                <div className={styles.visualContent}>
                    <span className={styles.visualEyebrow}>مدیریت دقیق، تصمیم سریع‌تر</span>
                    <h2>تمام جریان مالی کسب‌وکار، در یک سیستم.</h2>
                    <p>حسابداری، خزانه، خرید، فروش، انبار و گزارش‌های مدیریتی در یک فضای امن و یکپارچه.</p>
                    <div className={styles.visualFeatures}>
                        <span><FaShieldAlt /> کنترل دسترسی و ثبت فعالیت‌ها</span>
                        <span><FaChartLine /> گزارش‌های مالی و مدیریتی</span>
                        <span><FaCheckCircle /> فرآیندهای یکپارچه و قابل ردیابی</span>
                    </div>
                </div>
                <div className={styles.visualGrid} aria-hidden="true" />
            </div>

            <div className={styles.loginSide}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <div className={styles.logo}>آ</div>

                    <div>
                        <h1>خوش آمدید</h1>
                        <p>
                            {step === "credentials"
                                ? "برای ادامه وارد حساب کاربری خود شوید."
                                : "کد تایید ۶ رقمی را وارد کنید."}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {isLocked && (
                        <div className={styles.lockBox}>
                            <strong>{lockout.message || "ورود موقتاً قفل شده است."}</strong>
                            <span>زمان باقی‌مانده: {formattedRemaining}</span>
                        </div>
                    )}

                    {step === "credentials" && (
                        <>
                            <label>
                                <span>نام کاربری</span>

                                <div className={styles.inputBox}>
                                    <FaUserAlt />
                                    <input
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                        placeholder="مثلاً admin"
                                        autoComplete="username"
                                        disabled={submitting || isLocked}
                                    />
                                </div>
                            </label>

                            <label>
                                <span>رمز عبور</span>

                                <div className={styles.inputBox}>
                                    <FaLock />
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="رمز عبور"
                                        autoComplete="current-password"
                                        disabled={submitting || isLocked}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                                        disabled={submitting}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </label>
                        </>
                    )}

                    {step === "otp" && (
                        <>
                            <div className={styles.hintBox}>
                                <span>
                                    کد تایید ۶ رقمی را وارد کنید. زمان باقی‌مانده: {formattedOtpRemaining}
                                </span>

                                {otpRemaining <= 0 && (
                                    <strong>کد منقضی شده است؛ به مرحله ورود برگردید.</strong>
                                )}

                                {otpDebug && (
                                    <strong>
                                        کد تست در حالت توسعه: {otpDebug}
                                    </strong>
                                )}
                            </div>

                            <label>
                                <span>کد تایید</span>

                                <div className={styles.inputBox}>
                                    <FaKey />
                                    <input
                                        name="otpCode"
                                        value={form.otpCode}
                                        onChange={handleChange}
                                        placeholder="کد ۶ رقمی"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        disabled={submitting || isLocked || otpRemaining <= 0}
                                        autoFocus
                                    />
                                </div>
                            </label>

                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={goBackToCredentials}
                                disabled={submitting}
                            >
                                بازگشت و ورود دوباره
                            </button>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || loading || isLocked || (step === "otp" && otpRemaining <= 0)}
                    >
                        {submitting
                            ? "در حال بررسی..."
                            : step === "credentials"
                                ? "ادامه"
                                : "تایید و ورود"}
                    </button>
                </form>
            </div>
            <div className={styles.securityNote}><FaShieldAlt /> ورود امن با تایید دومرحله‌ای</div>
            </div>
        </div>
    );
}