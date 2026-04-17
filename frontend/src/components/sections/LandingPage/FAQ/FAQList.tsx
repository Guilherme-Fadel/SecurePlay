import { useState } from 'react';
import { FAQS } from './faq.data';
import { FAQItem } from './FAQItem';

export function FAQList() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {FAQS.map((faq, index) => (
        <FAQItem
          key={faq.id}
          faq={faq}
          index={index}
          isOpen={openId === faq.id}
          onToggle={() => toggle(faq.id)}
        />
      ))}
    </div>
  );
}