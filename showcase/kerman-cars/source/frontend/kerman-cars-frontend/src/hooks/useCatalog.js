import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "../services/catalogService.js";

export default function useCatalog(path, params = {}, enabled = true) {
    return useQuery({
        queryKey: ["catalog", path, params],
        queryFn: ({ signal }) => getCatalog(path, params, signal),
        enabled,
        staleTime: 300000,
    });
}
