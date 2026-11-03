import apiClient from "./apiClient.js";
export async function getArticles(page = 1, signal) {
    const { data } = await apiClient.get("homepage/articles/", {
        params: { page, page_size: 12 },
        signal,
        skipAuth: true,
    });
    return data;
}
export async function getArticle(slug, signal) {
    const { data } = await apiClient.get(
        `homepage/articles/${encodeURIComponent(slug)}/`,
        { signal, skipAuth: true },
    );
    return data;
}
export function articleDate(value) {
    if (!value || Number.isNaN(Date.parse(value))) return "";
    return new Intl.DateTimeFormat("fa-IR", {
        timeZone: "Asia/Tehran",
        dateStyle: "long",
    }).format(new Date(value));
}
