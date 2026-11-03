import apiClient from "./apiClient.js";
import { normalizeListing } from "./listingData.js";
import { invalidateListings } from "./listingService.js";

export async function getFavorites(params = {}, signal) {
    const { data } = await apiClient.get("engagement/favorites/", {
        params,
        signal,
    });
    return {
        ...data,
        results: data.results.map((row) => normalizeListing(row.listing)),
    };
}
export async function toggleFavorite(id) {
    const { data } = await apiClient.post("engagement/favorites/toggle/", {
        listing_id: id,
    });
    await invalidateListings();
    return data;
}
export async function clearFavorites() {
    await apiClient.delete("engagement/favorites/");
    await invalidateListings();
}
export async function recordInteraction(id, eventType) {
    return apiClient.post("engagement/interactions/", {
        listing_id: id,
        event_type: eventType,
    });
}
