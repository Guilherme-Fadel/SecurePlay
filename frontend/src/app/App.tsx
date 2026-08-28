import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';

import Landing from '@/pages/Landing';
import Start from '@/pages/Start';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
// PROTOTIPO ISOLADO - mapa 2D pixel art. Carregado sob demanda (lazy) para
// nao inflar o bundle principal com o Phaser. Remover esta linha e a rota abaixo para descartar.
const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));
const DashboardV2Page = lazy(() => import('@/prototypes/dashboard-v2/DashboardV2Page'));
const Admin = lazy(() => import('@/pages/Admin'));

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/home" element={ <PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/admin" element={
          <PrivateRoute>
            <Suspense fallback={null}>
              <Admin />
            </Suspense>
          </PrivateRoute>
        } />
        {/* PROTOTIPO ISOLADO - mapa 2D pixel art (sem auth). Remover para descartar. */}
        <Route
          path="/prototipo-mapa"
          element={
            <Suspense fallback={<div style={{ padding: 24 }}>Carregando mapa...</div>}>
              <WorldMapPage />
            </Suspense>
          }
        />
        {/* PROTOTIPO ISOLADO - dashboard v2 (requer auth). Remover para descartar. */}
        <Route
          path="/prototipo-dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<div style={{ padding: 24 }}>Carregando dashboard...</div>}>
                <DashboardV2Page />
              </Suspense>
            </PrivateRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
