import { Columns3 } from "lucide-react";
import toast from "react-hot-toast";
import useComparisonStore from "../../store/comparisonStore";
import { COMPARISON_LIMIT } from "../../services/comparisonData";
import "./Comparison.scss";
export default function ComparisonButton({ listing }) {
    const ids = useComparisonStore((state) => state.ids);
    const toggle = useComparisonStore((state) => state.toggle);
    const selected = ids.includes(listing.id);
    return (
        <button
            type="button"
            className="comparison-toggle"
            aria-pressed={selected}
            aria-label={`${selected ? "حذف از مقایسه" : "افزودن به مقایسه"} ${listing.title}`}
            onClick={() => {
                if (!selected && ids.length >= COMPARISON_LIMIT) {
                    toast.error(
                        "حداکثر سه خودرو قابل مقایسه است؛ ابتدا یکی را حذف کنید.",
                    );
                    return;
                }
                toggle(listing.id);
            }}
        >
            <Columns3 size={17} aria-hidden="true" />
            {selected ? "حذف از مقایسه" : "افزودن به مقایسه"}
        </button>
    );
}
