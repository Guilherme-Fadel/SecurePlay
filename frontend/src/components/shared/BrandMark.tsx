import symbolBlue from '@/assets/static/brand/secureplay-symbol-blue.svg';
import symbolCream from '@/assets/static/brand/secureplay-symbol-cream.svg';
import stackedBlue from '@/assets/static/brand/secureplay-stacked-blue.svg';
import stackedCream from '@/assets/static/brand/secureplay-stacked-cream.svg';
import horizontalBlue from '@/assets/static/brand/secureplay-horizontal-blue.svg';
import horizontalCream from '@/assets/static/brand/secureplay-horizontal-cream.svg';
import './brand-mark.css';

interface BrandMarkProps {
  variant?: 'symbol' | 'stacked' | 'horizontal';
  tone?: 'auto' | 'blue' | 'cream';
  decorative?: boolean;
  className?: string;
}

const artwork = {
  symbol: { blue: symbolBlue, cream: symbolCream, width: 159, height: 144 },
  stacked: { blue: stackedBlue, cream: stackedCream, width: 456, height: 156 },
  horizontal: { blue: horizontalBlue, cream: horizontalCream, width: 1054, height: 145 },
};

export function BrandMark({ variant = 'symbol', tone = 'auto', decorative = false, className = '' }: BrandMarkProps) {
  const image = artwork[variant];
  const tones: Array<'blue' | 'cream'> = tone === 'auto' ? ['blue', 'cream'] : [tone];
  return (
    <span
      className={`brand-mark brand-mark--${variant} brand-mark--${tone} ${className}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'SecurePlay'}
      aria-hidden={decorative || undefined}
    >
      {tones.map((color) => <img key={color} className={`brand-mark-${color}`} src={image[color]} width={image.width} height={image.height} alt="" draggable={false} />)}
    </span>
  );
}
