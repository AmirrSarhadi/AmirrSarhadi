import { Navigate, Outlet } from "react-router-dom";

import useAuthStore from "../store/authStore";

function ProfileCompletionRoute() {
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
            />
        );
    }

    if (!needsProfileCompletion) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return <Outlet />;
}

export default ProfileCompletionRoute;