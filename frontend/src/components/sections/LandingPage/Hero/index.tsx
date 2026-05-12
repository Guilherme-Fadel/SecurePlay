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
            className="cursor-none px-12 py-6  border-4 border-[var(--border-primary)] 
                       shadow-[8px_8px_0px_0px_rgba(31,106,225,1)]
                       hover:shadow-[4px_4px_0px_0px_rgba(31,106,225,1)]
                        bg-[var(--secondary-dark)] text-[var(--background)]"
          >
            INICIAR MISSÃO
          </GameButton>
        </motion.div>

      </div>
    </section>
  );
}
