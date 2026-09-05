import digitalKeyPixel from '@/assets/dashboard/digital-key-pixel-v5.png';

type DigitalKeyIconProps = {
  size?: number;
  className?: string;
};

export function DigitalKeyIcon({ size = 20, className = '' }: DigitalKeyIconProps) {
  return (
    <img
      src={digitalKeyPixel}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className={`digital-key-icon ${className}`.trim()}
    />
  );
}
