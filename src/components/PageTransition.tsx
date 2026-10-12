import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
  onComplete: () => void;
}

export function PageTransition({ onComplete }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, reduceMotion ? 180 : 1080);
    return () => window.clearTimeout(timeout);
  }, [onComplete, reduceMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-navy"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="sr-only">Opening your invitation</span>
      <div className="scan-beam" />
      <div className="h-px w-[min(70vw,28rem)] bg-gradient-to-r from-transparent via-cyan to-transparent shadow-[0_0_24px_rgba(34,211,238,0.65)]" />
    </motion.div>
  );
}
