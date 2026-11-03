import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../store/authStore";
import { getUnreadCount } from "../services/activityService";
export default function useUnreadNotifications() {
    const enabled = useAuthStore((s) => s.isAuthenticated);
    return useQuery({
        queryKey: ["notifications", "unread-count"],
        queryFn: ({ signal }) => getUnreadCount(signal),
        enabled,
        refetchInterval: 60000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        retry: (count, error) =>
            ![401, 403].includes(error.response?.status) && count < 1,
    });
}
