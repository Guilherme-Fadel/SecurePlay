import { BenefitsHeader } from './BenefitsHeader';
import { BenefitsGrid } from './BenefitsGrid';

export function BenefitsSection() {
  return (
    <section id="seguranca" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <BenefitsHeader />
        <BenefitsGrid />
      </div>
    </section>
  );
}