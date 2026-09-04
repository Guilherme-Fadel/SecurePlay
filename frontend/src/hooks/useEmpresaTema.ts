import { useLayoutEffect } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useTheme } from '@/contexts/ThemeContext';
const isValidHex = (color: string): boolean => /^#[0-9a-fA-F]{6}$/.test(color);
const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result)
        return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};
function hexToHsl(hex: string): [
    number,
    number,
    number
] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result)
        return [0, 0, 0];
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h: number, s: number, l: number): string {
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    const sn = s / 100;
    const ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = ln - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) {
        r = c;
        g = x;
    }
    else if (h < 120) {
        r = x;
        g = c;
    }
    else if (h < 180) {
        g = c;
        b = x;
    }
    else if (h < 240) {
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        b = c;
    }
    else {
        r = c;
        b = x;
    }
    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
export function buildBrandVars(paleta: {
    primary: string;
    secondary: string;
    accent: string;
}): Record<string, string> {
    const [ph, ps, pl] = hexToHsl(paleta.primary);
    const [sh, ss, sl] = hexToHsl(paleta.secondary);
    const [ah, as, al] = hexToHsl(paleta.accent);
    return {
        '--primary': paleta.primary,
        '--primary-rgb': hexToRgb(paleta.primary),
        '--primary-light': hslToHex(ph, ps, Math.min(pl + 15, 85)),
        '--primary-dark': hslToHex(ph, ps, Math.max(pl - 15, 15)),
        '--primary-hover': hslToHex(ph, ps, Math.max(pl - 8, 20)),
        '--secondary': paleta.secondary,
        '--secondary-rgb': hexToRgb(paleta.secondary),
        '--secondary-light': hslToHex(sh, ss, Math.min(sl + 15, 85)),
        '--secondary-light-rgb': hexToRgb(hslToHex(sh, ss, Math.min(sl + 15, 85))),
        '--secondary-dark': hslToHex(sh, ss, Math.max(sl - 15, 15)),
        '--secondary-hover': hslToHex(sh, ss, Math.max(sl - 8, 20)),
        '--accent': paleta.accent,
        '--accent-rgb': hexToRgb(paleta.accent),
        '--accent-light': hslToHex(ah, as, Math.min(al + 15, 85)),
        '--accent-dark': hslToHex(ah, as, Math.max(al - 15, 15)),
        '--accent-hover': hslToHex(ah, as, Math.max(al - 8, 20)),
    };
}
export function useEmpresaTema() {
    const { user } = useCurrentUser();
    const { theme } = useTheme();
    useLayoutEffect(() => {
        const paleta = user?.empresa_paleta;
        if (!paleta || !isValidHex(paleta.primary))
            return;
        const root = document.documentElement;
        const vars = buildBrandVars(paleta);
        const applied: string[] = [];
        Object.entries(vars).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
            applied.push(prop);
        });
        return () => {
            applied.forEach((prop) => root.style.removeProperty(prop));
        };
    }, [user?.empresa_paleta, theme]);
}
