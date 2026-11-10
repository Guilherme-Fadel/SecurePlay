import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { initialAuthenticatedPath } from '@/components/admin/console/consoleNavigation';
import { isStudentAreaPath, legacyHomeTarget } from '@/lib/appPaths';
import { PrivateRoute, PublicRoute } from '@/routes/PrivateRoute';
import { PageLoading } from '@/components/shared/PageLoading';
const Landing = lazy(() => import('@/pages/Landing'));
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
    // A transicao de rota anima por area. Sem isso, navegar entre secoes do aluno
    // (/ranking -> /aprender) remontaria a Home inteira a cada aba.
    const animationKey = isStudentAreaPath(location.pathname) ? 'student' : location.pathname.startsWith('/admin') ? '/admin' : location.pathname;
    return (<AnimatePresence mode="wait">
      <Routes location={location} key={animationKey}>
        <Route path="/" element={<Suspense fallback={<PageLoading />}><Landing /></Suspense>}/>
        {/* /start foi aposentada (D20); links antigos caem na landing. */}
        <Route path="/start" element={<Navigate to="/" replace />}/>
        <Route path="/login" element={<PublicRoute><Suspense fallback={<PageLoading />}><Login /></Suspense></PublicRoute>}/>
        <Route path="/home/admin" element={<PrivateRoute><LegacyAdminRedirect /></PrivateRoute>}/>
        <Route path="/home/admin/*" element={<PrivateRoute><LegacyAdminRedirect /></PrivateRoute>}/>
        {/* Area do aluno: uma Home so para todas as secoes. Ela le a secao da URL, sem Outlet. */}
        <Route element={<PrivateRoute><Suspense fallback={<PageLoading />}><Home /></Suspense></PrivateRoute>}>
          <Route path="/inicio"/>
          <Route path="/aprender"/>
          <Route path="/aprender/:moduloRef"/>
          <Route path="/aprender/:moduloRef/:aulaRef"/>
          <Route path="/jogos"/>
          <Route path="/ranking"/>
          <Route path="/conquistas"/>
          <Route path="/perfil"/>
        </Route>
        {/* Links antigos (/home/...) seguem funcionando e caem no caminho novo. */}
        <Route path="/home/*" element={<LegacyHomeRedirect />}/>
        <Route path="/admin/*" element={<PrivateRoute><Suspense fallback={<PageLoading />}><AdminConsole /></Suspense></PrivateRoute>}/>
        {AdminGridPreview && <Route path="/__dev/admin-grid" element={<Suspense fallback={<PageLoading />}><AdminGridPreview /></Suspense>}/>}
        <Route path="/cadastro" element={<Suspense fallback={<PageLoading />}>
            <InviteRegister />
          </Suspense>}/>
        <Route path="/cadastro/:token" element={<LegacyInviteRedirect />}/>
        <Route path="/recuperar-acesso" element={<Suspense fallback={<PageLoading />}><StudentPasswordReset /></Suspense>}/>
        <Route path="/teste-gratuito" element={<PublicRoute><Suspense fallback={<PageLoading />}><TrialRegister /></Suspense></PublicRoute>}/>
        <Route path="/verifique-email" element={<Suspense fallback={<PageLoading />}><CheckEmail /></Suspense>}/>
        <Route path="/confirmar-email" element={<Suspense fallback={<PageLoading />}><ConfirmEmail /></Suspense>}/>
        <Route path="/teste-encerrado" element={<Suspense fallback={<PageLoading />}><TrialExpired /></Suspense>}/>
        <Route path="/privacidade" element={<Suspense fallback={<PageLoading />}><PrivacyPage /></Suspense>}/>
        <Route path="/termos" element={<Suspense fallback={<PageLoading />}><TermsPage /></Suspense>}/>
        <Route path="*" element={<Suspense fallback={<PageLoading />}><NotFoundPage /></Suspense>}/>
      </Routes>
    </AnimatePresence>);
}

function LegacyInviteRedirect() {
  const { token } = useParams();
  return <Navigate to={`/cadastro#${token ?? ''}`} replace />;
}

function LegacyHomeRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={{ pathname: legacyHomeTarget(pathname), search, hash }} replace />;
}

function LegacyAdminRedirect() {
  const { user } = useCurrentUser();
  return <Navigate to={initialAuthenticatedPath(user)} replace />;
}
