import { PageTransition } from '@/components/shared/PageTransition';
import { LandingContent } from '@/components/sections/LandingPage/LandingContent';
import '@/components/sections/LandingPage/landing.css';

export default function Landing() {
  return (
    <PageTransition>
      <div className="landing">
        <LandingContent />
      </div>
    </PageTransition>
  );
}
