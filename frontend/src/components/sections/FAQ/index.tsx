import { FAQHeader } from './FAQHeader';
import { FAQList } from './FAQList';

export function FAQSection() {
  return (
    <section className="py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6">
        <FAQHeader />
        <FAQList />
      </div>
    </section>
  );
}