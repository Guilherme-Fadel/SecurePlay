import { PageTransition } from '@/components/shared/PageTransition';
import { PageLoading } from '@/components/shared/PageLoading';
import { usePageLoading } from '@/contexts/PageLoadingContext';
import { NicknameWelcomeDialog } from '@/components/shared/NicknameWelcomeDialog';
import { AppRail } from '@/components/shared/AppRail';
import { ArrowLeft } from "lucide-react";
import { Dashboard, Awards, Challenges, Ranking, Conteudos, Perfil } from '@/components/sections/HomePage/index';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SectionContext, type ContentTarget } from '@/contexts/SectionContext';
import { useHomeLoading } from '@/hooks/useHomeLoading';
import { useEmpresaTema } from '@/hooks/useEmpresaTema';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVisualPreload } from '@/hooks/useVisualPreload';
import '@/styles/app-ui.css';
import '@/styles/dashboard-ui.css';
import '@/styles/notebook-ui.css';
import '@/styles/home-sections.css';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { companyIdentityKey } from '@/config/features';
import type { CurrentUser } from '@/services/me';
import { initialAuthenticatedPath } from '@/components/admin/console/consoleNavigation';
import { parseStudentPath, paths, studentSectionPath, type StudentLocation } from '@/lib/appPaths';
const Admin = lazy(() => import('@/pages/Admin'));
export type Section = 'dashboard' | 'desafios' | 'ranking' | 'conquistas' | 'conteudos' | 'perfil' | 'admin';
const DEFAULT_SECTION: Section = 'dashboard';

/**
 * Secoes que exigem role. Isso e conveniencia de interface, nao seguranca: quem
 * garante o acesso e o RolesGuard no backend. Serve para nao montar a tela nem
 * disparar as chamadas dela para quem vai receber 403.
 */
