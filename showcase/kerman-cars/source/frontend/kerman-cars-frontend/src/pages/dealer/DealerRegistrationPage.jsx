import { Navigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import useOwnerDealer from "../../hooks/useOwnerDealer";
import QueryStatus from "../../components/shared/QueryStatus";
import DealerProfileForm from "../../components/dealer/DealerProfileForm";
export default function DealerRegistrationPage() {
    const query = useOwnerDealer();
    const [params] = useSearchParams();
    if (!query.isSuccess) return <QueryStatus query={query} />;
    if (query.data?.status === "approved")
        return <Navigate to="/dealer-dashboard/profile" replace />;
    if (query.data && params.get("edit") !== "1")
        return <Navigate to="/dealer/status" replace />;
    return <DealerProfileForm record={query.data} />;
}
