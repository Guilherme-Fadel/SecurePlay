import { Mail, Phone, MapPin } from 'lucide-react';

export function Contact() {
  return (
    <div>
      <h3 className="font-['Press_Start_2P'] text-xs text-[var(--secondary)] mb-6">
        CONTATO
      </h3>

      <ul className="space-y-4">
        <ContactItem icon={Mail}>contato@secureplay.com</ContactItem>
        <ContactItem icon={Phone}>+55 11 9999-9999</ContactItem>
        <ContactItem icon={MapPin}>São Paulo, SP</ContactItem>
      </ul>
    </div>
  );
}

function ContactItem({ icon: Icon, children }: any) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-6 h-6 bg-[var(--primary)] border-2 border-[var(--border-primary)] flex items-center justify-center mt-0.5">
        <Icon className="w-3 h-3 text-[var(--text-primary)]" />
      </div>

      <span className="text-[var(--text-primary)] text-sm">
        {children}
      </span>
    </li>
  );
}