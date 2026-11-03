import logo from "../../assets/images/kerman-cars-logo.webp";
import { Link } from "react-router-dom";
import useHomepage from "../../hooks/useHomepage";
import { publicInfoPages } from "../../services/siteInfoData";
import ContactDetails from "../public/ContactDetails";
import "../../pages/public/PublicInfoPage.scss";
import "./PublicFooter.scss";
export default function PublicFooter() {
    const query = useHomepage();
    return (
        <footer className="public-footer">
            <div className="kc-container">
                <div className="public-footer__top"><Link className="public-footer__brand" to="/"><img src={logo} alt="" width="44" height="44" /><div><strong>{query.data?.settings.site_name || 'KERMAN.CARS'}</strong><span>بازار خودرو کرمان</span></div></Link>
                <nav aria-label="صفحات عمومی">
                    {Object.values(publicInfoPages).map((page) => (
                        <Link key={page.path} to={page.path}>
                            {page.title}
                        </Link>
                    ))}
                </nav></div>
                {query.isError ? (
                    <p role="status">اطلاعات تماس در دسترس نیست.</p>
                ) : (
                    query.data && (
                        <ContactDetails
                            settings={query.data.settings}
                            hideEmpty
                        />
                    )
                )}
            </div>
        </footer>
    );
}
