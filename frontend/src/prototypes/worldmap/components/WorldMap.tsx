import { useRef } from 'react';
import { motion, useMotionValue, type PanInfo } from 'framer-motion';
import type { Biome, Position } from '../types';
import { BiomeRegions } from './BiomeRegions';
interface WorldMapProps {
    biomes: Biome[];
    onSelectBiome: (biome: Biome) => void;
    editMode: boolean;
    onRepositionBiome: (biomeId: string, x: number, y: number) => void;
    editingBiomeId: string | null;
    draftPoints: Position[];
    onAddRegionPoint: (x: number, y: number) => void;
}
const GLOBAL_MAP_VIDEO = '/prototypes/worldmap/global-map.mp4';
const GLOBAL_MAP_POSTER = '/prototypes/worldmap/global-map.png';
export function WorldMap({ biomes, onSelectBiome, editMode, onRepositionBiome, editingBiomeId, draftPoints, onAddRegionPoint, }: WorldMapProps) {
    return (<motion.div className="wm-screen" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4, ease: 'easeInOut' }}>

      <video className="wm-global-ambient" src={GLOBAL_MAP_VIDEO} autoPlay loop muted playsInline disablePictureInPicture aria-hidden="true" tabIndex={-1}/>

      <div className="wm-global-wrap">
        <video className="wm-global-img" src={GLOBAL_MAP_VIDEO} poster={GLOBAL_MAP_POSTER} autoPlay loop muted playsInline disablePictureInPicture draggable={false}/>


        <BiomeRegions biomes={biomes} onSelectBiome={onSelectBiome} editMode={editMode} editingBiomeId={editingBiomeId} draftPoints={draftPoints} onAddPoint={onAddRegionPoint}/>

        {biomes.map((biome) => (<Hotspot key={biome.id} biome={biome} editMode={editMode} hasRegion={!!biome.region && biome.region.length >= 3} onSelect={onSelectBiome} onReposition={onRepositionBiome}/>))}


        <div className="wm-global-frame" aria-hidden="true"/>
      </div>
    </motion.div>);
}
interface HotspotProps {
    biome: Biome;
    editMode: boolean;
    hasRegion: boolean;
    onSelect: (biome: Biome) => void;
    onReposition: (biomeId: string, x: number, y: number) => void;
}
function Hotspot({ biome, editMode, hasRegion, onSelect, onReposition, }: HotspotProps) {
    const labelOnly = hasRegion && !editMode;
    const ref = useRef<HTMLButtonElement>(null);
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const handleDragEnd = (_e: unknown, _info: PanInfo) => {
        const el = ref.current;
        const parent = el?.parentElement;
        if (!el || !parent)
            return;
        const nodeRect = el.getBoundingClientRect();
        const rect = parent.getBoundingClientRect();
        const centerX = nodeRect.left + nodeRect.width / 2;
        const centerY = nodeRect.top + nodeRect.height / 2;
        const x = ((centerX - rect.left) / rect.width) * 100;
        const y = ((centerY - rect.top) / rect.height) * 100;
        dragX.set(0);
        dragY.set(0);
        onReposition(biome.id, +Math.max(0, Math.min(100, x)).toFixed(1), +Math.max(0, Math.min(100, y)).toFixed(1));
    };
    return (<motion.button ref={ref} className={`wm-hotspot ${editMode ? 'wm-hotspot-editing' : ''} ${labelOnly ? 'wm-hotspot-label' : ''}`} style={{
            left: `${biome.hotspot.x}%`,
            top: `${biome.hotspot.y}%`,
            borderColor: biome.accent,
            x: dragX,
            y: dragY,
        }} onClick={() => {
            if (!editMode && !hasRegion)
                onSelect(biome);
        }} drag={editMode} dragMomentum={false} dragElastic={0} onDragEnd={handleDragEnd} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      {!editMode && (<motion.span className="wm-hotspot-ring" style={{ borderColor: biome.accent }} animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}/>)}
      <strong>{biome.name}</strong>
      <small>
        {editMode ? `${biome.hotspot.x}, ${biome.hotspot.y}` : biome.subtitle}
      </small>
    </motion.button>);
}
