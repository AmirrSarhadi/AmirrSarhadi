import { useEffect } from "react";
import { Link } from "react-router-dom";
import useHomepage from "../../hooks/useHomepage";
import QueryStatus from "../../components/shared/QueryStatus";
import ContactDetails from "../../components/public/ContactDetails";
import { publicInfoPages } from "../../services/siteInfoData";
import "./PublicInfoPage.scss";
export default function PublicInfoPage({ page }) {
    const query = useHomepage();
    const descriptor = publicInfoPages[page];
    const title = `${descriptor.title} | ${query.data?.settings.site_name || "KERMAN.CARS"}`;
    useEffect(() => {
        const previous = document.title;
        document.title = title;
        return () => {
            document.title = previous;
        };
    }, [title]);
    const settings = query.data?.settings;
    const content = settings?.[descriptor.field]?.trim();
    return (
        <section className="kc-container site-info-page">
            <h1>{descriptor.title}</h1>
            <QueryStatus query={query}>
                {settings &&
                    (page === "contact" ? (
                        <ContactDetails settings={settings} />
                    ) : content ? (
                        <div className="site-info-page__content">{content}</div>
                    ) : (
                        <p role="status">
                            متن این صفحه هنوز توسط مدیریت ثبت نشده است.
                        </p>
                    ))}
            </QueryStatus>
            <Link to="/">بازگشت به صفحه اصلی</Link>
        </section>
    );
}
