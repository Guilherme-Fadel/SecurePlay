import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { WorldMap } from './components/WorldMap';
import { BiomeView } from './components/BiomeView';
import { LevelModal } from './components/LevelModal';
import { EditPanel } from './components/EditPanel';
import { RegionEditPanel } from './components/RegionEditPanel';
import { MOCK_BIOMES } from './mockData';
import type { Biome, Level, Position } from './types';
import './worldmap.css';
interface WorldMapPageProps {
    embedded?: boolean;
}
export default function WorldMapPage({ embedded = false }: WorldMapPageProps) {
    const editorEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_WORLDMAP_EDITOR === 'true';
    const [biomes, setBiomes] = useState<Biome[]>(MOCK_BIOMES);
    const [selectedBiomeId, setSelectedBiomeId] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editingBiomeId, setEditingBiomeId] = useState<string | null>(null);
    const [draftPoints, setDraftPoints] = useState<Position[]>([]);
    const selectedBiome = biomes.find((b) => b.id === selectedBiomeId) ?? null;
    const { completed, total } = useMemo(() => {
        const all = biomes.flatMap((b) => b.levels);
        return {
            completed: all.filter((l) => l.status === 'COMPLETED').length,
            total: all.length,
        };
    }, [biomes]);
    const handleStart = (level: Level) => {
        console.log('[TrainingMap] Iniciar fase:', selectedBiomeId, level.id, level.name);
        setSelectedLevel(null);
    };
    const handleReposition = (levelId: number, x: number, y: number) => {
        if (!selectedBiomeId)
            return;
        setBiomes((prev) => prev.map((b) => b.id !== selectedBiomeId
            ? b
            : {
                ...b,
                levels: b.levels.map((l) => l.id === levelId ? { ...l, position: { x, y } } : l),
            }));
    };
    const handleRepositionBiome = (biomeId: string, x: number, y: number) => {
        setBiomes((prev) => prev.map((b) => (b.id === biomeId ? { ...b, hotspot: { x, y } } : b)));
    };
    const startEditingRegion = (biomeId: string) => {
        setEditingBiomeId(biomeId);
        const b = biomes.find((x) => x.id === biomeId);
        setDraftPoints(b?.region ? [...b.region] : []);
    };
    const addRegionPoint = (x: number, y: number) => {
        if (!editingBiomeId)
            return;
        setDraftPoints((prev) => [...prev, { x, y }]);
    };
    const undoRegionPoint = () => setDraftPoints((prev) => prev.slice(0, -1));
    const clearRegion = () => setDraftPoints([]);
    const saveRegion = async () => {
        if (!editingBiomeId)
            return false;
        setBiomes((prev) => prev.map((b) => b.id === editingBiomeId ? { ...b, region: [...draftPoints] } : b));
        return true;
    };
    const toggleEdit = () => {
        setEditMode((v) => {
            const next = !v;
            if (!next) {
                setEditingBiomeId(null);
                setDraftPoints([]);
            }
            return next;
        });
    };
    const isGlobal = !selectedBiome;
    return (<div className={`wm-root ${embedded ? 'wm-root-embedded' : ''}`}>
      <Header completed={completed} total={total}/>

      <div className="wm-stage">
        <AnimatePresence mode="wait">
          {selectedBiome ? (<BiomeView key={selectedBiome.id} biome={selectedBiome} onSelectLevel={setSelectedLevel} onBack={() => setSelectedBiomeId(null)} editMode={editMode} onReposition={handleReposition}/>) : (<WorldMap key="global" biomes={biomes} onSelectBiome={(b) => setSelectedBiomeId(b.id)} editMode={editMode} onRepositionBiome={handleRepositionBiome} editingBiomeId={editingBiomeId} draftPoints={draftPoints} onAddRegionPoint={addRegionPoint}/>)}
        </AnimatePresence>

        {editorEnabled && <button className={`wm-edit-toggle ${editMode ? 'active' : ''}`} onClick={toggleEdit}>
          {editMode ? 'Editando: ON' : 'Editar'}
        </button>}


        {editorEnabled && editMode && isGlobal && (<RegionEditPanel biomes={biomes} editingBiomeId={editingBiomeId} draftPoints={draftPoints} onPickBiome={startEditingRegion} onUndo={undoRegionPoint} onClear={clearRegion} onSave={saveRegion}/>)}


        {editorEnabled && editMode && !isGlobal && (<EditPanel biome={selectedBiome} biomes={biomes}/>)}

        {!editMode && (<LevelModal level={selectedLevel} onClose={() => setSelectedLevel(null)} onStart={handleStart}/>)}
      </div>
    </div>);
}
