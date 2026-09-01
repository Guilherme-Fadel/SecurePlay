import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';
const Landing = lazy(() => import('@/pages/Landing'));
const Start = lazy(() => import('@/pages/Start'));
const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));
const DashboardV2Page = lazy(() => import('@/prototypes/dashboard-v2/DashboardV2Page'));
const InviteRegister = lazy(() => import('@/pages/InviteRegister'));
export default function App() {
    const location = useLocation();
    return (<AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>}/>
        <Route path="/start" element={<Suspense fallback={null}><Start /></Suspense>}/>
        <Route path="/login" element={<PublicRoute><Suspense fallback={null}><Login /></Suspense></PublicRoute>}/>
        <Route path="/home" element={<PrivateRoute><Suspense fallback={null}><Home /></Suspense></PrivateRoute>}/>
        <Route path="/admin" element={<PrivateRoute><Navigate to="/home" state={{ initialSection: 'admin' }} replace /></PrivateRoute>}/>
        <Route path="/cadastro" element={<Suspense fallback={null}>
            <InviteRegister />
          </Suspense>}/>
        <Route path="/cadastro/:token" element={<LegacyInviteRedirect />}/>

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

function LegacyInviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/cadastro#${token ?? ''}`} replace />;
}
