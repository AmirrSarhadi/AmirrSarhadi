import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/apiClient.js";

export default function useHomepage() {
    return useQuery({
        queryKey: ["homepage"],
        queryFn: async ({ signal }) =>
            (await apiClient.get("homepage/", { signal, skipAuth: true })).data,
    });
}
