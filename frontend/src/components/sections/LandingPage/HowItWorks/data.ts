import { Play, Target, Trophy, Zap } from 'lucide-react';

export const steps = [
  {
    id: 1,
    title: 'COMECE',
    description: 'Escolha sua primeira missão e configure seu perfil de segurança',
    icon: Play,
    color: 'var(--primary)',
  },
  {
    id: 2,
    title: 'APRENDA',
    description: 'Complete desafios práticos e conquiste conhecimento real',
    icon: Target,
    color: 'var(--secondary)',
  },
  {
    id: 3,
    title: 'EVOLUA',
    description: 'Ganhe XP, desbloqueie conquistas e suba de nível',
    icon: Zap,
    color: 'var(--accent)',
  },
  {
    id: 4,
    title: 'CONQUISTE',
    description: 'Transforme sua organização em referência de segurança',
    icon: Trophy,
    color: 'var(--secondary)',
  },
];