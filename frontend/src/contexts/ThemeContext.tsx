import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, } from 'react';
export type Theme = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'secureplay-theme';
interface ThemeContextProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);
function getInitialTheme(): Theme {
    if (typeof window === 'undefined')
        return 'dark';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light')
        return stored;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
    return prefersLight ? 'light' : 'dark';
}
function persistTheme(theme: Theme) {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    catch {
    }
}
interface ThemeProviderProps {
    children: ReactNode;
}
export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        persistTheme(next);
    }, []);
    const toggleTheme = useCallback(() => {
        setThemeState((current) => {
            const next = current === 'dark' ? 'light' : 'dark';
            persistTheme(next);
            return next;
        });
    }, []);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
        }
        else {
            root.removeAttribute('data-theme');
        }
        return () => {
            root.removeAttribute('data-theme');
        };
    }, [theme]);
    return (<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>);
}
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
export { ThemeContext };
