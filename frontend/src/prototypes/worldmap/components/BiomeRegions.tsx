import { useRef, useState } from 'react';
import type { Biome } from '../types';
interface BiomeRegionsProps {
    biomes: Biome[];
    onSelectBiome: (biome: Biome) => void;
    editMode: boolean;
    editingBiomeId: string | null;
    draftPoints: {
        x: number;
        y: number;
    }[];
    onAddPoint: (x: number, y: number) => void;
}
export function BiomeRegions({ biomes, onSelectBiome, editMode, editingBiomeId, draftPoints, onAddPoint, }: BiomeRegionsProps) {
    const [hovered, setHovered] = useState<string | null>(null);
    const drawing = useRef(false);
    const lastPoint = useRef<{
        x: number;
        y: number;
    } | null>(null);
    const MIN_DIST = 0.5;
    const toPercent = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        return { x: +x.toFixed(1), y: +y.toFixed(1) };
    };
    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!editMode || !editingBiomeId)
            return;
        if (lastPoint.current)
            return;
        const p = toPercent(e);
        onAddPoint(p.x, p.y);
    };
    const handlePointerDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!editMode || !editingBiomeId)
            return;
        drawing.current = true;
        const p = toPercent(e);
        onAddPoint(p.x, p.y);
        lastPoint.current = p;
    };
    const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!drawing.current || !editMode || !editingBiomeId)
            return;
        const p = toPercent(e);
        const lp = lastPoint.current;
        if (lp) {
            const dist = Math.hypot(p.x - lp.x, p.y - lp.y);
            if (dist < MIN_DIST)
                return;
        }
        onAddPoint(p.x, p.y);
        lastPoint.current = p;
    };
    const handlePointerUp = () => {
        if (!drawing.current)
            return;
        drawing.current = false;
        setTimeout(() => {
            lastPoint.current = null;
        }, 0);
    };
    const toPoints = (pts: {
        x: number;
        y: number;
    }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');
    return (<svg className={`wm-regions ${editMode ? 'wm-regions-edit' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" onClick={handleSvgClick} onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}>

      {biomes.map((biome) => {
            const pts = biome.region;
            if (!pts || pts.length < 3)
                return null;
            const isHover = hovered === biome.id;
            return (<polygon key={biome.id} points={toPoints(pts)} className="wm-region" style={{
                    fill: isHover ? `${biome.accent}55` : 'transparent',
                    stroke: isHover ? biome.accent : 'transparent',
                }} onMouseEnter={() => !editMode && setHovered(biome.id)} onMouseLeave={() => setHovered(null)} onClick={() => {
                    if (!editMode)
                        onSelectBiome(biome);
                }}/>);
        })}


      {editMode && editingBiomeId && draftPoints.length > 0 && (<>
          {draftPoints.length >= 2 && (<polyline points={toPoints(draftPoints)} className="wm-region-draft-line"/>)}
          {draftPoints.length >= 3 && (<polygon points={toPoints(draftPoints)} className="wm-region-draft-fill"/>)}
          {draftPoints.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={0.8} className="wm-region-vertex"/>))}
        </>)}
    </svg>);
}
