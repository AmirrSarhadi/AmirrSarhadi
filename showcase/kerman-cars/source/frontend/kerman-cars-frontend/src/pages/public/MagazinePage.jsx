import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import QueryStatus from "../../components/shared/QueryStatus";
import Pagination from "../../components/shared/Pagination";
import ArticleCard from "../../components/home/ArticleCard";
import {
    articleDate,
    getArticle,
    getArticles,
} from "../../services/magazineService";
import { mediaUrl } from "../../services/listingData";
import "../../components/home/HomeEditorial.scss";
export default function MagazinePage() {
    const { articleSlug } = useParams();
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const query = useQuery({
        queryKey: articleSlug ? ["article", articleSlug] : ["articles", page],
        queryFn: ({ signal }) =>
            articleSlug
                ? getArticle(articleSlug, signal)
                : getArticles(page, signal),
        retry: false,
    });
    useEffect(() => {
        const previous = document.title;
        document.title =
            articleSlug && query.data?.title
                ? `${query.data.title} | مجله کرمان کارز`
                : "مجلهٔ کرمان کارز";
        return () => {
            document.title = previous;
        };
    }, [articleSlug, query.data?.title]);
    useEffect(() => {
        if (!articleSlug && page > 1 && query.error?.response?.status === 404)
            setParams({}, { replace: true });
    }, [articleSlug, page, query.error, setParams]);
    if (articleSlug && query.error?.response?.status === 404) return <section className="kc-container magazine-page"><h1>این مطلب در دسترس نیست</h1><p>ممکن است مطلب منتشر نشده یا از مجله خارج شده باشد.</p><Link className="btn btn-outline-primary" to="/magazine">بازگشت به مجله</Link></section>;
    return (
        <div className="kc-container magazine-page">
            <Link
                className="magazine-page__back"
                to={articleSlug ? "/magazine" : "/"}
            >
                <ArrowRight size={18} aria-hidden="true" />
                {articleSlug ? "همهٔ نوشته‌های مجله" : "صفحه اصلی"}
            </Link>
            <QueryStatus query={query}>
                {articleSlug && query.data ? (
                    <article className="magazine-article">
                        <header>
                            <p className="home-editorial-label">
                                مجلهٔ کرمان کارز
                            </p>
                            <h1>{query.data.title}</h1>
                            <p className="magazine-article__excerpt">
                                {query.data.excerpt}
                            </p>
                            <time dateTime={query.data.published_at}>
                                {articleDate(query.data.published_at)}
                            </time>
                        </header>
                        {query.data.cover_image && (
                            <img
                                className="magazine-article__cover"
                                src={mediaUrl(query.data.cover_image)}
                                alt={query.data.cover_alt || ""}
                                width="1280"
                                height="800"
                            />
                        )}
                        <div className="magazine-article__content">
                            {query.data.content
                                .split(/\n\s*\n/)
                                .filter(Boolean)
                                .map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                        </div>
                        <aside className="magazine-article__next">
                            <h2>قدم بعدی تو چیست؟</h2>
                            <div className="d-flex flex-wrap gap-3">
                                <Link className="btn btn-primary" to="/cars">
                                    دیدن آگهی‌های خودرو
                                </Link>
                                <Link
                                    className="btn btn-outline-primary"
                                    to="/listing/create"
                                >
                                    ثبت آگهی خودرو
                                </Link>
                            </div>
                        </aside>
                    </article>
                ) : !articleSlug && query.data ? (
                    <>
                        <h1>مجلهٔ کرمان کارز</h1>
                        <p className="home-reasons__lead">
                            راهنماها و خواندنی‌های خودرو برای انتخاب آگاهانه‌تر.
                        </p>
                        {query.data.results.length ? (
                            <div className="magazine-page__grid">
                                {query.data.results.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="home-journal__empty">
                                <BookOpen size={36} aria-hidden="true" />
                                <p>هنوز مطلبی منتشر نشده است.</p>
                            </div>
                        )}
                        <Pagination
                            page={page}
                            data={query.data}
                            onChange={(next) =>
                                setParams(
                                    next > 1 ? { page: String(next) } : {},
                                )
                            }
                        />
                    </>
                ) : null}
            </QueryStatus>
            {query.isError && (
                <Link className="btn btn-outline-primary mt-3" to="/magazine">
                    بازگشت به مجله
                </Link>
            )}
        </div>
    );
}
