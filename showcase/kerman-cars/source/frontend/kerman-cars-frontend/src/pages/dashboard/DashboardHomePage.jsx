import { useQuery } from "@tanstack/react-query";
import OwnerActionQueue from "../../components/workspace/OwnerActionQueue";
import { emptyImage } from "../../services/listingData";
import QueryStatus from "../../components/shared/QueryStatus";
import { getMyListings } from "../../services/listingService";
import { getFavorites } from "../../services/engagementService";
import { CarFront, Eye, Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import useAuthStore from "../../store/authStore";

import { formatPrice, toPersianNumber } from "../../utils/formatters";

import "./DashboardHomePage.scss";

function DashboardHomePage() {
    const user = useAuthStore((state) => state.user);

    const listingsQuery = useQuery({
        queryKey: ["my-listings", "dashboard"],
        queryFn: ({ signal }) => getMyListings({ page_size: 5 }, signal),
    });
    const favoritesQuery = useQuery({
        queryKey: ["favorites", "count"],
        queryFn: ({ signal }) => getFavorites({ page_size: 1 }, signal),
    });
    const myListings = listingsQuery.data?.results || [];

    const totalViews = myListings.reduce(
        (sum, listing) => sum + (listing.viewsCount ?? 0),
        0,
    );

    const summaryCards = [
        {
            title: "آگهی‌های ثبت‌شده",
            value: toPersianNumber(listingsQuery.data?.count ?? 0),
            query: listingsQuery,
            icon: CarFront,
        },
        {
            title: "بازدید آگهی‌های اخیر",
            value: toPersianNumber(totalViews),
            query: listingsQuery,
            icon: Eye,
        },
        {
            title: "علاقه‌مندی‌ها",
            value: toPersianNumber(favoritesQuery.data?.count ?? 0),
            query: favoritesQuery,
            icon: Heart,
        },
    ];

    return (
        <div className="dashboard-home">
            <div className="dashboard-home__heading">
                <div>
                    <span>پنل کاربری</span>

                    <h1>سلام {user?.firstName || "کاربر"}</h1>

                    <p>
                        از این بخش می‌توانید آگهی‌ها و اطلاعات حساب خود را
                        مدیریت کنید.
                    </p>
                </div>

                <Link
                    to="/listing/create"
                    className="btn btn-primary dashboard-home__create"
                >
                    <Plus size={19} />
                    ثبت آگهی جدید
                </Link>
            </div>

            <div className="row g-3">
                {summaryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div key={card.title} className="col-12 col-md-4">
                            <article className="dashboard-summary-card">
                                <span className="dashboard-summary-card__icon">
                                    <Icon size={23} />
                                </span>

                                <div>
                                    <span>{card.title}</span>
                                    <QueryStatus query={card.query}><strong>{card.value}</strong></QueryStatus>
                                </div>
                            </article>
                        </div>
                    );
                })}
            </div>

            <OwnerActionQueue basePath="/dashboard" />
            <section className="dashboard-recent">
                <div className="dashboard-recent__heading">
                    <div>
                        <h2>آخرین آگهی‌های من</h2>

                        <p>وضعیت آخرین خودروهای ثبت‌شده</p>
                    </div>

                    <Link to="/dashboard/listings">مشاهده همه</Link>
                </div>

                <QueryStatus query={listingsQuery}>
                {myListings.length === 0 ? (
                    <div className="dashboard-placeholder">
                        <CarFront size={35} />

                        <h2>هنوز آگهی ثبت نکرده‌اید</h2>

                        <p>اولین خودروی خود را برای فروش ثبت کنید.</p>

                        <Link
                            to="/listing/create"
                            className="btn btn-outline-primary"
                        >
                            ثبت اولین آگهی
                        </Link>
                    </div>
                ) : (
                    <div className="dashboard-recent__list">
                        {myListings.slice(0, 3).map((listing) => (
                            <article
                                key={listing.id}
                                className="dashboard-recent-item"
                            >
                                <img
                                    src={listing.image}
                                    alt={listing.title}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src =
                                            emptyImage;
                                    }}
                                />

                                <div className="dashboard-recent-item__content">
                                    <span>{listing.publicCode}</span>

                                    <h3><Link to={`/dashboard/listings?status=${listing.is_expired ? "expired" : listing.status}`}>{listing.title}</Link></h3>

                                    <small>{listing.statusLabel}</small>
                                </div>

                                <strong>
                                    {listing.price === null
                                        ? "تماس بگیرید"
                                        : formatPrice(listing.price)}
                                </strong>
                            </article>
                        ))}
                    </div>
                )}
                </QueryStatus>
            </section>
        </div>
    );
}

export default DashboardHomePage;
