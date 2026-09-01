import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import heroAcademiaMissoes640 from '@/assets/kids/hero-academia-missoes-pixel-640.webp';
import heroAcademiaMissoes1200 from '@/assets/kids/hero-academia-missoes-pixel-1200.webp';
import escolhaAventura640 from '@/assets/kids/escolha-aventura-pixel-640.webp';
import escolhaAventura1200 from '@/assets/kids/escolha-aventura-pixel-1200.webp';
import aprendaPratique640 from '@/assets/kids/aprenda-pratique-pixel-640.webp';
import aprendaPratique1200 from '@/assets/kids/aprenda-pratique-pixel-1200.webp';
import celebreConquistas640 from '@/assets/kids/celebre-conquistas-pixel-640.webp';
import celebreConquistas1200 from '@/assets/kids/celebre-conquistas-pixel-1200.webp';
import escolasEducadores640 from '@/assets/kids/escolas-educadores-pixel-640.webp';
import escolasEducadores1200 from '@/assets/kids/escolas-educadores-pixel-1200.webp';

const missionTracks = [
  {
    number: '01',
    label: 'CUIDAR',
    title: 'Cuide dos seus dados',
    text: 'Descubra como suas escolhas ajudam a proteger informações importantes no dia a dia.',
  },
  {
    number: '02',
    label: 'CONVIVER',
    title: 'Construa boas conexões',
    text: 'Aprenda atitudes que tornam os espaços digitais mais gentis, respeitosos e seguros.',
  },
  {
    number: '03',
    label: 'INVESTIGAR',
    title: 'Explore com atenção',
    text: 'Pratique a curiosidade com calma para reconhecer situações que merecem mais cuidado.',
  },
];

const steps = [
  {
    image640: escolhaAventura640,
    image1200: escolhaAventura1200,
    alt: 'Criança escolhendo uma aventura de aprendizado no tablet',
    title: 'Escolha uma aventura',
    text: 'Comece pelo tema que mais combina com a sua turma.',
  },
  {
    image640: aprendaPratique640,
    image1200: aprendaPratique1200,
    alt: 'Criança praticando atividades de segurança digital',
    title: 'Aprenda e pratique',
    text: 'Veja as dicas e resolva desafios de um jeito leve.',
  },
  {
    image640: celebreConquistas640,
    image1200: celebreConquistas1200,
    alt: 'Criança celebrando uma conquista ao lado de uma adulta',
    title: 'Celebre conquistas',
    text: 'Transforme cada descoberta em confiança para navegar.',
  },
];

const faqs = [
  ['Para quem é a SecurePlay?', 'A SecurePlay foi pensada para crianças de 6 a 10 anos aprenderem segurança digital de um jeito leve e divertido.'],
  ['A proposta funciona para escolas?', 'Sim. A experiência foi desenhada para apoiar conversas em sala e aproximar crianças, educadores e famílias em torno do cuidado digital.'],
  ['O conteúdo é seguro para crianças?', 'Sim. As atividades usam linguagem apropriada para a idade e reforçam atitudes positivas no ambiente digital.'],
];

