interface PixelIconProps {
  type: "lock" | "user" | "mail" | "shield" | "eye" | "eye-off";
  className?: string;
}

export function PixelIcon({ type, className = "" }: PixelIconProps) {
  const Icon = iconMap[type];
  return <Icon className={className} />;
}


const iconMap = {
  lock: LockIcon,
  user: UserIcon,
  mail: MailIcon,
  shield: ShieldIcon,
  eye: EyeIcon,
  "eye-off": EyeOffIcon,
};


function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="4" y="7" width="8" height="7" />
      <rect x="5" y="8" width="6" height="5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="6" y="4" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y="3" width="2" height="1" />
      <rect x="7" y="10" width="2" height="2" fill="var(--secondary)" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="6" y="3" width="4" height="4" />
      <rect x="5" y="2" width="6" height="1" />
      <rect x="4" y="8" width="8" height="5" />
      <rect x="3" y="9" width="10" height="1" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="2" y="4" width="12" height="8" />
      <rect x="3" y="5" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M3 5 L8 9 L13 5" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <polygon points="8,2 4,4 4,8 8,14 12,8 12,4" />
      <polygon points="8,4 6,5 6,8 8,11 10,8 10,5" fill="var(--secondary)" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="4" y="6" width="8" height="4" />
      <rect x="3" y="7" width="1" height="2" />
      <rect x="12" y="7" width="1" height="2" />
      <rect x="7" y="7" width="2" height="2" fill="var(--primary)" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="4" y="6" width="8" height="4" opacity="0.5" />
      <rect x="3" y="7" width="1" height="2" opacity="0.5" />
      <rect x="12" y="7" width="1" height="2" opacity="0.5" />
      <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}