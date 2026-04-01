import { motion } from "motion/react";
import { InputHTMLAttributes, forwardRef } from "react";

interface GameCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const GameCheckbox = forwardRef<HTMLInputElement, GameCheckboxProps>(
  ({ label, checked, className = "", ...props }, ref) => {

    const isChecked = Boolean(checked);

    const baseBox =
      "w-5 h-5 border-2 transition-all duration-200";

    const checkedStyle =
      "bg-[var(--secondary)] border-[var(--secondary)]";

    const uncheckedStyle =
      "bg-[var(--surface-alt)] border-[var(--secondary)]/50 group-hover:border-[var(--secondary)]";

    const boxStyle = `
      ${baseBox}
      ${isChecked ? checkedStyle : uncheckedStyle}
    `;

    return (
      <label className={`flex items-center gap-3 group ${className}`}>
        
        <div className="relative flex-shrink-0 mt-0.5 border-[var(--border)]">
          
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={checked}
            {...props}
          />

          <div className={boxStyle}>
            {isChecked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center h-full"
              >
                <CheckIcon />
              </motion.div>
            )}
          </div>

          <div className="absolute inset-0 border-2 border-[var(--background)] -z-10 translate-x-0.5 translate-y-0.5" />
        </div>

        <span className="text-[var(--text-primary)] text-sm leading-tight flex-1">
          {label}
        </span>

      </label>
    );
  }
);

GameCheckbox.displayName = "GameCheckbox";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="w-3 h-3 text-[var(--background)]"
      fill="currentColor"
    >
      <rect x="1" y="6" width="2" height="2" />
      <rect x="3" y="8" width="2" height="2" />
      <rect x="5" y="6" width="2" height="2" />
      <rect x="7" y="4" width="2" height="2" />
      <rect x="9" y="2" width="2" height="2" />
    </svg>
  );
}