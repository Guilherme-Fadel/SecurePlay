import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';
import { useCurrentUser } from '@/hooks/useCurrentUser';
const Landing = lazy(() => import('@/pages/Landing'));
const Start = lazy(() => import('@/pages/Start'));
const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));
const DashboardV2Page = lazy(() => import('@/prototypes/dashboard-v2/DashboardV2Page'));
const InviteRegister = lazy(() => import('@/pages/InviteRegister'));
const PrivacyPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.NotFoundPage })));
export default function App() {
    const location = useLocation();
    // A transicao de rota anima por segmento raiz. Sem isso, navegar entre secoes
    // (/home/ranking -> /home/conteudos) remontaria a Home inteira a cada aba.
    const animationKey = location.pathname.startsWith('/home') ? '/home' : location.pathname;
    return (<AnimatePresence mode="wait">
      <Routes location={location} key={animationKey}>
        <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>}/>
        <Route path="/start" element={<Suspense fallback={null}><Start /></Suspense>}/>
        <Route path="/login" element={<PublicRoute><Suspense fallback={null}><Login /></Suspense></PublicRoute>}/>
        <Route path="/home/:section?/:moduloId?/:aulaId?" element={<PrivateRoute><Suspense fallback={null}><Home /></Suspense></PrivateRoute>}/>
        <Route path="/admin" element={<PrivateRoute><AdminEntry /></PrivateRoute>}/>
        <Route path="/cadastro" element={<Suspense fallback={null}>
            <InviteRegister />
          </Suspense>}/>
        <Route path="/cadastro/:token" element={<LegacyInviteRedirect />}/>
        <Route path="/privacidade" element={<Suspense fallback={null}><PrivacyPage /></Suspense>}/>
        <Route path="/termos" element={<Suspense fallback={null}><TermsPage /></Suspense>}/>

        <Route path="/prototipo-mapa" element={<Suspense fallback={<div style={{ padding: 24 }}>Carregando mapa...</div>}>
              <WorldMapPage />
            </Suspense>}/>

        <Route path="/prototipo-dashboard" element={<PrivateRoute>
              <Suspense fallback={<div style={{ padding: 24 }}>Carregando dashboard...</div>}>
                <DashboardV2Page />
          </Suspense>
        </PrivateRoute>}/>
        <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>}/>
      </Routes>
    </AnimatePresence>);
}

function LegacyInviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/cadastro#${token ?? ''}`} replace />;
}

/**
 * /admin nao renderiza tela propria, so aponta a secao dentro da Home. So leva a
 * secao admin quem tem a role; os demais caem no dashboard, sem montar a tela nem
 * disparar as chamadas administrativas. Roda dentro de PrivateRoute, entao o
 * usuario ja esta resolvido aqui. A autorizacao de verdade continua no backend.
 */
function AdminEntry() {
  const { user } = useCurrentUser();
  const allowed = user?.role === 'platform_admin';
  return <Navigate to={allowed ? '/home/admin' : '/home'} replace />;
}
