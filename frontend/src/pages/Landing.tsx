import { PageTransition } from '@/components/shared/PageTransition';
import { Header } from '@/components/sections/LandingPage/layout/HeaderLanding/index';
import { HeroSection } from '@/components/sections/LandingPage/Hero/index';
import { MissionsSection } from '@/components/sections/LandingPage/Missions/index';
import { HowItWorksSection } from '@/components/sections/LandingPage/HowItWorks/index';
import { BenefitsSection } from '@/components/sections/LandingPage/Benefits/index';
import { TestimonialsSection } from '@/components/sections/LandingPage/Testimonials/index';
import { FAQSection } from '@/components/sections/LandingPage/FAQ/index';
import { Footer } from '@/components/sections/LandingPage/layout/FooterLanding/index';
import { CTASection } from '@/components/sections/LandingPage/CTA/index';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { PixelCursor } from '@/components/ui/visuals/PixelCursor';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

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
