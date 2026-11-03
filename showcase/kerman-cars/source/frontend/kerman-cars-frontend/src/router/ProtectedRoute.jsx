import { Navigate, Outlet, useLocation } from "react-router-dom";

import useAuthStore from "../store/authStore";

function ProtectedRoute() {
    const location = useLocation();

    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated,
    );

    const needsProfileCompletion = useAuthStore(
        (state) => state.needsProfileCompletion,
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

    if (needsProfileCompletion) {
        return (
            <Navigate
                to="/auth/complete-profile"
                replace
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;