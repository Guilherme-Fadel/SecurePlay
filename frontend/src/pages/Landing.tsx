import { PageTransition } from '../components/shared/PageTransition';
import { Header } from '../components/layout/Header/index';
import { HeroSection } from '../components/sections/Hero/index';
import { MissionsSection } from '../components/sections/Missions/index';
import { HowItWorksSection } from '../components/sections/HowItWorks/index';
import { BenefitsSection } from '../components/sections/Benefits/index';
import { TestimonialsSection } from '../components/sections/Testimonials/index';
import { FAQSection } from '../components/sections/FAQ/index';
import { Footer } from '../components/layout/Footer/index';
import { CTASection } from '../components/sections/CTA/index';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { PixelCursor } from '../components/ui/visuals/PixelCursor';
import { LoadingScreen } from '../components/shared/LoadingScreen';

export default function Landing() {
  return (
    <PageTransition>
      <>
        <LoadingScreen />

        <div className="min-h-screen bg-[var(--background)] cursor-none">
          <PixelCursor />
          <Header />

          <main>
            <HeroSection />
            <MissionsSection />
            <HowItWorksSection />
            <BenefitsSection />
            <TestimonialsSection />
            <FAQSection />
            <CTASection />
          </main>

          <Footer />
          <ScrollToTop />
        </div>
      </>
    </PageTransition>
  );
}
