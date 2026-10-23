import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { initialAuthenticatedPath } from '@/components/admin/console/consoleNavigation';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';
const Landing = lazy(() => import('@/pages/Landing'));
const Start = lazy(() => import('@/pages/Start'));
const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const AdminConsole = lazy(() => import('@/pages/AdminConsole'));
const AdminGridPreview = import.meta.env.DEV ? lazy(() => import('@/pages/AdminGridPreview')) : null;
const InviteRegister = lazy(() => import('@/pages/InviteRegister'));
const StudentPasswordReset = lazy(() => import('@/pages/StudentPasswordReset'));
const TrialRegister = lazy(() => import('@/pages/TrialRegister'));
const TrialExpired = lazy(() => import('@/pages/TrialExpired'));
const CheckEmail = lazy(() => import('@/pages/EmailVerification').then((module) => ({ default: module.CheckEmail })));
const ConfirmEmail = lazy(() => import('@/pages/EmailVerification').then((module) => ({ default: module.ConfirmEmail })));
const PrivacyPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazy(() => import('@/pages/LegalPages').then((module) => ({ default: module.NotFoundPage })));
export default function App() {
    const location = useLocation();
    // A transicao de rota anima por segmento raiz. Sem isso, navegar entre secoes
    // (/home/ranking -> /home/conteudos) remontaria a Home inteira a cada aba.
    const animationKey = location.pathname.startsWith('/home') ? '/home' : location.pathname.startsWith('/admin') ? '/admin' : location.pathname;
    return (<AnimatePresence mode="wait">
      <Routes location={location} key={animationKey}>
        <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>}/>
        <Route path="/start" element={<Suspense fallback={null}><Start /></Suspense>}/>
        <Route path="/login" element={<PublicRoute><Suspense fallback={null}><Login /></Suspense></PublicRoute>}/>
        <Route path="/home/admin" element={<PrivateRoute><LegacyAdminRedirect /></PrivateRoute>}/>
        <Route path="/home/admin/*" element={<PrivateRoute><LegacyAdminRedirect /></PrivateRoute>}/>
        <Route path="/home/:section?/:moduloId?/:aulaId?" element={<PrivateRoute><Suspense fallback={null}><Home /></Suspense></PrivateRoute>}/>
        <Route path="/admin/*" element={<PrivateRoute><Suspense fallback={null}><AdminConsole /></Suspense></PrivateRoute>}/>
        {AdminGridPreview && <Route path="/__dev/admin-grid" element={<Suspense fallback={null}><AdminGridPreview /></Suspense>}/>}
        <Route path="/cadastro" element={<Suspense fallback={null}>
            <InviteRegister />
          </Suspense>}/>
        <Route path="/cadastro/:token" element={<LegacyInviteRedirect />}/>
        <Route path="/recuperar-acesso" element={<Suspense fallback={null}><StudentPasswordReset /></Suspense>}/>
        <Route path="/teste-gratuito" element={<PublicRoute><Suspense fallback={null}><TrialRegister /></Suspense></PublicRoute>}/>
        <Route path="/verifique-email" element={<Suspense fallback={null}><CheckEmail /></Suspense>}/>
        <Route path="/confirmar-email" element={<Suspense fallback={null}><ConfirmEmail /></Suspense>}/>
        <Route path="/teste-encerrado" element={<Suspense fallback={null}><TrialExpired /></Suspense>}/>
        <Route path="/privacidade" element={<Suspense fallback={null}><PrivacyPage /></Suspense>}/>
        <Route path="/termos" element={<Suspense fallback={null}><TermsPage /></Suspense>}/>
        <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>}/>
      </Routes>
    </AnimatePresence>);
}

function LegacyInviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/cadastro#${token ?? ''}`} replace />;
}

function LegacyAdminRedirect() {
  const { user } = useCurrentUser();
  return <Navigate to={initialAuthenticatedPath(user)} replace />;
}
