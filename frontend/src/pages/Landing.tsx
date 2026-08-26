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
import { LandingBackground } from '@/components/ui/visuals/LandingBackground';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

export default function Landing() {
  return (
    <PageTransition>
      <>
        <LoadingScreen ready />

        <div className="relative min-h-screen">
          <LandingBackground />
          <div className="relative z-10">
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
        </div>
      </>
    </PageTransition>
  );
}
