import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function PixelCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      <CursorCore position={position} />
      <CursorRing position={position} />
    </>
  );
}


function CursorCore({ position }: { position: { x: number; y: number } }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9999] mix-blend-difference"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-6 h-6">
          <CenterPixel />
          <CursorArrows />
        </div>
      </div>
    </motion.div>
  );
}


function CursorRing({ position }: { position: { x: number; y: number } }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="w-9 h-9 border-2 border-[var(--secondary)] mix-blend-difference opacity-40"></div>
      </div>
    </motion.div>
  );
}


function CenterPixel() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[var(--background-primary)] border border-black" />
  );
}

function CursorArrows() {
  return (
    <>
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-1.5 bg-[var(--background-primary)] border border-black" />
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1 h-1.5 bg-[var(--background-primary)] border border-black" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-[var(--background-primary)] border border-black" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-[var(--background-primary)] border border-black" />
    </>
  );
}