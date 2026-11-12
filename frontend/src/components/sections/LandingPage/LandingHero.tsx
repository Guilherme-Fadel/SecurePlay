import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/shared/BrandMark';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { LANDING_NAV } from './landing.data';

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  const closeMenu = (returnFocus = true) => {
    setMenuOpen(false);
    if (returnFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return;
    mobileMenuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="lp-header">
      <Link to="/" className="lp-header-brand" aria-label="SecurePlay, início">
        <BrandMark variant="horizontal" tone="cream" decorative />
      </Link>
      <nav className="lp-header-nav" aria-label="Principal">
        {LANDING_NAV.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <Link to="/login" className="lp-header-login">Entrar</Link>
      <button
        ref={menuButtonRef}
        type="button"
        className="lp-header-menu"
        onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
        aria-controls="lp-mobile-navigation"
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            ref={mobileMenuRef}
            id="lp-mobile-navigation"
            className="lp-mobile-nav"
            aria-label="Menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {LANDING_NAV.map((item) => <a key={item.href} href={item.href} onClick={() => closeMenu(false)}>{item.label}</a>)}
            <Link to="/login" onClick={() => closeMenu(false)}>Entrar</Link>
            <Link to="/teste-gratuito" className="is-primary" onClick={() => closeMenu(false)}>Teste grátis por 7 dias</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function LandingHero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-titulo">
      <div className="lp-hero-blob" aria-hidden="true" />
      <div className="lp-hero-body">
        <div className="lp-hero-copy">
          <p className="lp-hero-tagline">Aprender a navegar com mais segurança, juntos.</p>
          <h1 id="lp-hero-titulo" className="sp-display lp-hero-title">
            Proteger-se online também pode ser uma <span>aventura.</span>
          </h1>
          <p className="lp-hero-lead">A SecurePlay transforma conversas importantes sobre internet em missões criativas, feitas para crianças e adolescentes.</p>
          <div className="lp-hero-actions">
            <Link to="/teste-gratuito" className="lp-btn lp-btn--yellow">
              Teste grátis por 7 dias <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </Link>
            <a href="#jornada" className="lp-link-light">Conhecer a jornada</a>
          </div>
        </div>

        <figure className="lp-hero-art" aria-hidden="true">
          <div className="lp-hero-arch" />
          <div className="lp-hero-mascot" data-traveler="hero">
            <BrandCharacter body="var(--sp-yellow)" face="var(--sp-black)" eyes="var(--sp-yellow)" look={3.5} lift={-2} blink />
          </div>
          <div className="lp-hero-bubble">Bora aprender?</div>
        </figure>
      </div>
    </section>
  );
}
