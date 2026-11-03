import ComparisonButton from "../comparison/ComparisonButton";
import { emptyImage } from "../../services/listingData";
import { Link, useLocation } from "react-router-dom";
import { BadgeCheck, Gauge, Heart, MapPin, Store, CarFront, Sparkles } from "lucide-react";

import useFavorite from "../../hooks/useFavorite";

import {
    formatMileage,
    formatPrice,
    toPersianNumber,
} from "../../utils/formatters";

import "./ListingCard.scss";

function ListingCard({ listing }) {
    const location = useLocation();
    const { isFavorite, pending, toggle } = useFavorite(listing);

    return (
        <article className="listing-card">
            <Link to={`/cars/${listing.slug}`} state={{ returnTo: location.pathname === "/cars" ? location.pathname + location.search : undefined }} className="listing-card__link">
                <div className="listing-card__media">
                    {listing.image && listing.image !== emptyImage ? <img src={listing.image} alt={listing.title} loading="lazy" width="640" height="400" /> : <div className="listing-card__placeholder"><CarFront size={44} aria-hidden="true" /><span>تصویر خودرو ثبت نشده</span></div>}
                </div>

                <div className="listing-card__body">
                    <div className="listing-card__meta"><span className="listing-card__date">{listing.createdAt}</span>{listing.isFeatured && <span className="listing-card__featured"><Sparkles size={13} aria-hidden="true" />آگهی ویژه</span>}</div>
                    <div className="listing-card__heading">
                        <h3>{listing.title}</h3>

                        {listing.isVerified && (
                            <BadgeCheck
                                className="listing-card__verified"
                                size={20}
                            />
                        )}
                    </div>

                    <div className="listing-card__specs">
                        <span>مدل {toPersianNumber(listing.year)}</span>

                        <span className="listing-card__spec-divider" />

                        <span>
                            <Gauge size={16} />
                            {formatMileage(listing.mileage)}
                        </span>
                    </div>

                    <div className="listing-card__location">
                        <MapPin size={16} />

                        <span>
                            {[listing.city, listing.neighborhood].filter(Boolean).join("، ")}
                        </span>
                    </div>

                    <div className="listing-card__footer">
                        <div>
                            <span className="listing-card__price-label">
                                قیمت خودرو
                            </span>

                            <strong>
                                {listing.priceType === "contact"
                                    ? "تماس بگیرید"
                                    : formatPrice(listing.price)}
                            </strong>
                        </div>

                        {listing.sellerType === "dealer" && (
                            <span className="listing-card__dealer">
                                <Store size={15} />
                                نمایشگاه
                            </span>
                        )}
                    </div>
                </div>
            </Link>
            <button
                type="button"
                className={`listing-card__favorite ${
                    isFavorite ? "listing-card__favorite--active" : ""
                }`}
                onClick={toggle}
                disabled={pending || listing.status !== "published"}
                aria-pressed={isFavorite}
                aria-label={
                    isFavorite
                        ? "حذف از علاقه‌مندی‌ها"
                        : "افزودن به علاقه‌مندی‌ها"
                }
            >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            {listing.status === "published" && <ComparisonButton listing={listing} />}
        </article>
    );
}

export default ListingCard;
