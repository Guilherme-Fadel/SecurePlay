interface PasswordStrengthBarProps {
  password: string;
}

const LEVEL_LABELS = ["", "Fraco", "Baixo", "Médio", "Forte", "Máximo"];

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {

  const strength = getPasswordStrength(password);
  const color = getStrengthColor(strength);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">

      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const level = index + 1;
          const active = level <= strength;

          return (
            <StrengthSegment
              key={level}
              active={active}
              color={color}
            />
          );
        })}
      </div>

      <p
        className="text-xs pixel-text tracking-wider"
        style={{ color }}
      >
        Nível: {LEVEL_LABELS[strength]}
      </p>

    </div>
  );
}


function getPasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (hasMixedCase(password)) score++;
  if (hasNumber(password)) score++;
  if (hasSpecialChar(password)) score++;

  return Math.min(score, 5);
}

function getStrengthColor(level: number): string {
  if (level <= 1) return "var(--danger)";
  if (level <= 2) return "var(--accent)";
  if (level <= 3) return "var(--primary)";
  return "var(--secondary)";
}

function hasMixedCase(value: string) {
  return /[a-z]/.test(value) && /[A-Z]/.test(value);
}

function hasNumber(value: string) {
  return /\d/.test(value);
}

function hasSpecialChar(value: string) {
  return /[^a-zA-Z0-9]/.test(value);
}


function StrengthSegment({
  active,
  color,
}: {
  active: boolean;
  color: string;
}) {
  return (
    <div
      className="h-1.5 flex-1 border border-[var(--border)] relative overflow-hidden"
      style={{
        background: active ? color : "#2E3440",
      }}
    >
      {active && <SegmentOverlay />}
    </div>
  );
}

function SegmentOverlay() {
  return (
    <div
      className="absolute inset-0 opacity-50"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          transparent,
          transparent 2px,
          rgba(var(--overlay-light), 0.1) 2px,
          rgba(var(--overlay-light), 0.1) 4px
        )`,
      }}
    />
  );
}