import { MotionConfig } from 'motion/react';
import { LandingHeader, LandingHero } from './LandingHero';
import { LandingMarquee } from './LandingMarquee';
import { LandingJourney } from './LandingJourney';
import { LandingMissions } from './LandingMissions';
import { LandingFooter, LandingPlay, LandingSchools } from './LandingClosing';
import { LandingTraveler } from './LandingTraveler';

/** Landing final do redesign: hero, faixa, jornada, missões, escolas, "Dê o play" e rodapé. */
export function LandingContent() {
  return (
    <MotionConfig reducedMotion="user">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingJourney />
        <LandingMissions />
        <LandingSchools />
        <LandingPlay />
      </main>
      <LandingFooter />
      <LandingTraveler />
    </MotionConfig>
  );
}
