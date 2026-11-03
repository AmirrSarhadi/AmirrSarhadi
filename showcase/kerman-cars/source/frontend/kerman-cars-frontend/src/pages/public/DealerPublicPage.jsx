import usePageMetadata from "../../hooks/usePageMetadata";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import { getDealer, getDealerListings } from "../../services/dealerService";
import {
    AtSign,
    BadgeCheck,
    CalendarDays,
    CarFront,
    Clock3,
    MapPin,
    Phone,
    Share2,
    Store,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import ListingCard from "../../components/listing/ListingCard";

import { toPersianNumber } from "../../utils/formatters";

import "./DealerPublicPage.scss";

function DealerPublicPage() {
    const { dealerSlug } = useParams();
    const query = useQuery({
        queryKey: ["dealer", dealerSlug],
        queryFn: ({ signal }) => getDealer(dealerSlug, signal),
        retry: false,
    });
    return (
        <QueryStatus query={query}>
            {query.data && (
                <DealerContent key={dealerSlug} dealer={query.data} />
            )}
        </QueryStatus>
    );
}

function DealerContent({ dealer }) {
    usePageMetadata({
        title: `${dealer.business_name} | کرمان کارز`,
        description: `آگهی‌ها و اطلاعات تماس ${dealer.business_name} در کرمان کارز.`.slice(0, 160),
        path: `/dealers/${encodeURIComponent(dealer.slug)}`,
    });
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const listings = useQuery({
        queryKey: ["listings", "dealer", dealer.slug, page],
        queryFn: ({ signal }) => getDealerListings(dealer.slug, page, signal),
    });
    const dealerListings = listings.data?.results || [];
    const [isPhoneVisible, setIsPhoneVisible] = useState(false);

    if (!dealer) {
        return (
            <div className="kc-container py-5">
                <div className="dealer-public-not-found">
                    <Store size={40} />

                    <h1>نمایشگاه پیدا نشد</h1>

                    <Link to="/dealers" className="btn btn-primary">
                        مشاهده نمایشگاه‌ها
                    </Link>
                </div>
            </div>
        );
    }

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: dealer.businessName,
                    text: `مشاهده ${dealer.businessName} در KERMAN.CARS`,
                    url: window.location.href,
                });

                return;
            }

            await navigator.clipboard.writeText(window.location.href);

            toast.success("لینک نمایشگاه کپی شد.");
        } catch (error) {
            if (error?.name !== "AbortError") {
                toast.error("اشتراک‌گذاری انجام نشد.");
            }
        }
    };

    return (
        <div className="dealer-public-page">
            <section className="dealer-profile-cover">
                <img src={dealer.coverImage} alt={dealer.businessName} />

                <div className="dealer-profile-cover__overlay" />

                <div className="kc-container dealer-profile-cover__content">
                    <div className="dealer-profile-cover__avatar">
                        <Store size={35} />
                    </div>

                    <div className="dealer-profile-cover__identity">
                        <div>
                            <h1>{dealer.businessName}</h1>

                            {dealer.verified && <BadgeCheck size={23} />}
                        </div>

                        <span>مدیریت {dealer.managerName}</span>

                        <p>
                            <MapPin size={16} />
                            {dealer.city}، {dealer.neighborhood}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleShare}
                        className="dealer-profile-cover__share"
                    >
                        <Share2 size={18} />
                        اشتراک‌گذاری
                    </button>
                </div>
            </section>

            <div className="kc-container dealer-public-page__layout">
                <main>
                    <section className="dealer-public-section">
                        <div className="dealer-public-section__heading">
                            <h2>درباره نمایشگاه</h2>
                        </div>

                        <p className="dealer-public-description">
                            {dealer.description}
                        </p>

                        <div className="dealer-public-info-grid">
                            <div>
                                <Clock3 size={19} />

                                <span>ساعات کاری</span>

                                <strong>{dealer.workingHours}</strong>
                            </div>

                            <div>
                                <CalendarDays size={19} />

                                <span>سابقه در سایت</span>

                                <strong>{dealer.joinedAt}</strong>
                            </div>

                            <div>
                                <CarFront size={19} />

                                <span>آگهی‌های ثبت‌شده</span>

                                <strong>
                                    {toPersianNumber(listings.data?.count ?? 0)}{" "}
                                    خودرو
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="dealer-public-section">
                        <div className="dealer-public-section__heading">
                            <div>
                                <h2>خودروهای نمایشگاه</h2>

                                <p>خودروهای فعال این نمایشگاه</p>
                            </div>

                            <span>
                                {toPersianNumber(listings.data?.count ?? 0)}{" "}
                                آگهی
                            </span>
                        </div>

                        <QueryStatus query={listings}>
                            {dealerListings.length > 0 ? (
                                <div className="row g-3">
                                    {dealerListings.map((listing) => (
                                        <div
                                            key={listing.id}
                                            className="col-12 col-md-6"
                                        >
                                            <ListingCard listing={listing} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="dealer-public-empty">
                                    <CarFront size={30} />

                                    <span>
                                        در حال حاضر آگهی فعالی وجود ندارد.
                                    </span>
                                </div>
                            )}
                        </QueryStatus>
                        <Pagination
                            page={page}
                            data={listings.data}
                            onChange={(next) =>
                                setParams({ page: String(next) })
                            }
                        />
                    </section>
                </main>

                <aside className="dealer-contact-card">
                    <div className="dealer-contact-card__heading">
                        <Store size={22} />

                        <div>
                            <strong>{dealer.businessName}</strong>

                            <span>
                                {dealer.verified
                                    ? "نمایشگاه تأییدشده"
                                    : "نمایشگاه عادی"}
                            </span>
                        </div>
                    </div>

                    <div className="dealer-contact-card__address">
                        <MapPin size={18} />

                        <p>{dealer.address}</p>
                    </div>

                    {isPhoneVisible ? (
                        <a
                            href={`tel:${dealer.phone}`}
                            className="btn btn-primary w-100"
                        >
                            <Phone size={18} />
                            {dealer.phone}
                        </a>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={() => setIsPhoneVisible(true)}
                        >
                            <Phone size={18} />
                            نمایش شماره تماس
                        </button>
                    )}

                    {dealer.instagram && (
                        <div className="dealer-contact-card__social">
                            <AtSign size={17} />

                            <span>{dealer.instagram}</span>
                        </div>
                    )}

                    <small>
                        پیش از پرداخت وجه، خودرو و مدارک را حضوری بررسی کنید.
                    </small>
                </aside>
            </div>
        </div>
    );
}

export default DealerPublicPage;
