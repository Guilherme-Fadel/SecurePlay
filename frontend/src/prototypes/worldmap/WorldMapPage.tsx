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
  // embedded = renderiza dentro de um container (nao em tela cheia fixa).
  embedded?: boolean;
}

// Componente principal (TrainingMap). Orquestra a navegacao em dois niveis:
// Mapa Global (biomas) -> Bioma (fases) -> Modal de fase.
export default function WorldMapPage({ embedded = false }: WorldMapPageProps) {
  const [biomes, setBiomes] = useState<Biome[]>(MOCK_BIOMES);
  const [selectedBiomeId, setSelectedBiomeId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [editMode, setEditMode] = useState(false);

  // edicao de regiao (poligono) no mapa global
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
    // eslint-disable-next-line no-console
    console.log(
      '[TrainingMap] Iniciar fase:',
      selectedBiomeId,
      level.id,
      level.name,
    );
    setSelectedLevel(null);
  };

  // Reposiciona uma fase do bioma atual (modo edicao / calibragem de layout).
  const handleReposition = (levelId: number, x: number, y: number) => {
    if (!selectedBiomeId) return;
    setBiomes((prev) =>
      prev.map((b) =>
        b.id !== selectedBiomeId
          ? b
          : {
              ...b,
              levels: b.levels.map((l) =>
                l.id === levelId ? { ...l, position: { x, y } } : l,
              ),
            },
      ),
    );
  };

  // Reposiciona o hotspot/rotulo de um bioma no mapa global.
  const handleRepositionBiome = (biomeId: string, x: number, y: number) => {
    setBiomes((prev) =>
      prev.map((b) => (b.id === biomeId ? { ...b, hotspot: { x, y } } : b)),
    );
  };

  // --- Edicao de regiao (poligono) ---

  // Ao escolher um bioma para editar, carrega a regiao existente como rascunho.
  const startEditingRegion = (biomeId: string) => {
    setEditingBiomeId(biomeId);
    const b = biomes.find((x) => x.id === biomeId);
    setDraftPoints(b?.region ? [...b.region] : []);
  };

  const addRegionPoint = (x: number, y: number) => {
    if (!editingBiomeId) return;
    setDraftPoints((prev) => [...prev, { x, y }]);
  };

  const undoRegionPoint = () => setDraftPoints((prev) => prev.slice(0, -1));

  const clearRegion = () => setDraftPoints([]);

  // Salva o rascunho como regiao do bioma em edicao.
  // Alem de atualizar o estado local, grava direto no mockData.ts via o
  // endpoint de dev (devSaveRegionPlugin). Assim o valor persiste no codigo.
  const saveRegion = async () => {
    if (!editingBiomeId) return;
    // atualiza estado local (efeito imediato na tela)
    setBiomes((prev) =>
      prev.map((b) =>
        b.id === editingBiomeId ? { ...b, region: [...draftPoints] } : b,
      ),
    );
    // persiste no arquivo (apenas em dev)
    try {
      const res = await fetch('/__save-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biomeId: editingBiomeId, points: draftPoints }),
      });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn('[WorldMap] Falha ao gravar regiao no arquivo:', await res.text());
        return false;
      }
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[WorldMap] Endpoint de gravacao indisponivel:', err);
      return false;
    }
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

  return (
    <div className={`wm-root ${embedded ? 'wm-root-embedded' : ''}`}>
      <Header completed={completed} total={total} />

      <div className="wm-stage">
        <AnimatePresence mode="wait">
          {selectedBiome ? (
            <BiomeView
              key={selectedBiome.id}
              biome={selectedBiome}
              onSelectLevel={setSelectedLevel}
              onBack={() => setSelectedBiomeId(null)}
              editMode={editMode}
              onReposition={handleReposition}
            />
          ) : (
            <WorldMap
              key="global"
              biomes={biomes}
              onSelectBiome={(b) => setSelectedBiomeId(b.id)}
              editMode={editMode}
              onRepositionBiome={handleRepositionBiome}
              editingBiomeId={editingBiomeId}
              draftPoints={draftPoints}
              onAddRegionPoint={addRegionPoint}
            />
          )}
        </AnimatePresence>

        <button
          className={`wm-edit-toggle ${editMode ? 'active' : ''}`}
          onClick={toggleEdit}
        >
          {editMode ? 'Editando: ON' : 'Editar'}
        </button>

        {/* No mapa global, o modo edicao desenha regioes (poligonos). */}
        {editMode && isGlobal && (
          <RegionEditPanel
            biomes={biomes}
            editingBiomeId={editingBiomeId}
            draftPoints={draftPoints}
            onPickBiome={startEditingRegion}
            onUndo={undoRegionPoint}
            onClear={clearRegion}
            onSave={saveRegion}
          />
        )}

        {/* Dentro de um bioma, o modo edicao move as fases (como antes). */}
        {editMode && !isGlobal && (
          <EditPanel biome={selectedBiome} biomes={biomes} />
        )}

        {!editMode && (
          <LevelModal
            level={selectedLevel}
            onClose={() => setSelectedLevel(null)}
            onStart={handleStart}
          />
        )}
      </div>
    </div>
  );
}
