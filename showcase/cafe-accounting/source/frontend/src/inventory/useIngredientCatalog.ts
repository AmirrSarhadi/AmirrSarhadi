import { useCallback, useState } from "react";
import { Ingredient, inventoryApi } from "../shared/inventoryApi";
import { useResource } from "../shared/ui/useResource";

export function useIngredientCatalog(cafeId: string) {
  const [page, setPage] = useState(1);
  const [previous, setPrevious] = useState<Ingredient[]>([]);
  const loader = useCallback((signal: AbortSignal) => inventoryApi.ingredients(cafeId, page, signal, 100), [cafeId, page]);
  const resource = useResource(`${cafeId}:catalog:${page}`, loader);
  const options = [...previous, ...(resource.data?.results ?? [])];
  return { ...resource, options, loadMore: () => { setPrevious(options); setPage(page + 1); } };
}
export type Catalog = ReturnType<typeof useIngredientCatalog>;