export function KidsLandingContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  };
  const closeMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return;
    mobileMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="kids-header">
        <Link to="/" className="kids-brand" aria-label="SecurePlay - início">
          secure<strong>play</strong>
        </Link>
        <nav className="kids-nav" aria-label="Navegação principal">
          <button onClick={() => go('inicio')}>A proposta</button>
          <button onClick={() => go('missoes')}>Missões</button>
          <button onClick={() => go('escolas')}>Para escolas</button>
          <button onClick={() => go('faq')}>Dúvidas</button>
        </nav>
        <button className="kids-login" onClick={() => navigate('/login')}>Entrar</button>
        <button ref={menuButtonRef} className="kids-menu" onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="kids-mobile-navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="kids-mobile-nav"
              id="kids-mobile-navigation"
              ref={mobileMenuRef}
            >
              <button onClick={() => go('inicio')}>A proposta</button>
              <button onClick={() => go('missoes')}>Missões</button>
              <button onClick={() => go('escolas')}>Para escolas</button>
              <button onClick={() => go('faq')}>Dúvidas</button>
              <button onClick={() => { closeMenu(); navigate('/login'); }}>Entrar</button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="inicio" className="kids-hero">
          <div className="kids-hero-copy">
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="kids-eyebrow">
              Segurança digital para escolas
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              Proteger-se online também pode ser uma <em>aventura.</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kids-lead">
              A SecurePlay transforma conversas importantes sobre internet em missões criativas, feitas para crianças de 6 a 10 anos.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="kids-actions">
              <button className="kids-button kids-button-primary" onClick={() => go('missoes')}>
                Conheça a SecurePlay <ArrowRight size={18} />
              </button>
              <button className="kids-button kids-button-secondary" onClick={() => go('como-funciona')}>
                Ver como funciona
              </button>
            </motion.div>
            <div className="kids-trust" aria-label="Para crianças de 6 a 10 anos e pensado para escolas">
              <span>Para crianças de 6 a 10 anos</span>
              <span>Pensado para a rotina escolar</span>
            </div>
          </div>
          <motion.figure
            className="kids-hero-art"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 90 }}
          >
            <img src={heroAcademiaMissoes640} srcSet={`${heroAcademiaMissoes640} 640w, ${heroAcademiaMissoes1200} 1200w`} sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 960px) 45vw, 610px" alt="Duas crianças explorando um mapa de missões digitais em uma sala de aula" />
          </motion.figure>
        </section>

        <section id="missoes" className="kids-section kids-missions">
          <SectionHeading
            eyebrow="Três territórios de descoberta"
            title={<>Toda boa aventura começa com uma <em>missão.</em></>}
            text="A jornada mistura autonomia, empatia e pensamento crítico em experiências que convidam a turma a participar."
          />
          <div className="kids-mission-grid">
            {missionTracks.map(({ number, label, title, text }, index) => (
              <motion.article
                key={title}
                className="kids-mission-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <span className="kids-mission-number">{number}</span>
                <p>{label}</p>
                <h3>{title}</h3>
                <span className="kids-mission-rule" aria-hidden="true" />
                <div>{text}</div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="kids-section kids-how">
          <SectionHeading
            eyebrow="Uma jornada de cada vez"
            title={<>Aprender ganha outro ritmo quando vira <em>descoberta.</em></>}
            text="A experiência respeita o tempo da criança e transforma cada avanço em assunto para continuar a conversa."
          />
          <div className="kids-steps">
            {steps.map(({ image640, image1200, alt, title, text }, index) => (
              <article key={title} className="kids-step">
                <span className="kids-step-number">0{index + 1}</span>
                <figure className="kids-step-media">
                  <img src={image640} srcSet={`${image640} 640w, ${image1200} 1200w`} sizes="(max-width: 760px) calc(100vw - 40px), 400px" alt={alt} loading="lazy" />
                </figure>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="escolas" className="kids-section kids-school">
          <div className="kids-school-card">
            <div className="kids-school-copy">
              <p className="kids-eyebrow">Para escolas e educadores</p>
              <h2>Uma conversa importante, com espaço para a imaginação.</h2>
              <p>
                A SecurePlay ajuda a trazer o cuidado digital para perto das crianças — com linguagem acessível, atividades envolventes e oportunidades de trocar ideias em sala.
              </p>
              <div className="kids-school-notes">
                <span>Aprendizado para 6–10 anos</span>
                <span>Segurança digital no cotidiano</span>
              </div>
              <button className="kids-button kids-button-light" onClick={() => go('faq')}>
                Tirar dúvidas <ArrowRight size={18} />
              </button>
            </div>
            <figure className="kids-school-art">
              <img src={escolasEducadores640} srcSet={`${escolasEducadores640} 640w, ${escolasEducadores1200} 1200w`} sizes="(max-width: 760px) calc(100vw - 40px), 600px" alt="Educadora e duas crianças explorando uma missão de aprendizado" loading="lazy" />
            </figure>
          </div>
        </section>

        <section id="faq" className="kids-section kids-faq">
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title={<>Conhecer melhor também faz parte da <em>jornada.</em></>}
            text="Aqui estão algumas respostas para começar a explorar a proposta."
          />
          <div className="kids-faq-list">
            {faqs.map(([question, answer], index) => (
              <article className={`kids-faq-item ${openFaq === index ? 'is-open' : ''}`} key={question}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>
                  <span>{question}</span>
                  <ChevronDown size={20} />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      {answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </article>
            ))}
          </div>
        </section>

        <section className="kids-cta">
          <div className="kids-cta-copy">
            <p className="kids-eyebrow">Uma nova forma de aprender</p>
            <h2>Conheça as missões que tornam o cuidado digital mais próximo das crianças.</h2>
            <p>Uma experiência segura, criativa e feita para despertar boas escolhas na internet.</p>
            <button className="kids-button kids-button-sun" onClick={() => go('missoes')}>
              Explorar a proposta <ArrowRight size={18} />
            </button>
          </div>
          <div className="kids-cta-map" aria-hidden="true"><span /><i /><b /></div>
        </section>
      </main>

      <footer className="kids-footer">
        <Link to="/" className="kids-brand">secure<strong>play</strong></Link>
        <p>Aprender a navegar com mais segurança, juntos.</p>
        <div><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos</Link><a href="mailto:contato@secureplay.com">Contato</a></div>
        <small>© 2026 SecurePlay. Todos os direitos reservados.</small>
      </footer>
    </>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text: string }) {
  return <div className="kids-section-heading"><p className="kids-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div>;
}
