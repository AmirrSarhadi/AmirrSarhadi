import HomeBrandStory from "../../components/home/HomeBrandStory";
import HomeFAQ from "../../components/home/HomeFAQ";
import HomeJournal from "../../components/home/HomeJournal";
import heroImage from "../../assets/images/kerman-editorial.webp";
import heroSmall from "../../assets/images/kerman-editorial-small.webp";
import ContactDetails from "../../components/public/ContactDetails";
import { contactItems } from "../../services/siteInfoData";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search, CarFront, ArrowLeft } from "lucide-react";
import { getListings } from "../../services/listingService";
import { mediaUrl } from "../../services/listingData";
import useHomepage from "../../hooks/useHomepage";
import useCatalog from "../../hooks/useCatalog";
import ListingCard from "../../components/listing/ListingCard";
import QueryStatus from "../../components/shared/QueryStatus";
import "./HomePage.scss";

function Banners({ rows }) {
    return rows.map((banner) => {
        const image = (
            <picture>
                {banner.mobile_image && (
                    <source
                        media="(max-width: 767px)"
                        srcSet={mediaUrl(banner.mobile_image)}
                    />
                )}
                <img
                    src={mediaUrl(banner.image)}
                    alt={banner.alt_text || banner.title || "بنر کرمان کارز"}
                    loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block" }}
                />
            </picture>
        );
        return (
            <figure key={banner.id} className="mb-3">
                {banner.link_url && /^https?:\/\//i.test(banner.link_url) ? (
                    <a
                        href={banner.link_url}
                        target={banner.open_in_new_tab ? "_blank" : undefined}
                        rel={
                            banner.open_in_new_tab
                                ? "noopener noreferrer"
                                : undefined
                        }
                    >
                        {image}
                    </a>
                ) : (
                    image
                )}
                {banner.title && (
                    <figcaption>
                        {banner.title}
                        {banner.subtitle && <p>{banner.subtitle}</p>}
                    </figcaption>
                )}
            </figure>
        );
    });
}
function ListingsSection({ query, title, featured = false }) {
    return (
        <section className="home-listings kc-section">
            <div className="home-section-heading">
                <h2>{title}</h2>
                <Link to="/cars" className="home-section-heading__link">
                    مشاهده همه آگهی‌ها <ArrowLeft size={17} />
                </Link>
            </div>
            <QueryStatus query={query}>
                {query.data?.results.length ? (
                    <div
                        className={featured ? "home-listings__rail" : "row g-3"}
                        role={featured ? "region" : undefined}
                        aria-label={featured ? title : undefined}
                        tabIndex={featured ? 0 : undefined}
                    >
                        {query.data.results.map((listing) => (
                            <div
                                className="col-12 col-sm-6 col-xl-4"
                                key={listing.id}
                            >
                                <ListingCard listing={listing} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="home-listings__empty" role="status">
                        <CarFront size={32} aria-hidden="true" />
                        <p>هنوز آگهی منتشرشده‌ای در این بخش وجود ندارد.</p>
                        <Link
                            to="/listing/create"
                            className="btn btn-outline-primary"
                        >
                            ثبت آگهی
                        </Link>
                    </div>
                )}
            </QueryStatus>
        </section>
    );
}
export default function HomePage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [composing, setComposing] = useState(false);
    const homepage = useHomepage();
    const settings = homepage.data?.settings;
    const banners = homepage.data?.banners || [];
    const brands = useCatalog("cars/brands/");
    const latest = useQuery({
        queryKey: ["homepage-listings", "latest"],
        queryFn: ({ signal }) =>
            getListings({ ordering: "newest", page_size: 6 }, signal),
        enabled: Boolean(settings?.show_latest_listings),
    });
    const featured = useQuery({
        queryKey: ["homepage-listings", "featured"],
        queryFn: ({ signal }) =>
            getListings({ is_featured: true, page_size: 6 }, signal),
        enabled: Boolean(settings?.show_featured_listings),
    });
    useEffect(() => {
        if (!settings) return;
        const previousTitle = document.title;
        document.title = settings.seo_title || settings.site_name;
        const existing = document.querySelector('meta[name="description"]');
        const meta = existing || document.createElement("meta");
        const previousDescription = meta.getAttribute("content");
        meta.setAttribute("name", "description");
        meta.setAttribute(
            "content",
            settings.seo_description || previousDescription || "",
        );
        if (!existing) document.head.append(meta);
        return () => {
            document.title = previousTitle;
            if (!existing) meta.remove();
            else if (previousDescription === null)
                meta.removeAttribute("content");
            else meta.setAttribute("content", previousDescription);
        };
    }, [settings]);
    const handleSearch = (event) => {
        event.preventDefault();
        if (composing) return;
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const name of ["brand", "search"])
            if (data.get(name)) params.set(name, data.get(name));
        navigate(`/cars?${params}`);
    };
    const group = (position) =>
        banners.filter((banner) => banner.position === position);
    return (
        <QueryStatus query={homepage}>
            <div className="kc-container pt-3">
                <Banners rows={group("top")} />
            </div>
            <section className="home-hero">
                <div className="kc-container home-hero__content">
                    <div className="home-hero__copy">
                        <div className="home-hero__badge">
                            بازار تخصصی خودرو در استان کرمان
                        </div>
                        <h1>
                            {settings?.hero_title ||
                                "خرید و فروش خودرو، همین‌جا در کرمان"}
                        </h1>
                        <p>
                            {settings?.hero_subtitle ||
                                "آگهی‌های شخصی و نمایشگاهی را مقایسه کن؛ برای فروش هم مشخصات خودرویت را همین‌جا ثبت کن."}
                        </p>
                        <div className="home-hero__actions">
                            <Link
                                className="btn btn-primary"
                                to="/listing/create"
                            >
                                ثبت آگهی و فروش خودرو{" "}
                                <ArrowLeft size={17} aria-hidden="true" />
                            </Link>
                            <Link
                                className="btn btn-outline-primary"
                                to="/cars"
                            >
                                مشاهده آگهی‌ها
                            </Link>
                        </div>
                    </div>
                    <figure className="home-hero__image" aria-hidden="true">
                        <picture>
                            <source
                                media="(max-width: 767px)"
                                srcSet={heroSmall}
                            />
                            <img
                                src={heroImage}
                                alt=""
                                width="1280"
                                height="853"
                                fetchPriority="high"
                            />
                        </picture>
                    </figure>
                    <form
                        noValidate
                        className="home-search"
                        onSubmit={handleSearch}
                    >
                        <div className="home-search__field">
                            <label htmlFor="home-brand">انتخاب برند</label>
                            <CarFront size={18} />
                            <select
                                id="home-brand"
                                className="form-select"
                                defaultValue=""
                                aria-label="انتخاب برند"
                                name="brand"
                                disabled={brands.isPending || brands.isError}
                            >
                                <option value="">همه برندها</option>
                                {brands.data?.map((brand) => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="home-search__field">
                            <label htmlFor="home-listing-search">
                                مدل یا نام خودرو
                            </label>
                            <Search size={18} />
                            <input
                                id="home-listing-search"
                                type="search"
                                className="form-control"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onCompositionStart={() => setComposing(true)}
                                onCompositionEnd={() => setComposing(false)}
                                placeholder="مدل یا نام خودرو"
                                name="search"
                                aria-label="مدل یا نام خودرو"
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label="پاک کردن جست‌وجوی صفحه اصلی"
                                    onClick={() => {
                                        setSearch("");
                                        document
                                            .getElementById(
                                                "home-listing-search",
                                            )
                                            .focus();
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary home-search__button"
                        >
                            <Search size={19} />
                            جست‌وجوی خودرو
                        </button>
                    </form>
                    {brands.isError && (
                        <p role="alert">
                            دریافت برندها انجام نشد.{" "}
                            <button
                                type="button"
                                onClick={() => brands.refetch()}
                            >
                                تلاش دوباره
                            </button>
                        </p>
                    )}
                    <div className="home-hero__banners">
                        <Banners rows={group("hero")} />
                    </div>
                </div>
            </section>
            <HomeBrandStory />
            <div className="kc-container">
                <div className="row g-4">
                    <div
                        className={
                            group("sidebar").length
                                ? "col-12 col-lg-9"
                                : "col-12"
                        }
                    >
                        {settings?.show_featured_listings &&
                            (!featured.isSuccess ||
                                Boolean(featured.data?.results.length)) && (
                                <ListingsSection
                                    query={featured}
                                    featured
                                    title={
                                        settings.featured_section_title ||
                                        "آگهی‌های ویژه"
                                    }
                                />
                            )}
                        <Banners rows={group("middle")} />
                        {settings?.show_latest_listings && (
                            <ListingsSection
                                query={latest}
                                title={
                                    settings.latest_section_title ||
                                    "جدیدترین آگهی‌های خودرو"
                                }
                            />
                        )}
                        {contactItems(settings).length > 0 && (
                            <section className="py-4">
                                <h2>ارتباط با کرمان کارز</h2>
                                <ContactDetails settings={settings} />
                            </section>
                        )}
                    </div>
                    {Boolean(group("sidebar").length) && (
                        <aside
                            className="col-12 col-lg-3 py-4"
                            aria-label="اطلاعیه‌های کنار صفحه"
                        >
                            <Banners rows={group("sidebar")} />
                        </aside>
                    )}
                </div>
            </div>
            <HomeJournal articles={homepage.data?.articles || []} />
            <HomeFAQ items={homepage.data?.faqs || []} />
        </QueryStatus>
    );
}
