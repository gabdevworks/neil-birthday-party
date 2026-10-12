import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { listArrivals } from "../services/rsvpService";
import type { Guest } from "../types/guest";

interface BarPageProps {
  onBack: () => void;
}

const shirts = ["#3B82F6", "#22D3EE", "#F8FAFC", "#F59E0B", "#FB7185", "#A78BFA", "#34D399"];
const gestures = ["hands-up", "drink", "wave-left", "hands-up", "wave-right", "drink"] as const;

type Gesture = (typeof gestures)[number];

function Walker({ person, index, shirt }: { person: Guest; index: number; shirt: string }) {
  const gesture: Gesture = gestures[index % gestures.length];
  const delay = `${(index % 7) * 0.12}s`;
  return (
    <div className="flex w-max min-w-14 flex-col items-center px-1">
      <p className="mb-1 whitespace-nowrap text-center text-[0.65rem] font-semibold text-snow">{person.fullName}</p>
      <div>
        <div className="mx-auto size-6 rounded-full bg-[#F8D7C4] shadow-[0_0_0_2px_rgba(255,255,255,0.15)]" />
        <div className="relative mx-auto mt-0.5 h-10 w-7 rounded-t-xl" style={{ background: shirt }}>
          <span className={`bar-arm bar-arm-left bar-gesture-${gesture} absolute top-0.5 -left-1.5 h-6 w-1.5 rounded-full bg-[#F8D7C4]`} style={{ animationDelay: delay }}>
            <span className="absolute -left-0.5 bottom-0 size-2 rounded-full bg-[#F8D7C4]" />
          </span>
          <span className={`bar-arm bar-arm-right bar-gesture-${gesture} absolute top-0.5 -right-1.5 h-6 w-1.5 rounded-full bg-[#F8D7C4]`} style={{ animationDelay: delay }}>
            <span className="absolute -right-0.5 bottom-0 size-2 rounded-full bg-[#F8D7C4]" />
            {gesture === "drink" && (
              <span className="absolute -right-1.5 bottom-0.5 h-2.5 w-2 rounded-b-sm rounded-t-xs border border-white/40 bg-cyan/40" />
            )}
          </span>
        </div>
        <div className="mx-auto flex w-7 items-start justify-between">
          <span className="relative h-5 w-1.5 rounded-full bg-[#2A4568]">
            <span className="absolute -bottom-0.5 left-1/2 h-1 w-2.5 -translate-x-1/2 rounded-full bg-[#1B3350]" />
          </span>
          <span className="relative h-5 w-1.5 rounded-full bg-[#2A4568]">
            <span className="absolute -bottom-0.5 left-1/2 h-1 w-2.5 -translate-x-1/2 rounded-full bg-[#1B3350]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function BarPage({ onBack }: BarPageProps) {
  const [people, setPeople] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listArrivals()
      .then((arrivals) => {
        if (!cancelled) setPeople(arrivals);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.section
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/10 px-4 text-xs tracking-[0.18em] text-mist transition hover:border-cyan/50 hover:bg-cyan/10 hover:text-snow"
        onClick={onBack}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        BACK
      </button>

      <header className="mt-6 text-center">
        <p className="text-xs tracking-[0.28em] text-cyan">THE BAR</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-snow sm:text-6xl">Who's coming</h1>
        <p className="mt-3 text-sm text-mist sm:text-base">
          {loading ? "Checking the door..." : `${people.length} ${people.length === 1 ? "person" : "people"} walking in for a drink`}
        </p>
      </header>

      <div className="relative mt-8 flex flex-1 flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-[#07101f]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-47 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_68%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute top-6 left-1/2 flex h-16 w-40 -translate-x-1/2 flex-col items-center justify-center rounded-full border border-cyan/30 shadow-[0_0_24px_rgba(34,211,238,0.35)]" aria-hidden="true">
          <p className="text-[0.65rem] leading-tight tracking-[0.28em] text-cyan">PARTY</p>
          <p className="text-[0.65rem] leading-tight tracking-[0.28em] text-cyan">TIME</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-24 flex h-24 items-end gap-1 px-3 sm:gap-1.5 sm:px-4" aria-hidden="true">
          {Array.from({ length: 36 }, (_, index) => (
            <span
              key={index}
              className="eq-bar"
              style={{
                animationDuration: `${0.62 + ((index * 37) % 70) / 100}s`,
                animationDelay: `${(index % 9) * 0.06}s`,
              }}
            />
          ))}
        </div>

        <div className="bar-crowd relative z-10 mt-52 min-h-0 flex-1 overflow-y-auto px-3" aria-label="Confirmed guests">
          <div className="flex min-h-full flex-wrap content-end items-end justify-center gap-x-1 gap-y-3 pb-2">
            {people.map((person, index) => (
              <Walker key={person.id} person={person} index={index} shirt={shirts[index % shirts.length]} />
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
