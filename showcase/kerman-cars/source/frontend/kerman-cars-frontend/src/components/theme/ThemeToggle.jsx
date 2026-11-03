import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import useThemeStore, { preferredTheme } from '../../store/themeStore';
import './ThemeToggle.scss';
export function ThemeSync() {
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = () => useThemeStore.getState().setTheme(preferredTheme(), false);
        const storage = event => { if (event.key === 'kc-theme') sync(); };
        sync(); media.addEventListener('change', sync); window.addEventListener('storage', storage);
        return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', storage); };
    }, []);
    return null;
}
export default function ThemeToggle() {
    const theme = useThemeStore(s => s.theme);
    const setTheme = useThemeStore(s => s.setTheme);
    const label = theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره';
    return <button type="button" className="theme-toggle" title={label} aria-label={label} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>;
}
