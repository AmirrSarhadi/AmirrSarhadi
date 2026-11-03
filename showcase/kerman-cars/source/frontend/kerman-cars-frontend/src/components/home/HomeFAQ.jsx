import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
export default function HomeFAQ({ items }) {
    const [collapsed, setCollapsed] = useState(() => new Set());
    const list = useRef(null);
    if (!items.length) return null;
    const navigate = (event, index) => {
        const keys = {
            ArrowDown: (index + 1) % items.length,
            ArrowUp: (index - 1 + items.length) % items.length,
            Home: 0,
            End: items.length - 1,
        };
        if (keys[event.key] == null) return;
        event.preventDefault();
        const buttons = list.current?.querySelectorAll("[data-faq-trigger]");
        buttons?.[keys[event.key]]?.focus();
    };
    return (
        <section
            className="home-faq kc-section"
            aria-labelledby="home-faq-title"
        >
            <div className="kc-container home-faq__layout">
                <div className="home-faq__intro">
                    <p className="home-editorial-label">پیش از شروع</p>
                    <h2 id="home-faq-title">
                        سؤال شما،{" "}
                        <br />
                        پاسخ روشن ما.
                    </h2>
                    <p>
                        از ثبت آگهی تا ارتباط با فروشنده؛ پاسخ سؤال‌های متداول
                        را اینجا ببینید.
                    </p>
                    <Link to="/contact">
                        ارتباط با کرمان کارز{" "}
                        <ArrowLeft size={17} aria-hidden="true" />
                    </Link>
                </div>
                <div className="home-faq__list" ref={list}>
                    {items.map((item, index) => {
                        const expanded = !collapsed.has(item.id);
                        return (
                            <div
                                key={item.id}
                                className={`home-faq__item ${expanded ? "home-faq__item--open" : ""}`}
                            >
                                <h3>
                                    <button
                                        type="button"
                                        id={`faq-trigger-${item.id}`}
                                        data-faq-trigger
                                        aria-expanded={expanded}
                                        aria-controls={`faq-panel-${item.id}`}
                                        onClick={() =>
                                            setCollapsed(previous => {
                                                const next = new Set(previous);
                                                if (expanded) next.add(item.id);
                                                else next.delete(item.id);
                                                return next;
                                            })
                                        }
                                        onKeyDown={(event) =>
                                            navigate(event, index)
                                        }
                                    >
                                        <span className="home-faq__question">{item.question}</span>
                                        <span className="home-faq__plus">
                                            <Plus
                                                size={21}
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </button>
                                </h3>
                                <div
                                    className="home-faq__panel"
                                    id={`faq-panel-${item.id}`}
                                    role="region"
                                    aria-labelledby={`faq-trigger-${item.id}`}
                                    aria-hidden={!expanded}
                                    inert={expanded ? undefined : true}
                                >
                                    <div>
                                        <div className="home-faq__answer">
                                            <span className="home-faq__sender">کرمان کارز</span>
                                            <p>{item.answer}</p>
                                            <span className="home-faq__typing" aria-hidden="true"><i /><i /><i /></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
