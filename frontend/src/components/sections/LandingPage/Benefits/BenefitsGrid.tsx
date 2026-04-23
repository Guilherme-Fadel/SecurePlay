import { BENEFITS } from './benefits.data';
import { BenefitCard } from './BenefitCard';

export function BenefitsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {BENEFITS.map((item, index) => (
        <BenefitCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}