import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { LandingBackground } from '@/components/ui/visuals/LandingBackground';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const continueToLogin = () => navigate('/login');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') continueToLogin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 text-center">
      <LandingBackground />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-md rounded-[30px] border border-[#dfd8ff] bg-white/90 p-10 shadow-[0_25px_60px_rgba(50,37,106,.16)] backdrop-blur">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-[#6935f2] text-white"><ShieldCheck size={34} /></span>
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold text-[#6935f2]"><Sparkles size={16} /> Seu espaço para aprender</p>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-[#17213e]">Vamos explorar juntos?</h1>
        <p className="mb-7 text-sm leading-6 text-[#596780]">Você está a um passo de aprender mais sobre como navegar com segurança.</p>
        <button onClick={continueToLogin} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#6935f2] px-6 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(105,53,242,.25)] transition hover:-translate-y-0.5">Continuar <ArrowRight size={18} /></button>
      </motion.div>
    </div>
  );
}
