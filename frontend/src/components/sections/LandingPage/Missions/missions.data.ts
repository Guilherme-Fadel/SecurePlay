import { Shield, Lock, Users } from 'lucide-react';

export const MISSIONS = [
  {
    id: 1,
    title: 'GOVERNANÇA',
    subtitle: 'Estabeleça as bases',
    description: 'Aprenda a estruturar políticas, processos e controles para gerenciar TI de forma eficiente.',
    icon: Shield,
    progress: 100,
    color: 'bg-[var(--primary)]',
    difficulty: 'FÁCIL',
    xp: '250 XP',
  },
  {
    id: 2,
    title: 'SEGURANÇA DA INFORMAÇÃO',
    subtitle: 'Proteja seus ativos',
    description: 'Domine técnicas de proteção de dados, criptografia e defesa contra ameaças cibernéticas.',
    icon: Lock,
    progress: 65,
    color: 'bg-[var(--secondary)]',
    difficulty: 'MÉDIO',
    xp: '500 XP',
  },
  {
    id: 3,
    title: 'CONSCIENTIZAÇÃO',
    subtitle: 'Eduque sua equipe',
    description: 'Crie cultura de segurança através de treinamentos e boas práticas acessíveis.',
    icon: Users,
    progress: 30,
    color: 'bg-[var(--accent)]',
    difficulty: 'DIFÍCIL',
    xp: '1000 XP',
  },
];