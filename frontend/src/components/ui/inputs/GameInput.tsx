import { useState, forwardRef } from "react";
import { PixelIcon } from "@/components/ui/visuals/PixelIcon";

interface GameInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: "lock" | "user" | "mail" | "shield";
  label: string;
  error?: string;
}

export const GameInput = forwardRef<HTMLInputElement, GameInputProps>(
  ({ icon, label, error, type, className = "", ...props }, ref) => {

    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    const baseWrapper =
    "relative border bg-[var(--surface-alt)] rounded-md transition-all duration-200";

    const focusStyle =
    "border-[var(--secondary)] shadow-[0_0_8px_rgba(var(--secondary-rgb),0.2)]";

    const errorStyle = "border-[var(--danger)]";

    const normalStyle = "border-[var(--border)]";

    const wrapperStyle = `
      ${baseWrapper}
      ${isFocused ? focusStyle : error ? errorStyle : normalStyle}
      ${className}
    `;

    return (
      <div className="space-y-2">

        <label className="text-[var(--text-primary)]  tracking-wide block">
          {label}
        </label>

        <div className="relative">

          <div className={wrapperStyle}>

            <InputIcon icon={icon} />

            <input
              ref={ref}
              type={inputType}
              className="w-full bg-transparent text-[var(--text-primary)] pl-11 pr-11 py-3 outline-none placeholder:text-[var(--text-secondary)]"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />

            {isPassword && (
              <PasswordToggle
                visible={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            )}

          </div>

          <InputShadow isFocused={isFocused} />

        </div>

        {error && <InputError message={error} />}

      </div>
    );
  }
);

GameInput.displayName = "GameInput";

function InputIcon({ icon }: { icon: "lock" | "user" | "mail" | "shield" }) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <PixelIcon type={icon} className="w-4 h-4 text-[var(--secondary)]" />
    </div>
  );
}

function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--secondary)] transition-colors"
    >
      <PixelIcon
        type={visible ? "eye-off" : "eye"}
        className="w-6 h-6"
      />
    </button>
  );
}

function InputShadow({ isFocused }: { isFocused: boolean }) {
  return (
    <div
      className={`
        absolute inset-0 rounded-md -z-10
        transition-all duration-200
        ${isFocused ? "shadow-[0_2px_10px_rgba(0,0,0,0.25)]" : "shadow-[0_1px_4px_rgba(0,0,0,0.15)]"}
      `}
    />
  );
}

function InputError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 mt-1">
      <span className="text-[var(--danger)] mt-0.5">⚠</span>
      <p className="text-[var(--danger)]">{message}</p>
    </div>
  );
}