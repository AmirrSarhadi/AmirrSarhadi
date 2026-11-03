import axios from "axios";

export async function getAllPages(url, config = {}) {
  const first = await axios.get(url, config);
  if (!Array.isArray(first.data?.results)) return first;
  const rows = [...first.data.results];
  let next = first.data.next;
  let currentUrl = new URL(first.config?.url || url, globalThis.location?.origin || "http://localhost").href;
  const origin = new URL(currentUrl, globalThis.location?.origin || "http://localhost").origin;
  const visited = new Set([new URL(currentUrl, globalThis.location?.origin || "http://localhost").href]);
  while (next) {
    const resolved = new URL(next, currentUrl);
    if (resolved.origin !== origin || visited.has(resolved.href)) throw new Error("Invalid pagination link");
    visited.add(resolved.href);
    const response = await axios.get(resolved.href, { ...config, params: undefined });
    if (!Array.isArray(response.data?.results)) throw new Error("Invalid paginated response");
    rows.push(...response.data.results);
    next = response.data.next;
    currentUrl = resolved.href;
  }
  return { ...first, data: rows };
}
