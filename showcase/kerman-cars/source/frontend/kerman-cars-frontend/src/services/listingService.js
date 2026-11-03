import apiClient from "./apiClient.js";
import { normalizeListing } from "./listingData.js";
import queryClient from "./queryClient.js";

export async function getListings(params = {}, signal) {
    const { data } = await apiClient.get("listings/", {
        params: Object.fromEntries(
            Object.entries(params).filter(
                ([, value]) => value !== "" && value != null,
            ),
        ),
        signal,
    });
    return { ...data, results: data.results.map(normalizeListing) };
}
export async function getMyListings(params = {}, signal) {
    const { data } = await apiClient.get("listings/mine/", { params, signal });
    return { ...data, results: data.results.map(normalizeListing) };
}
export async function getListing(identifier, signal) {
    const path = /^\d+$/.test(String(identifier))
        ? `listings/${identifier}/`
        : `listings/by-slug/${encodeURIComponent(identifier)}/`;
    const { data } = await apiClient.get(path, { signal });
    await queryClient.invalidateQueries({ queryKey: ["view-history"] });
    return normalizeListing(data);
}
export function invalidateListings() {
    return Promise.all(
        [
            "listings",
            "related-listings",
            "listing-comparison",
            "my-listings",
            "listing",
            "homepage-listings",
            "favorites",
            "view-history",
            "notifications",
            "dealer-subscription",
            "dealer-history",
            "dealer-analytics",
        ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
}
export async function saveListing(
    id,
    values,
    files,
    keepImageIds,
    onUploadProgress,
) {
    let body = values;
    if (files.length) {
        body = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined)
                body.append(key, value === null ? "" : String(value));
        });
        if (id) body.append("keep_image_ids", JSON.stringify(keepImageIds));
        files.forEach((file) => body.append("images", file));
    } else if (id) body = { ...values, keep_image_ids: keepImageIds };
    const { data } = await apiClient.request({
        method: id ? "PATCH" : "POST",
        url: id ? `listings/${id}/` : "listings/",
        data: body,
        onUploadProgress,
    });
    await invalidateListings();
    return data;
}
export async function listingAction(id, action) {
    const response = await apiClient.post(`listings/${id}/${action}/`, {});
    await invalidateListings();
    return response.data;
}
export async function deleteListing(id) {
    await apiClient.delete(`listings/${id}/`);
    await invalidateListings();
}

export async function getComparison(ids, signal) {
    const { data } = await apiClient.get("listings/compare/", { params: { ids: ids.join(",") }, signal });
    return { ...data, results: data.results.map(normalizeListing) };
}

export async function getRelatedListings(id, signal) {
    const { data } = await apiClient.get(`listings/${id}/related/`, { signal });
    return data.map(normalizeListing);
}