const restrictedSections: Partial<Record<Section, string[]>> = { admin: ['platform_admin', 'admin', 'teacher'] };
function HomeContent() {
    const features = useCompanyFeatures();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: userLoading } = useCurrentUser();
    const canOpenSection = useCallback(
        (section: Section) => {
            if (section === 'conquistas' && !features.achievements) return false;
            if (section === 'ranking' && !features.ranking) return false;
            const allowedRoles = restrictedSections[section];
            return !allowedRoles || allowedRoles.includes(user?.role ?? '');
        },
        [user?.role, features.achievements, features.ranking],
    );
    const sections: Record<Section, React.ReactNode> = {
        dashboard: <Dashboard />,
        desafios: <Challenges />,
        ranking: <Ranking />,
        conquistas: <Awards />,
        conteudos: <Conteudos />,
        perfil: <Perfil />,
        admin: <Suspense fallback={<PageLoading />}><Admin platformMode={user?.role === 'platform_admin'} /></Suspense>,
    };
    useEmpresaTema();
    useVisualPreload(user);

    // A URL e a fonte de verdade da navegacao. O router cuida do historico, entao
    // nao ha pushState manual nem listener de popstate: o botao voltar do navegador
    // funciona sozinho.
    const currentLoc = useMemo(() => parseStudentPath(location.pathname), [location.pathname]);
    // Na animacao de saida (AnimatePresence mode="wait") rumo a /admin ou /login, o
    // pathname ja nao e da area do aluno. Congela a ultima localizacao valida para
    // a Home nao piscar o dashboard, e nao dispara redirects enquanto estiver assim.
    const lastStudentLoc = useRef<StudentLocation | null>(null);
    if (currentLoc) lastStudentLoc.current = currentLoc;
    const inStudentArea = currentLoc !== null;
    const loc = currentLoc ?? lastStudentLoc.current;
    const activeSection: Section = loc?.section ?? DEFAULT_SECTION;
    const moduloId = loc?.moduloId ?? null;
    const aulaId = loc?.aulaId ?? null;
    const moduloRaw = loc?.moduloRaw ?? null;
    const aulaRaw = loc?.aulaRaw ?? null;
    // Memoizado por moduloId/aulaId: o Conteudos observa contentTarget num useEffect,
    // entao a identidade do objeto precisa ser estavel entre renders da mesma URL.
    // Depende so dos numeros: trocar o slug da URL nao reinicia a tela nem o scroll.
    const contentTarget: ContentTarget | null = useMemo(
        () => (activeSection === 'conteudos' && moduloId ? { moduloId, ...(aulaId ? { aulaId } : {}) } : null),
        [activeSection, moduloId, aulaId],
    );

    // "Voltar" leva a secao de onde o usuario entrou no conteudo. Guardado em ref
    // (nao muda o render) e so vale enquanto a secao atual for conteudos.
    const enteredContentFrom = useRef<Section | null>(null);

    const { isLoading, setLoading, bootstrapReady, registerBootstrap } = useHomeLoading();
    usePageLoading(!bootstrapReady || isLoading);

    // Gate de bootstrap sempre presente, independente da secao inicial. Sem isto,
    // recarregar fora do dashboard (ex.: /jogos) deixaria a LoadingScreen
    // presa: so o Dashboard registrava/resolvia bootstrap, entao a tela nunca
    // recebia ready. A Home resolve o proprio gate assim que o usuario carrega;
    // secoes que tenham bootstrap proprio (Dashboard) somam ao gate normalmente.
    useEffect(() => registerBootstrap('home'), [registerBootstrap]);
    useEffect(() => {
        setLoading('home', userLoading);
    }, [userLoading, setLoading]);

    const go = useCallback((section: Section, target: ContentTarget | null, options?: { replace?: boolean }) => {
        const allowed = canOpenSection(section) ? section : DEFAULT_SECTION;
        if (allowed === 'admin') {
            navigate(initialAuthenticatedPath(user), { replace: options?.replace });
            return;
        }
        // Mesmo modulo da URL atual: mantem o slug que ja esta la.
        const sameModulo = target && target.moduloId === moduloId && moduloRaw ? { moduloSegment: moduloRaw } : {};
        navigate(studentSectionPath(allowed, target && { ...target, ...sameModulo }), { replace: options?.replace });
    }, [canOpenSection, navigate, user, moduloId, moduloRaw]);

    const setActiveSection = useCallback((section: Section) => {
        enteredContentFrom.current = null;
        go(section, null);
    }, [go]);
    // "Você" no trilho: Conquistas já aberto na aba Colecionáveis.
    const openCollectibles = useCallback(() => {
        enteredContentFrom.current = null;
        if (canOpenSection('conquistas')) navigate(paths.colecionaveis());
    }, [canOpenSection, navigate]);
    const navigateToSection = useCallback((section: Section) => {
        enteredContentFrom.current = activeSection === 'conteudos' ? enteredContentFrom.current : activeSection;
        go(section, null);
    }, [go, activeSection]);
    const navigateToContent = useCallback((target: ContentTarget) => {
        if (activeSection !== 'conteudos') enteredContentFrom.current = activeSection;
        go('conteudos', target);
    }, [go, activeSection]);
    const setContentTarget = useCallback((target: ContentTarget | null) => {
        go('conteudos', target);
    }, [go]);
    const previousSection = activeSection === 'conteudos' ? enteredContentFrom.current : null;
    const goBack = useCallback(() => {
        if (enteredContentFrom.current) {
            const target = enteredContentFrom.current;
            enteredContentFrom.current = null;
            go(target, null);
        }
    }, [go]);

    // Modulo ou aula invalidos na URL (/aprender/abc, /aprender/8-x/abc) voltam ao
    // nivel valido anterior sem criar passo extra no historico. Secoes
    // desconhecidas nem chegam aqui: o router as trata.
    useEffect(() => {
        if (!inStudentArea || activeSection !== 'conteudos') return;
        if (moduloRaw !== null && moduloId === null) {
            navigate(studentSectionPath('conteudos'), { replace: true });
        } else if (aulaRaw !== null && aulaId === null && moduloId !== null) {
            navigate(studentSectionPath('conteudos', { moduloId, moduloSegment: moduloRaw ?? undefined }), { replace: true });
        }
    }, [inStudentArea, activeSection, moduloRaw, aulaRaw, moduloId, aulaId, navigate]);

    // A secao inicial vem da URL, antes de o usuario estar carregado. Quando ele
    // resolve sem a role, volta para o dashboard e corrige a URL com replace, para
    // nao deixar no historico uma entrada que reabre a secao negada.
    useEffect(() => {
        if (!inStudentArea || userLoading || canOpenSection(activeSection)) return;
        go(DEFAULT_SECTION, null, { replace: true });
    }, [inStudentArea, userLoading, canOpenSection, activeSection, go]);

    // Cada seção, módulo ou aula abre no topo: o <main> rola sozinho e guardava a
    // posição da tela anterior (Jogos abria no fim da página).
    const mainRef = useRef<HTMLElement>(null);
    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0, left: 0 });
    }, [activeSection, moduloId, aulaId]);

    const sectionValue = useMemo(
        () => ({ activeSection, setActiveSection, navigateToSection, navigateToContent, contentTarget, setContentTarget, previousSection, goBack, setLoading, registerBootstrap }),
        [activeSection, setActiveSection, navigateToSection, navigateToContent, contentTarget, setContentTarget, previousSection, goBack, setLoading, registerBootstrap],
    );

    return (<>
        <SectionContext.Provider value={sectionValue}>
        <Toaster position="top-right" richColors/>

        <div className="secure-home sp-shell">
          <AppRail
            activeSection={activeSection}
            onSelect={setActiveSection}
            onOpenCollectibles={openCollectibles}
            showRanking={canOpenSection('ranking')}
            showAchievements={canOpenSection('conquistas')}
            showAdmin={canOpenSection('admin')}
          />

          <main ref={mainRef} className={`secure-home-main sp-shell-main relative min-h-0 overflow-y-auto`}>
            <ContentTop user={user} showBack={false} onBack={goBack} />
            {canOpenSection(activeSection) ? sections[activeSection] : null}
          </main>

          {bootstrapReady && <NicknameWelcomeDialog key={user?.userId} />}
        </div>
        </SectionContext.Provider>
    </>);
}
/** Topo da área de conteúdo: faixa do teste gratuito e o Voltar do conteúdo. */
function ContentTop({ user, showBack, onBack }: { user: CurrentUser | null; showBack: boolean; onBack: () => void }) {
    const trialEndsAt = user?.trial_ends_at;
    return (<>
        {trialEndsAt && <div role="status" className="sp-trial-banner">Teste gratuito de aluno até {new Date(trialEndsAt).toLocaleDateString('pt-BR')}. Para continuar depois, <a href="mailto:contato@secureplay.com?subject=Planos%20SecurePlay">fale com a SecurePlay</a>.</div>}
        {showBack && (<AppButton onClick={onBack} variant="ghost" size="sm" icon={<ArrowLeft size={16}/>} className="sp-content-back">
            Voltar
          </AppButton>)}
    </>);
}
export default function Home() {
    const { user } = useCurrentUser();
    return (<PageTransition>
        <HomeContent key={companyIdentityKey(user)} />
    </PageTransition>);
}
