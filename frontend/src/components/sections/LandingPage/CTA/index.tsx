import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';


import { CTATitle } from './Title';
import { CTABenefits } from './Benefits';
import { CTAStats } from './Stats';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-32 overflow-hidden">

      <div className="relative z-10 max-w-5xl mx-auto px-6">

        <CTATitle />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-12 md:p-16 relative shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-t-lg" />

          <div className="text-center">

            <CTAContent />

            <button
              onClick={() => navigate('/start')}
              className="cursor-pointer mt-8  px-10 py-5 border border-[var(--border)] rounded-md
                         shadow-[0_6px_20px_rgba(0,0,0,0.25)]
                         hover:shadow-[0_3px_12px_rgba(0,0,0,0.2)]
                          bg-[var(--secondary)] text-[var(--background)]
                         inline-flex items-center gap-4"
            >
              AVANÇAR PARA O PRÓXIMO NÍVEL
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />

              <motion.div
                className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--accent)] border border-[var(--border)] rounded-md flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-[var(--text-primary)]" />
              </motion.div>
            </button>

            <CTABenefits />

          </div>

          <CornerBorders />
        </motion.div>

        <CTAStats />

      </div>
    </section>
  );
}

function CTAContent() {
  return (
    <>
      <h2 className="md: text-[var(--text-primary)] mb-6">
        PRONTO PARA
        <br />
        <div className="text-[var(--secondary)]">PROTEGER SEUS DADOS?</div>
      </h2>

      <h5 className="text-[var(--text-primary)]  md: max-w-2xl mx-auto mb-8">
        Junte-se a centenas de empresas que já subiram de nível.
        <br />
        Sua jornada começa agora!
      </h5>
    </>
  );
}

function CornerBorders() {
  return (
    <>
      <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-[var(--secondary-30)]" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-[var(--secondary-30)]" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-[var(--secondary-30)]" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-[var(--secondary-30)]" />
    </>
  );
}
