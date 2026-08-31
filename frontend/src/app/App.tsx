import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';
import Landing from '@/pages/Landing';
import Start from '@/pages/Start';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));
const DashboardV2Page = lazy(() => import('@/prototypes/dashboard-v2/DashboardV2Page'));
const InviteRegister = lazy(() => import('@/pages/InviteRegister'));
export default function App() {
    const location = useLocation();
    return (<AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />}/>
        <Route path="/start" element={<Start />}/>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>}/>
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>}/>
        <Route path="/admin" element={<PrivateRoute><Navigate to="/home" state={{ initialSection: 'admin' }} replace /></PrivateRoute>}/>
        <Route path="/cadastro/:token" element={<Suspense fallback={null}>
            <InviteRegister />
          </Suspense>}/>

        <Route path="/prototipo-mapa" element={<Suspense fallback={<div style={{ padding: 24 }}>Carregando mapa...</div>}>
              <WorldMapPage />
            </Suspense>}/>

        <Route path="/prototipo-dashboard" element={<PrivateRoute>
              <Suspense fallback={<div style={{ padding: 24 }}>Carregando dashboard...</div>}>
                <DashboardV2Page />
              </Suspense>
            </PrivateRoute>}/>
      </Routes>
    </AnimatePresence>);
}
