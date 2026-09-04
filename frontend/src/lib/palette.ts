import { EmpresaPaleta } from '@/services/me';

/**
 * Conversao de cor e derivacao de paleta. Funcoes puras, sem dependencia de UI.
 */
export function hexToHsl(hex: string): [number, number, number] {
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

export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    // Setor de 60 graus define quais canais recebem c/x/0, sem cadeia if/else.
    const sector = Math.min(5, Math.floor(h / 60));
    const [r, g, b] = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x],
    ][sector];
    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function derivePalette(primaryHex: string): EmpresaPaleta {
    const [h, s, l] = hexToHsl(primaryHex);
    const secondary = hslToHex((h + 180) % 360, Math.min(s, 80), Math.max(l, 40));
    const accent = hslToHex((h + 60) % 360, Math.min(s + 10, 100), Math.min(l + 10, 60));
    const isDark = l < 50;
    return {
        primary: primaryHex,
        secondary,
        accent,
        text_primary: isDark ? '#ECECEC' : '#1E293B',
        text_secondary: isDark ? '#94a3b8' : '#475569',
    };
}
