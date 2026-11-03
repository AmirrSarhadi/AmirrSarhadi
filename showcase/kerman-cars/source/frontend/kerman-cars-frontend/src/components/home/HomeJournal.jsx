import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import ArticleCard from "./ArticleCard";
export default function HomeJournal({ articles }) {
    const track = useRef(null);
    const [index, setIndex] = useState(0);
    const move = (direction) => {
        const next = Math.max(
            0,
            Math.min(articles.length - 1, index + direction),
        );
        setIndex(next);
        track.current?.children[next]?.scrollIntoView({
            block: "nearest",
            inline: "start",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
        });
    };
    return (
        <section
            className="home-journal kc-section"
            aria-labelledby="home-journal-title"
        >
            <div className="kc-container">
                <div className="home-section-heading">
                    <div>
                        <p className="home-editorial-label">
                            برای انتخاب آگاهانه‌تر
                        </p>
                        <h2 id="home-journal-title">مجلهٔ کرمان کارز</h2>
                    </div>
                    <Link className="home-section-heading__link" to="/magazine">
                        همهٔ نوشته‌ها <ArrowLeft size={17} aria-hidden="true" />
                    </Link>
                </div>
                {articles.length ? (
                    <>
                        <div
                            className="home-journal__rail"
                            ref={track}
                            role="region"
                            aria-label="نوشته‌های مجله کرمان کارز"
                            tabIndex={0}
                            onScroll={(event) => {
                                const node = event.currentTarget;
                                const first = node.children[0];
                                if (
                                    first &&
                                    node.scrollWidth > node.clientWidth + 1
                                )
                                    setIndex(
                                        Math.max(
                                            0,
                                            Math.min(
                                                articles.length - 1,
                                                Math.round(
                                                    Math.abs(node.scrollLeft) /
                                                        (first.getBoundingClientRect()
                                                            .width +
                                                            20),
                                                ),
                                            ),
                                        ),
                                    );
                            }}
                        >
                            {articles.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article}
                                />
                            ))}
                        </div>
                        <div className="home-journal__controls">
                            <button
                                type="button"
                                onClick={() => move(-1)}
                                disabled={index === 0}
                                aria-label="نوشتهٔ قبلی"
                            >
                                <ArrowRight size={19} />
                            </button>
                            <button
                                type="button"
                                onClick={() => move(1)}
                                disabled={index >= articles.length - 1}
                                aria-label="نوشتهٔ بعدی"
                            >
                                <ArrowLeft size={19} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="home-journal__empty">
                        <BookOpen size={32} aria-hidden="true" />
                        <p>
                            نوشته‌های مجله در حال آماده‌سازی‌اند. پس از انتشار،
                            راهنماهای خودرو را اینجا می‌خوانید.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
