import { Brand } from './Brand';
import { Navigation } from './Navigation';
import { Contact } from './Contact';
import { Bottom } from './Bottom';

export function Footer() {
  return (
    <footer id="contato" 
        className="bg-[var(--background)] border-t-4 border-[var(--primary)] py-16">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <Brand />
          <Navigation />
          <Contact />
        </div>

        <Bottom />
      </div>
    </footer>
  );
}