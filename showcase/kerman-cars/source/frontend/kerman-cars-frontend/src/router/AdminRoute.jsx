import {
    Navigate,
    Outlet,
    useLocation,
} from "react-router-dom";

import useAuthStore from "../store/authStore";

function AdminRoute() {
    const location = useLocation();

    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated,
    );

    const user = useAuthStore(
        (state) => state.user,
    );

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/auth/login"
                replace
                state={{
                    from: location.pathname,
                }}
            />
        );
    }

    if (user?.role !== "ADMIN") {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return <Outlet />;
}

export default AdminRoute;