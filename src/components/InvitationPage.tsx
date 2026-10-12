import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { OpenedInvitation } from "../types/guest";
import { eventDetails } from "../utils/dateTime";
import { Countdown } from "./Countdown";
import { EventDetails } from "./EventDetails";
import { RSVPButton } from "./RSVPButton";

interface InvitationPageProps {
  invitation: OpenedInvitation;
  onChangeGuest: () => void;
  onAttending: () => void;
}

export function InvitationPage({ invitation, onChangeGuest, onAttending }: InvitationPageProps) {
  const { guest } = invitation;

  return (
    <motion.article
      className="mx-auto w-full max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs tracking-[0.18em] text-mist transition hover:border-cyan/40 hover:text-snow"
        onClick={onChangeGuest}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        CHANGE GUEST
      </button>

      <header className="text-center">
        <p className="text-xs tracking-[0.28em] text-cyan">YEAH, YOU'RE IN</p>
        <h1 className="mt-4 font-display text-[2.2rem] leading-[0.95] font-semibold tracking-tight text-snow sm:text-6xl">
          {eventDetails.title}
        </h1>
        <div className="luminous-line mx-auto mt-6" />
        <p className="mt-8 font-display text-2xl text-snow sm:text-3xl">Hey {guest.fullName},</p>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
          Food's out, drinks are flowing, and this night is about to take off. Show up, stay late, and don't miss it.
        </p>
        <p className="mx-auto mt-6 inline-block rounded-full border border-cyan/40 bg-cyan/15 px-4 py-2 text-xs tracking-[0.18em] text-cyan shadow-[0_0_24px_rgba(34,211,238,0.35)]">
          Neil Martin's Post Birthday Celebration
        </p>
      </header>

      <div className="mt-10">
        <EventDetails />
      </div>
      <div className="mt-8">
        <Countdown />
      </div>
      <div className="mt-12">
        <RSVPButton key={guest.id} invitation={invitation} onAttending={onAttending} onHome={onChangeGuest} />
      </div>
    </motion.article>
  );
}
