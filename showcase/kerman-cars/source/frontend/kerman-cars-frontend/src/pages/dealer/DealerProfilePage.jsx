import useOwnerDealer from "../../hooks/useOwnerDealer";
import QueryStatus from "../../components/shared/QueryStatus";
import DealerProfileForm from "../../components/dealer/DealerProfileForm";
export default function DealerProfilePage() {
    const query = useOwnerDealer();
    return (
        <QueryStatus query={query}>
            {query.data && <DealerProfileForm record={query.data} />}
        </QueryStatus>
    );
}
