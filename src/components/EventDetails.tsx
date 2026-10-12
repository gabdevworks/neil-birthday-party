import { CalendarDays, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { eventDetails, mapsSearchUrl } from "../utils/dateTime";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export function EventDetails() {
  const mapsUrl = mapsSearchUrl(eventDetails.venue);

  return (
    <motion.section
      aria-labelledby="event-details-heading"
      className="glass-card rounded-3xl p-5 sm:p-7"
      variants={list}
      initial="hidden"
      animate="show"
    >
      <h2 id="event-details-heading" className="sr-only">
        Event details
      </h2>

      <motion.div variants={item} className="group rounded-2xl p-2 transition hover:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2 text-xs tracking-[0.24em] text-cyan">
          <CalendarDays className="size-4" aria-hidden="true" />
          DATE
        </div>
        <div className="flex items-end gap-4">
          <p className="font-display text-6xl leading-none font-semibold text-snow sm:text-7xl" aria-hidden="true">
            {eventDetails.dayLabel}
          </p>
          <p className="pb-1 text-sm tracking-[0.18em] text-mist" aria-hidden="true">
            {eventDetails.monthLabel}
          </p>
        </div>
        <p className="mt-3 text-base text-snow">{eventDetails.dateLabel}</p>
      </motion.div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />

      <motion.div variants={item} className="rounded-2xl p-2 transition hover:bg-white/[0.03]">
        <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.24em] text-cyan">
          <Clock className="size-4" aria-hidden="true" />
          TIME
        </div>
        <p className="font-display text-2xl text-snow sm:text-3xl">{eventDetails.timeLabel}</p>
        <p className="mt-2 text-sm text-mist">Philippine Time, UTC+8</p>
      </motion.div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />

      <motion.div variants={item} className="rounded-2xl p-2 transition hover:bg-white/[0.03]">
        <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.24em] text-cyan">
          <MapPin className="size-4" aria-hidden="true" />
          LOCATION
        </div>
        <p className="font-display text-2xl text-snow sm:text-3xl">{eventDetails.venue}</p>
        <a
          className="location-button mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-5 text-xs font-semibold tracking-[0.2em] text-snow transition hover:border-cyan/50 hover:bg-cyan/10 sm:w-auto"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          VIEW LOCATION
        </a>
      </motion.div>
    </motion.section>
  );
}
