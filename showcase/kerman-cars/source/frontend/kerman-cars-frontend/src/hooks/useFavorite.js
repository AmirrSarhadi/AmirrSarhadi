import { useMutation, useIsMutating } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { toggleFavorite } from "../services/engagementService.js";
import useAuthStore from "../store/authStore.js";

export default function useFavorite(listing) {
    const authenticated = useAuthStore((s) => s.isAuthenticated);
    const navigate = useNavigate();
    const location = useLocation();
    const mutationKey = ["favorite", listing?.id];
    const pending = useIsMutating({ mutationKey }) > 0;
    const mutation = useMutation({
        mutationKey,
        mutationFn: () => toggleFavorite(listing.id),
        onError: (error) => toast.error(error.message),
    });
    return {
        isFavorite: Boolean(listing?.is_favorited),
        pending,
        toggle: () => {
            if (!authenticated) {
                navigate("/auth/login", {
                    state: { from: location.pathname + location.search },
                });
                return;
            }
            if (!pending) mutation.mutate();
        },
    };
}
