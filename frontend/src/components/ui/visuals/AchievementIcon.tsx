import { useState } from 'react';
import type { ComponentType } from 'react';
import { ShieldCheck, Shield, BadgeCheck, ShieldHalf, BookOpenCheck, Library, GraduationCap, Brain, Search, ScanSearch, Crosshair, Fingerprint, Flame, CalendarCheck, CalendarDays, Sparkles, ChevronsUp, TrendingUp, Crown, Trophy, LockKeyhole, CircleHelp, type LucideProps } from 'lucide-react';
import { ProgressiveImage } from './ProgressiveImage';
const iconMap: Record<string, ComponentType<LucideProps>> = {
  'shield-check': ShieldCheck,
  shield: Shield,
  'badge-check': BadgeCheck,
  'shield-half': ShieldHalf,
  'book-open-check': BookOpenCheck,
  library: Library,
  'graduation-cap': GraduationCap,
  brain: Brain,
  search: Search,
  'scan-search': ScanSearch,
  crosshair: Crosshair,
  fingerprint: Fingerprint,
  flame: Flame,
  'calendar-check': CalendarCheck,
  'calendar-days': CalendarDays,
  sparkles: Sparkles,
  'chevrons-up': ChevronsUp,
  'trending-up': TrendingUp,
  crown: Crown,
  trophy: Trophy,
  'lock-keyhole': LockKeyhole,
};
export function AchievementIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (/^(https?:\/\/|\/)/.test(icon) && failedSource !== icon) {
    return <ProgressiveImage className="achievement-artwork" src={icon} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'auto' }} onError={() => setFailedSource(icon)} />;
  }
  const Icon = iconMap[icon] ?? CircleHelp;
  return <Icon size={size} aria-hidden="true" />;
}
