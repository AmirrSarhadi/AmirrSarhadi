import { useQuery } from "@tanstack/react-query";
import {
    getOwnerDealer,
    getActiveSubscription,
    getDealerAnalytics,
} from "../services/dealerOwnerService.js";
export default function useOwnerDealer() {
    return useQuery({
        queryKey: ["owner-dealer"],
        queryFn: ({ signal }) => getOwnerDealer(signal),
        retry: false,
        refetchOnWindowFocus: true,
    });
}
export function useDealerSubscription() {
    return useQuery({
        queryKey: ["dealer-subscription"],
        queryFn: ({ signal }) => getActiveSubscription(signal),
        retry: false,
    });
}
export function useDealerAnalytics(days = 30) {
    return useQuery({
        queryKey: ["dealer-analytics", days],
        queryFn: ({ signal }) => getDealerAnalytics(days, signal),
        retry: false,
    });
}
