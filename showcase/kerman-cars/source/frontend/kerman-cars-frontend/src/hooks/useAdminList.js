import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminList } from "../services/adminService.js";

export default function useAdminList(resource) {
    const [url, setUrl] = useSearchParams();
    const search = url.get("search") || "";
    const [debounced, setDebounced] = useState(search);
    const [composing, setComposing] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(timer);
    }, [search]);
    const page = Math.max(1, Math.floor(Number(url.get("page")) || 1));
    const params = {
        ...Object.fromEntries(url),
        search: search ? debounced : "",
        page,
        page_size: 20,
    };
    const query = useQuery({
        queryKey: ["admin", resource, params],
        queryFn: ({ signal }) => getAdminList(resource, params, signal),
        enabled: !composing,
        retry: (count, error) =>
            ![401, 403, 404].includes(error.response?.status) && count < 1,
    });
    useEffect(() => {
        if (page > 1 && query.error?.response?.status === 404)
            setUrl(
                (old) => {
                    const copy = new URLSearchParams(old);
                    copy.delete("page");
                    return copy;
                },
                { replace: true },
            );
    }, [page, query.error, setUrl]);
    const change = (name, value) =>
        setUrl(
            (old) => {
                const next = new URLSearchParams(old);
                if (value !== "" && value != null) next.set(name, value);
                else next.delete(name);
                if (name !== "page") next.delete("page");
                return next;
            },
            { replace: name === "search" },
        );
    return {
        query,
        page,
        url,
        search,
        change,
        reset: () => setUrl({}),
        onCompositionStart: () => setComposing(true),
        onCompositionEnd: () => setComposing(false),
        onSearchEnter: (event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing)
                setDebounced(search);
        },
    };
}
