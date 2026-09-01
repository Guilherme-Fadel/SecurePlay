import { PageTransition } from '@/components/shared/PageTransition';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { LandingBackground } from '@/components/ui/visuals/LandingBackground';
import { KidsLandingContent } from '@/components/sections/LandingPage/KidsLandingContent';
import '@/components/sections/LandingPage/kids-landing.css';

export default function Landing() {
  return (
    <PageTransition>
      <>
        <div className="kids-landing relative min-h-screen overflow-x-hidden">
          <LandingBackground />
          <div className="relative z-10">
            <KidsLandingContent />
            <ScrollToTop />
          </div>
        </div>
      </>
    </PageTransition>
  );
}
