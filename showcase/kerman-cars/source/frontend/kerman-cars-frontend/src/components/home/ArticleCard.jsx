import { BookOpen, ArrowUpLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { mediaUrl } from "../../services/listingData";
import { articleDate } from "../../services/magazineService";
import "./HomeEditorial.scss";
export default function ArticleCard({ article, headingLevel = 3 }) {
    const Heading = headingLevel === 2 ? "h2" : "h3";
    return (
        <article className="journal-card">
            <Link to={`/magazine/${article.slug}`}>
                <div className="journal-card__image">
                    {article.cover_image ? (
                        <img
                            src={mediaUrl(article.cover_image)}
                            alt={article.cover_alt || ""}
                            loading="lazy"
                            width="640"
                            height="400"
                        />
                    ) : (
                        <BookOpen size={44} aria-hidden="true" />
                    )}
                </div>
                <div className="journal-card__body">
                    <Heading>
                        {article.title}
                        <ArrowUpLeft size={18} aria-hidden="true" />
                    </Heading>
                    <p>{article.excerpt}</p>
                    <time dateTime={article.published_at}>
                        {articleDate(article.published_at)}
                    </time>
                </div>
            </Link>
        </article>
    );
}
