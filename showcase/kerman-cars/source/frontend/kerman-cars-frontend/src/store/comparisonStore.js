import { create } from "zustand";
import { COMPARISON_LIMIT } from "../services/comparisonData";
// Selection is temporary; shareable comparison state belongs to the URL.
const useComparisonStore = create((set) => ({
    ids: [],
    setIds: (ids) => set({ ids: ids.slice(0, COMPARISON_LIMIT) }),
    toggle: (id) =>
        set((state) => ({
            ids: state.ids.includes(id)
                ? state.ids.filter((item) => item !== id)
                : state.ids.length < COMPARISON_LIMIT
                  ? [...state.ids, id]
                  : state.ids,
        })),
    clear: () => set({ ids: [] }),
}));
export default useComparisonStore;
