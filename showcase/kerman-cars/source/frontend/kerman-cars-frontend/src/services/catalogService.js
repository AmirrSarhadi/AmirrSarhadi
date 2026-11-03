import apiClient from "./apiClient.js";

export async function getCatalog(path, params = {}, signal) {
    const rows = [];
    for (let page = 1; ; page++) {
        const { data } = await apiClient.get(path, {
            params: { ...params, page, page_size: 100 },
            signal,
            skipAuth: true,
        });
        if (Array.isArray(data)) return data;
        rows.push(...data.results);
        if (!data.next) return rows;
    }
}
