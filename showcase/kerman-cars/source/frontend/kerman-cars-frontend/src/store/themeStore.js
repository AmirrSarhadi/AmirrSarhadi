import { create } from 'zustand';
export function preferredTheme() {
    try { const value = localStorage.getItem('kc-theme'); if (value === 'light' || value === 'dark') return value; } catch { /* Theme remains usable when storage is unavailable. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const initialTheme = document.documentElement.dataset.theme || preferredTheme();
const useThemeStore = create(set => ({ theme: initialTheme, setTheme(theme, persist = true) {
    document.documentElement.dataset.theme = theme;
    if (persist) { try { localStorage.setItem('kc-theme', theme); } catch { /* A tab-local preference is sufficient. */ } }
    set({ theme });
} }));
export default useThemeStore;
