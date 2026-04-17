import { MissionsHeader } from './MissionsHeader';
import { MissionsGrid } from './MissionsGrid';

export function MissionsSection() {
  return (
    <section id="missoes" className="py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6">
        <MissionsHeader />
        <MissionsGrid />
      </div>
    </section>
  );
}

