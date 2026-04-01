import { MISSIONS } from './missions.data';
import { MissionCard } from './MissionCard';

export function MissionsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {MISSIONS.map((mission, index) => (
        <MissionCard key={mission.id} mission={mission} index={index} />
      ))}
    </div>
  );
}