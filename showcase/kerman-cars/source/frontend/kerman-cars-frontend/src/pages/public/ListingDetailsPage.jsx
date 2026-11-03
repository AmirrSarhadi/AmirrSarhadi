import usePageMetadata from "../../hooks/usePageMetadata";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { getListing, getRelatedListings } from "../../services/listingService";
import { recordInteraction } from "../../services/engagementService";
import ListingCard from "../../components/listing/ListingCard";
import QueryStatus from "../../components/shared/QueryStatus";
import ReportListing from "../../components/listing/ReportListing";
import useFavorite from "../../hooks/useFavorite";
import useAuthStore from "../../store/authStore";
import { useState } from "react";
import {
    BadgeCheck,
    CalendarDays,
    CarFront,
    Check,
    ChevronLeft,
    Eye,
    Fuel,
    Gauge,
    Heart,
    MapPin,
    MessageCircleWarning,
    Palette,
    Phone,
    Repeat2,
    Share2,
    ShieldCheck,
    Store,
    UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { emptyImage } from "../../services/listingData";
import { Navigation, Pagination, A11y, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import {
    formatMileage,
    formatPrice,
    toPersianNumber,
} from "../../utils/formatters";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import "./ListingDetailsPage.scss";

function ListingDetailsPage() {
    const { listingId } = useParams();
    const query = useQuery({
        queryKey: ["listing", listingId],
        queryFn: ({ signal }) => getListing(listingId, signal),
        retry: false,
    });
    if (query.error?.response?.status === 404) return <section className="kc-container py-5">
        <h1>این آگهی در دسترس نیست</h1><p>ممکن است آگهی حذف شده، فروخته شده یا زمان نمایش آن پایان یافته باشد.</p>
        <Link to="/cars" className="btn btn-primary">مشاهده آگهی‌های موجود</Link>
    </section>;
    return (
        <div className="kc-container py-3">
            <QueryStatus query={query}>
                {query.data && (
                    <ListingContent key={listingId} listing={query.data} />
                )}
            </QueryStatus>
            {query.isError && <Link to="/cars">بازگشت به آگهی‌ها</Link>}
        </div>
    );
}

function ListingContent({ listing }) {
    const publiclyVisible = listing.status === "published" && (!listing.expires_at || new Date(listing.expires_at) > new Date());
    usePageMetadata({
        title: `${listing.title} | کرمان کارز`,
        description: `${listing.title}، ${listing.city}؛ مشخصات و ارتباط مستقیم با فروشنده در کرمان کارز.`.slice(0, 160),
        path: `/cars/${encodeURIComponent(listing.slug)}`,
        noindex: !publiclyVisible,
    });
    const { isFavorite, pending, toggle } = useFavorite(listing);
    const navigate = useNavigate();
    const location = useLocation();
    const requestedReturn = location.state?.returnTo;
    const returnTo = typeof requestedReturn === "string" && /^\/cars(?:\?[^#]*)?$/.test(requestedReturn) ? requestedReturn : "/cars";
    const authenticated = useAuthStore((s) => s.isAuthenticated);
    const [reportOpen, setReportOpen] = useState(false);
    const revealPhone = async () => {
        if (!listing.seller.phone) {
            navigate(authenticated ? "/auth/complete-profile" : "/auth/login", {
                state: { from: location.pathname },
            });
            return;
        }
        setIsPhoneVisible(true);
        try {
            await recordInteraction(listing.id, "phone_reveal");
        } catch {
            /* Contact remains usable if analytics fail. */
        }
    };
    const call = () => {
        recordInteraction(listing.id, "call_click").catch(() => {});
    };
    const [isPhoneVisible, setIsPhoneVisible] = useState(false);

    if (!listing) {
        return (
            <div className="kc-container py-5">
                <div className="listing-detail-not-found">
                    <CarFront size={42} />

                    <h1>این آگهی پیدا نشد</h1>

                    <p>ممکن است آگهی حذف شده یا آدرس آن تغییر کرده باشد.</p>

                    <Link to="/cars" className="btn btn-primary">
                        مشاهده آگهی‌ها
                    </Link>
                </div>
            </div>
        );
    }

    const handleShare = async () => {
        const shareData = {
            title: listing.title,
            text: `مشاهده آگهی ${listing.title} در KERMAN.CARS`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                recordInteraction(listing.id, "share").catch(() => {});
                return;
            }

            await navigator.clipboard.writeText(window.location.href);

            recordInteraction(listing.id, "share").catch(() => {});
            toast.success("لینک آگهی کپی شد");
        } catch (error) {
            if (error?.name !== "AbortError") {
                toast.error("امکان اشتراک‌گذاری وجود ندارد");
            }
        }
    };

    const specifications = [
        {
            label: "سال ساخت",
            value: toPersianNumber(listing.year),
            icon: CalendarDays,
        },
        {
            label: "کارکرد",
            value: formatMileage(listing.mileage),
            icon: Gauge,
        },
        {
            label: "گیربکس",
            value: listing.transmission,
            icon: Repeat2,
        },
        {
            label: "نوع سوخت",
            value: listing.fuelType,
            icon: Fuel,
        },
        {
            label: "رنگ بدنه",
            value: listing.color,
            icon: Palette,
        },
        {
            label: "وضعیت بدنه",
            value: listing.bodyStatus,
            icon: ShieldCheck,
        },
        {
            label: "نوع بدنه",
            value: listing.bodyType,
            icon: CarFront,
        },
        {
            label: "موتور",
            value: listing.engine,
            icon: Check,
        },
    ];

    return (
        <div className="listing-details-page">
            <div className="kc-container">
                <nav className="listing-details-page__breadcrumb">
                    <Link to="/">صفحه اصلی</Link>
                    <ChevronLeft size={14} />
                    <Link to={returnTo}>بازگشت به نتایج</Link>
                    <ChevronLeft size={14} />
                    <span>{listing.title}</span>
                </nav>

                <div className="listing-details-page__layout">
                    <main className="listing-details-page__main">
                        <section className="listing-gallery">
                            <Swiper
                                modules={[Navigation, Pagination, A11y, Keyboard]}
                                keyboard={{ enabled: true, onlyInViewport: true }}
                                a11y={{ prevSlideMessage: "تصویر قبلی", nextSlideMessage: "تصویر بعدی", paginationBulletMessage: "رفتن به تصویر {{index}}", slideLabelMessage: "تصویر {{index}} از {{slidesLength}}" }}
                                navigation
                                pagination={{
                                    clickable: true,
                                }}
                                className="listing-gallery__swiper"
                            >
                                {listing.images.map((image, index) => (
                                    <SwiperSlide key={image}>
                                        <img
                                            src={image}
                                            onError={event => { if (!event.currentTarget.src.endsWith(emptyImage)) event.currentTarget.src = emptyImage; }}
                                            alt={`${listing.title} - تصویر ${
                                                index + 1
                                            }`}
                                        />
                                    </SwiperSlide>
                                ))}
                            </Swiper>

                            {listing.isFeatured && (
                                <span className="listing-gallery__featured">
                                    آگهی ویژه
                                </span>
                            )}

                            <div className="listing-gallery__actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        toggle();
                                    }}
                                    className={
                                        isFavorite
                                            ? "listing-gallery__action listing-gallery__action--favorite"
                                            : "listing-gallery__action"
                                    }
                                    aria-label="علاقه‌مندی"
                                    disabled={
                                        pending ||
                                        listing.status !== "published"
                                    }
                                    aria-pressed={isFavorite}
                                >
                                    <Heart
                                        size={20}
                                        fill={
                                            isFavorite ? "currentColor" : "none"
                                        }
                                    />
                                </button>

                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="listing-gallery__action"
                                    aria-label="اشتراک‌گذاری"
                                >
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </section>

                        <section className="listing-detail-card listing-detail-summary">
                            <div className="listing-detail-summary__header">
                                <div>
                                    <div className="listing-detail-summary__meta">
                                        <span>{listing.createdAt}</span>
                                        <span>
                                            <Eye size={15} />
                                            {toPersianNumber(
                                                listing.viewsCount,
                                            )}{" "}
                                            بازدید
                                        </span>
                                    </div>

                                    <h1>{listing.title}</h1>

                                    <div className="listing-detail-summary__location">
                                        <MapPin size={17} />
                                        {listing.city}، {listing.neighborhood}
                                    </div>
                                </div>

                                {listing.isVerified && (
                                    <div className="listing-detail-summary__verified">
                                        <BadgeCheck size={20} />
                                        آگهی تأییدشده
                                    </div>
                                )}
                            </div>

                            <div className="listing-detail-summary__price">
                                <span>قیمت اعلام‌شده</span>
                                <strong>
                                    {listing.priceType === "contact"
                                        ? "تماس بگیرید"
                                        : formatPrice(listing.price)}
                                </strong>

                                {listing.priceType === "negotiable" && (
                                    <em>قابل مذاکره</em>
                                )}
                            </div>
                        </section>

                        <section className="listing-detail-card">
                            <div className="listing-detail-card__heading">
                                <h2>مشخصات خودرو</h2>
                                <p>اطلاعات ثبت‌شده توسط فروشنده</p>
                            </div>

                            <div className="listing-specifications">
                                {specifications.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div
                                            key={item.label}
                                            className="listing-specifications__item"
                                        >
                                            <span className="listing-specifications__icon">
                                                <Icon size={20} />
                                            </span>

                                            <div>
                                                <span>{item.label}</span>
                                                <strong>{item.value}</strong>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="listing-detail-card">
                            <div className="listing-detail-card__heading">
                                <h2>وضعیت و مدارک</h2>
                            </div>

                            <div className="listing-detail-properties">
                                <div>
                                    <span>وضعیت موتور</span>
                                    <strong>{listing.engineStatus}</strong>
                                </div>

                                <div>
                                    <span>وضعیت شاسی</span>
                                    <strong>{listing.chassisStatus}</strong>
                                </div>

                                <div>
                                    <span>وضعیت سند</span>
                                    <strong>{listing.documentStatus}</strong>
                                </div>

                                <div>
                                    <span>بیمه شخص ثالث</span>
                                    <strong>
                                        {toPersianNumber(
                                            listing.insuranceMonths,
                                        )}{" "}
                                        ماه
                                    </strong>
                                </div>

                                <div>
                                    <span>تعداد مالک</span>
                                    <strong>
                                        {toPersianNumber(listing.ownerCount)}{" "}
                                        نفر
                                    </strong>
                                </div>

                                <div>
                                    <span>امکان معاوضه</span>
                                    <strong>
                                        {listing.exchangeable
                                            ? "دارد"
                                            : "ندارد"}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        <section className="listing-detail-card">
                            <div className="listing-detail-card__heading">
                                <h2>توضیحات فروشنده</h2>
                            </div>

                            <p className="listing-detail-description">
                                {listing.description}
                            </p>
                        </section>

                        <button
                            type="button"
                            className="listing-detail-report"
                            disabled={listing.status !== "published"}
                            onClick={() =>
                                authenticated
                                    ? setReportOpen(true)
                                    : navigate("/auth/login", {
                                          state: { from: location.pathname },
                                      })
                            }
                        >
                            <MessageCircleWarning size={18} />
                            گزارش مشکل یا تخلف در آگهی
                        </button>
                    </main>

                    <aside className="listing-details-page__sidebar">
                        <div className="seller-card">
                            <div className="seller-card__type">
                                {listing.seller.type === "dealer" ? (
                                    <>
                                        <Store size={18} />
                                        فروشنده نمایشگاهی
                                    </>
                                ) : (
                                    <>
                                        <UserRound size={18} />
                                        فروشنده شخصی
                                    </>
                                )}
                            </div>

                            <div className="seller-card__profile">
                                <div className="seller-card__avatar">
                                    {listing.seller.type === "dealer" ? (
                                        <Store size={28} />
                                    ) : (
                                        <UserRound size={28} />
                                    )}
                                </div>

                                <div>
                                    <div className="seller-card__name">
                                        <strong>{listing.seller.name}</strong>

                                        {listing.seller.verified && (
                                            <BadgeCheck size={18} />
                                        )}
                                    </div>

                                    <span>{listing.seller.joinedAt}</span>
                                </div>
                            </div>

                            <div className="seller-card__location">
                                <MapPin size={17} />

                                <div>
                                    <strong>{listing.seller.city}</strong>

                                    <span>{listing.seller.address}</span>
                                </div>
                            </div>

                            {isPhoneVisible ? (
                                <a
                                    href={`tel:${listing.seller.phone}`}
                                    onClick={call}
                                    className="btn btn-primary seller-card__phone"
                                >
                                    <Phone size={19} />
                                    {listing.seller.phone}
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary seller-card__phone"
                                    onClick={() => revealPhone()}
                                >
                                    <Phone size={19} />
                                    نمایش شماره تماس
                                </button>
                            )}

                            {listing.dealer_slug && (
                                <Link
                                    to={`/dealers/${listing.dealer_slug}`}
                                    className="btn btn-outline-primary seller-card__listings"
                                >
                                    مشاهده همه آگهی‌های نمایشگاه
                                </Link>
                            )}

                            <div className="seller-card__notice">
                                <ShieldCheck size={18} />

                                <p>
                                    پیش از پرداخت وجه، خودرو و مدارک را حضوری
                                    بررسی کنید.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {publiclyVisible && <RelatedListings listing={listing} />}

            {reportOpen && (
                <ReportListing
                    listing={listing}
                    onClose={() => setReportOpen(false)}
                />
            )}
            <div className="listing-mobile-contact">
                <div>
                    <span>قیمت خودرو</span>
                    <strong>
                        {listing.priceType === "contact"
                            ? "تماس بگیرید"
                            : formatPrice(listing.price)}
                    </strong>
                </div>

                {isPhoneVisible ? (
                    <a
                        href={`tel:${listing.seller.phone}`}
                        onClick={call}
                        className="btn btn-primary"
                    >
                        <Phone size={18} />
                        تماس
                    </a>
                ) : (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => revealPhone()}
                    >
                        <Phone size={18} />
                        نمایش شماره
                    </button>
                )}
            </div>
        </div>
    );
}

function RelatedListings({ listing }) {
    const query = useQuery({
        queryKey: ["related-listings", listing.id],
        queryFn: ({ signal }) => getRelatedListings(listing.id, signal),
        retry: 1,
    });
    if (query.isSuccess && !query.data.length) return null;
    return <section className="kc-container related-listings" aria-labelledby="related-listings-title">
        <h2 id="related-listings-title">خودروهای مشابه</h2>
        <p>آگهی‌های همین برند، با اولویت مدل و شهر مشترک</p>
        <QueryStatus query={query}>
            <div className="row g-3">{query.data?.map(item => <div key={item.id} className="col-12 col-sm-6 col-xl-3"><ListingCard listing={item} /></div>)}</div>
        </QueryStatus>
    </section>;
}

export default ListingDetailsPage;
