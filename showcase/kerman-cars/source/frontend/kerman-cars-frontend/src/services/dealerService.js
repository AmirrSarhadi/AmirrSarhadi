import { normalizeDealer } from "./dealerData.js";
import apiClient from "./apiClient.js";
import { normalizeListing } from "./listingData.js";

export async function getDealers(params, signal) {
    const { data } = await apiClient.get("dealers/", { params, signal });
    return { ...data, results: data.results.map(normalizeDealer) };
}
export async function getDealer(slug, signal) {
    return normalizeDealer(
        (
            await apiClient.get(`dealers/${encodeURIComponent(slug)}/`, {
                signal,
            })
        ).data,
    );
}
export async function getDealerListings(slug, page, signal) {
    const { data } = await apiClient.get(
        `dealers/${encodeURIComponent(slug)}/listings/`,
        { params: { page, page_size: 12 }, signal },
    );
    return { ...data, results: data.results.map(normalizeListing) };
}
