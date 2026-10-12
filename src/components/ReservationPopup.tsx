import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ReservationPopupProps {
  guestName: string;
  onDone: () => void;
}

export function ReservationPopup({ guestName, onDone }: ReservationPopupProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 2100);
    return () => window.clearTimeout(timeout);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[#050B18]/75 px-5 backdrop-blur-md"
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-card w-full max-w-md rounded-[2rem] px-6 py-10 text-center shadow-[0_0_60px_rgba(34,211,238,0.28)]"
        initial={{ scale: 0.86, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <motion.div
          className="mx-auto mb-5 grid size-16 place-items-center rounded-full border border-cyan/50 bg-cyan/15 text-cyan shadow-[0_0_32px_rgba(34,211,238,0.45)]"
          initial={{ scale: 0.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
        >
          <Check className="size-8" aria-hidden="true" />
        </motion.div>
        <p className="font-display text-3xl tracking-tight text-snow">You're in, {guestName}</p>
        <p className="mt-3 text-base text-mist">Your spot is saved. Heading to The Beech.</p>
      </motion.div>
    </motion.div>
  );
}
