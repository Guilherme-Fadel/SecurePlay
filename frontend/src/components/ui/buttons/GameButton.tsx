import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface GameButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
  children: ReactNode;
}

export function GameButton({
  variant = "primary",
  isLoading = false,
  children,
  disabled,
  className = "",
  ...props
}: GameButtonProps) {

  const disabledState = disabled || isLoading;
  const primary = variant === "primary";

  const baseStyle =
    "relative inline-flex items-center justify-center py-4 font-bold tracking-wide border-2 transition-all duration-200";

  const disabledStyle =
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const primaryStyle =
    "bg-[var(--primary)] border-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)]";

  const secondaryStyle =
    "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[--border-light]";

  const buttonStyle = `
    ${baseStyle}
    ${disabledStyle}
    ${primary ? primaryStyle : secondaryStyle}
    ${!disabledState ? "active:translate-x-0.5 active:translate-y-0.5" : ""}
    ${className}
  `;

  return (
    <motion.button
      {...props}
      disabled={disabledState}
      whileHover={!disabledState ? { scale: 1.02 } : {}}
      whileTap={!disabledState ? { scale: 0.98 } : {}}
      className={buttonStyle}
    >

      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Carregando...</span>
          </>
        ) : (
          children
        )}
      </span>

      {!disabledState && (
        <motion.div
          className={`absolute inset-0 opacity-0 hover:opacity-20 transition-opacity ${
            primary ? "bg-[var(--secondary)]" : "bg-[var(--background-primary)]"
          }`}
          initial={{ opacity: 0 }}
        />
      )}

      <div
        className="
          absolute inset-0 border-2 border-[var(--background)] -z-10
          transition-all duration-200 translate-x-1 translate-y-1
        "
      />

    </motion.button>
  );
}

function LoadingSpinner() {
  return (
    <motion.div
      className="w-4 h-4 rounded-full border-2 border-[var(--border-primary)] border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}