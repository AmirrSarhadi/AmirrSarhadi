import {
    Navigate,
    Outlet,
} from "react-router-dom";

import useAuthStore from "../store/authStore";

function GuestRoute() {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated,
    );

    const needsProfileCompletion =
        useAuthStore(
            (state) =>
                state.needsProfileCompletion,
        );

    const user = useAuthStore(
        (state) => state.user,
    );

    if (isAuthenticated) {
        if (user?.role === "ADMIN") {
            return (
                <Navigate
                    to="/admin"
                    replace
                />
            );
        }

        return (
            <Navigate
                to={
                    needsProfileCompletion
                        ? "/auth/complete-profile"
                        : "/dashboard"
                }
                replace
            />
        );
    }

    return <Outlet />;
}

export default GuestRoute;