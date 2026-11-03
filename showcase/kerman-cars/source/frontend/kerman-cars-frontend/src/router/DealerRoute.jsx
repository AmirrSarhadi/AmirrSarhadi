import { Navigate, Outlet } from "react-router-dom";
import useOwnerDealer from "../hooks/useOwnerDealer";
import QueryStatus from "../components/shared/QueryStatus";
export default function DealerRoute() {
    const query = useOwnerDealer();
    if (!query.isSuccess) return <QueryStatus query={query} />;
    if (!query.data) return <Navigate to="/dealer/register" replace />;
    if (query.data.status !== "approved")
        return <Navigate to="/dealer/status" replace />;
    return <Outlet />;
}
