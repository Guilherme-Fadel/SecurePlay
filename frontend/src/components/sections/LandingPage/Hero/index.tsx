import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GameButton } from '@/components/ui/buttons/GameButton';

import { HeroBackground } from './Background';
import { HeroBadge } from './Badge';
import { HeroTitle } from './Title';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[var(--background)] via-[var(--surface)] to-[var(--background)] pt-20"
    >
      <HeroBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        <HeroBadge />

        <HeroTitle />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GameButton
            onClick={() => navigate('/start')}
            className="cursor-none px-12 py-6  border border-[var(--border)] rounded-md
                       shadow-[0_6px_20px_rgba(0,0,0,0.25)]
                       hover:shadow-[0_3px_12px_rgba(0,0,0,0.2)]
                        bg-[var(--secondary-dark)] text-[var(--background)]"
          >
            INICIAR MISSÃO
          </GameButton>
        </motion.div>

      </div>
    </section>
  );
}
