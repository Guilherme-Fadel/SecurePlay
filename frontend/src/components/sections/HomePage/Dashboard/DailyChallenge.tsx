import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Calendar, Target, Clock, Trophy } from 'lucide-react';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { useState } from 'react';

export function DailyChallenge() {
  const { challenge, loading } = useDailyChallenge();
  const [open, setOpen] = useState(false)

  if (loading) {
    return (
      <InfoCard variant="primary" className="flex flex-col animate-pulse">
        <div className="p-4 h-40" />
      </InfoCard>
    );
  }

  if (!challenge) {
    return (
      <InfoCard variant="primary" className="flex flex-col">
        <InfoCard.Section>
          <p className="text-[var(--text-secondary)]">Nenhum desafio disponível hoje.</p>
        </InfoCard.Section>
      </InfoCard>
    );
  }

  return (
    <InfoCard variant="primary" className="flex flex-col">
      <InfoCard.Header
        title="Desafio do Dia"
        subtitle={`Dificuldade: ${challenge.difficulty}`}
        icon={Calendar}
        variant="primary"
      />

      <InfoCard.Section className="flex-1 flex flex-col gap-3">
        <InfoCard.Stat
          label="Objetivo"
          value={challenge.title}
          subtitle={challenge.description}
          icon={Target}
          variant="secondary"
        />

        <InfoCard.Item
          label="Duração"
          value={`${challenge.duration} minutos`}
          icon={Clock}
          variant="primary"
        />

        <InfoCard.Item
          label="Recompensa"
          value={`+${challenge.points} XP`}
          icon={Trophy}
          variant="accent"
        />
      </InfoCard.Section>

      <InfoCard.Footer className="flex justify-center">
        <button 
        onClick={() => setOpen(true)}
        className="w-full px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors font-semibold">
          Iniciar Desafio
        </button>
      </InfoCard.Footer>
      <Modal open={open} onClose={() => setOpen(false)} title="Desafio Diário">
           <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce non ante molestie, viverra augue a, venenatis erat. Ut sollicitudin ultricies nisi vitae faucibus. Donec lobortis nulla eu nunc egestas rhoncus. Curabitur scelerisque gravida eros, id commodo arcu maximus vel. Donec vel tellus arcu. Curabitur aliquam nec mi quis vehicula. Aliquam gravida ut mi eget congue. Duis id eros eu purus hendrerit aliquet. Nunc ullamcorper turpis tellus, in cursus enim sodales vel. Nulla tellus ex, fringilla in mauris eu, dapibus scelerisque ipsum. Etiam mauris nunc, porttitor et lectus nec, euismod feugiat dui. Donec cursus mauris erat, eu rutrum enim pellentesque vitae. Nam dictum, odio vel dignissim facilisis, ipsum justo sagittis ligula, id fringilla sem tortor nec sapien. Duis facilisis viverra neque, quis dapibus odio lobortis non.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce non ante molestie, viverra augue a, venenatis erat. Ut sollicitudin ultricies nisi vitae faucibus. Donec lobortis nulla eu nunc egestas rhoncus. Curabitur scelerisque gravida eros, id commodo arcu maximus vel. Donec vel tellus arcu. Curabitur aliquam nec mi quis vehicula. Aliquam gravida ut mi eget congue. Duis id eros eu purus hendrerit aliquet. Nunc ullamcorper turpis tellus, in cursus enim sodales vel. Nulla tellus ex, fringilla in mauris eu, dapibus scelerisque ipsum. Etiam mauris nunc, porttitor et lectus nec, euismod feugiat dui. Donec cursus mauris erat, eu rutrum enim pellentesque vitae. Nam dictum, odio vel dignissim facilisis, ipsum justo sagittis ligula, id fringilla sem tortor nec sapien. Duis facilisis viverra neque, quis dapibus odio lobortis non.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce non ante molestie, viverra augue a, venenatis erat. Ut sollicitudin ultricies nisi vitae faucibus. Donec lobortis nulla eu nunc egestas rhoncus. Curabitur scelerisque gravida eros, id commodo arcu maximus vel. Donec vel tellus arcu. Curabitur aliquam nec mi quis vehicula. Aliquam gravida ut mi eget congue. Duis id eros eu purus hendrerit aliquet. Nunc ullamcorper turpis tellus, in cursus enim sodales vel. Nulla tellus ex, fringilla in mauris eu, dapibus scelerisque ipsum. Etiam mauris nunc, porttitor et lectus nec, euismod feugiat dui. Donec cursus mauris erat, eu rutrum enim pellentesque vitae. Nam dictum, odio vel dignissim facilisis, ipsum justo sagittis ligula, id fringilla sem tortor nec sapien. Duis facilisis viverra neque, quis dapibus odio lobortis non.</p>
      </Modal>
    </InfoCard>
  );
}
