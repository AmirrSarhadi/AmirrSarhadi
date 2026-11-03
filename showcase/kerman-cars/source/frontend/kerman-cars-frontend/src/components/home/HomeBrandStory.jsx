import { Link } from "react-router-dom";
import {
    ArrowLeft,
    BadgeCheck,
    Columns3,
    MessageCircle,
    Flag,
    ShieldCheck,
} from "lucide-react";
import processImage from "../../assets/images/kerman-sale-process.webp";
import "./HomeEditorial.scss";
const steps = [
    [
        "مشخصات خودرو را ثبت کن",
        "برند، مدل، کارکرد و قیمت خودرو را وارد کن و پیش‌نویس آگهی‌ات را بساز.",
        "top-right",
    ],
    [
        "تصاویر را اضافه کن و بفرست",
        "با عکس‌های روشن و اطلاعات کامل، آگهی را برای بررسی و انتشار ارسال کن.",
        "top-left",
    ],
    [
        "با خریدار ارتباط بگیر",
        "پس از انتشار، دربارهٔ خودرو گفت‌وگو کنید و برای بازدید با هم هماهنگ شوید.",
        "bottom-right",
    ],
    [
        "با آگاهی به توافق برسید",
        "پس از بازدید، بررسی مدارک و کارشناسی مستقل، دربارهٔ شرایط معامله توافق کنید.",
        "bottom-left",
    ],
];
const reasons = [
    [
        BadgeCheck,
        "بررسی آگهی پیش از انتشار",
        "آگهی برای بررسی به مدیریت ارسال می‌شود. این بررسی جای کارشناسی فنی خودرو را نمی‌گیرد.",
    ],
    [
        Columns3,
        "مشخصات کنار هم، انتخاب روشن‌تر",
        "سال ساخت، کارکرد، قیمت و وضعیت خودروها را ببین و تا سه آگهی را کنار هم مقایسه کن.",
    ],
    [
        MessageCircle,
        "ارتباط مستقیم با فروشنده",
        "آگهی شخصی یا نمایشگاهی را پیدا کن و دربارهٔ بازدید و شرایط معامله مستقیم گفت‌وگو کن.",
    ],
    [
        Flag,
        "امکان گزارش آگهی مشکوک",
        "اگر اطلاعات یا رفتار مشکوکی دیدی، از داخل صفحهٔ آگهی برای مدیریت گزارش بفرست.",
    ],
];
export default function HomeBrandStory() {
    return (
        <>
            <section
                className="home-process kc-section"
                aria-labelledby="home-process-title"
            >
                <div className="kc-container">
                    <div className="home-section-heading">
                        <div>
                            <p className="home-editorial-label">
                                از اولین آگهی تا گفت‌وگوی واقعی
                            </p>
                            <h2 id="home-process-title">
                                فروش خودرو در کرمان کارز چطور پیش می‌رود؟
                            </h2>
                        </div>
                        <Link
                            to="/listing/create"
                            className="home-section-heading__link"
                        >
                            شروع ثبت آگهی{" "}
                            <ArrowLeft size={17} aria-hidden="true" />
                        </Link>
                    </div>
                    <ol className="home-process__steps">
                        {steps.map(([title, description, position], index) => (
                            <li key={title}>
                                <div
                                    className={`home-process__photo home-process__photo--${position}`}
                                    aria-hidden="true"
                                >
                                    <img
                                        src={processImage}
                                        alt=""
                                        loading="lazy"
                                        width="1280"
                                        height="853"
                                    />
                                </div>
                                <div className="home-process__body">
                                    <span
                                        className="home-process__number"
                                        aria-hidden="true"
                                    >
                                        {new Intl.NumberFormat("fa-IR").format(
                                            index + 1,
                                        )}
                                    </span>
                                    <h3>{title}</h3>
                                    <p>{description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
            <section
                className="home-reasons kc-section"
                aria-labelledby="home-reasons-title"
            >
                <div className="kc-container home-reasons__layout">
                    <div className="home-reasons__visual">
                        <div
                            className="home-process__photo home-process__photo--bottom-right"
                            aria-hidden="true"
                        >
                            <img
                                src={processImage}
                                alt=""
                                loading="lazy"
                                width="1280"
                                height="853"
                            />
                        </div>
                        <div className="home-reasons__promise">
                            <ShieldCheck size={25} aria-hidden="true" />
                            <p>
                                اعتماد، از اطلاعات روشن و بررسی دقیق شروع
                                می‌شود.
                            </p>
                        </div>
                    </div>
                    <div className="home-reasons__copy">
                        <p className="home-editorial-label">
                            برای بازار خودروی کرمان
                        </p>
                        <h2 id="home-reasons-title">
                            چرا از کرمان کارز شروع کنیم؟
                        </h2>
                        <p className="home-reasons__lead">
                            یک مسیر برای معرفی خودروی تو و پیدا کردن انتخاب
                            بعدی؛ با اطلاعات قابل مقایسه و ارتباط مستقیم.
                        </p>
                        <dl>
                            {reasons.map(([Icon, title, text]) => (
                                <div key={title}>
                                    <dt>
                                        <Icon size={21} aria-hidden="true" />
                                        {title}
                                    </dt>
                                    <dd>{text}</dd>
                                </div>
                            ))}
                        </dl>
                        <Link
                            to="/about"
                            className="home-section-heading__link"
                        >
                            بیشتر دربارهٔ کرمان کارز{" "}
                            <ArrowLeft size={17} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
