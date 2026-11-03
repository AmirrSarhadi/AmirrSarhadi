export const COMPARISON_LIMIT = 3;
export function parseComparisonIds(value = "") {
    if (!value) return { ids: [], error: "" };
    const parts = value.split(",");
    const ids = parts.map(Number);
    if (
        parts.some((part) => !/^[1-9]\d*$/.test(part)) ||
        ids.some((id) => !Number.isSafeInteger(id)) ||
        ids.length > COMPARISON_LIMIT ||
        new Set(ids).size !== ids.length
    ) {
        return {
            ids: [],
            error: "برای مقایسه، یک تا سه خودروی متفاوت انتخاب کنید.",
        };
    }
    return { ids, error: "" };
}
