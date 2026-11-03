import ComparisonTray from "../components/comparison/ComparisonTray";
import PublicFooter from "../components/layout/PublicFooter";
import { Outlet, useLocation } from "react-router-dom";

import PublicHeader from "../components/layout/PublicHeader";
import MobileBottomNav from "../components/layout/MobileBottomNav";

function PublicLayout() {
    const { pathname } = useLocation();
    const focusedSeller = /^\/listing\/(?:create|[^/]+\/edit)\/?$/.test(pathname);
    return (
        <div className="kc-public-layout">
            <PublicHeader />

            <main id="main-content" className="kc-page">
                <Outlet />
                <ComparisonTray />
            </main>

            <PublicFooter />
            {!focusedSeller && <MobileBottomNav />}
        </div>
    );
}

export default PublicLayout;
