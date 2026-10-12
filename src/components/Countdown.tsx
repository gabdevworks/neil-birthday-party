import { useMemo } from "react";
import { useCountdown } from "../hooks/useCountdown";
import { eventDetails, getEventInstant, padTime } from "../utils/dateTime";

const units = ["Days", "Hours", "Minutes", "Seconds"] as const;

export function Countdown() {
  const target = useMemo(() => getEventInstant(), []);
  const remaining = useCountdown(target);

  if (!remaining.valid) {
    return (
      <p className="text-center text-sm text-mist" role="status">
        Event time is unavailable.
      </p>
    );
  }

  if (remaining.started) {
    return (
      <p className="text-center font-display text-sm tracking-[0.28em] text-cyan" role="status">
        THE PARTY HAS STARTED
      </p>
    );
  }

  const values = [remaining.days, remaining.hours, remaining.minutes, remaining.seconds];
  const label = `${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, and ${remaining.seconds} seconds until ${eventDetails.title}`;

  return (
    <div role="timer" aria-label={label}>
      <p className="mb-3 text-center text-[0.68rem] tracking-[0.28em] text-mist">UNTIL THE PARTY</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((unit, index) => (
          <div key={unit} className="rounded-2xl border border-white/10 bg-navy/70 px-2 py-3 text-center">
            <div className="font-display text-2xl text-snow sm:text-3xl" aria-hidden="true">
              {padTime(values[index] ?? 0)}
            </div>
            <div className="mt-1 text-[0.62rem] tracking-[0.16em] text-mist uppercase" aria-hidden="true">
              {unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
