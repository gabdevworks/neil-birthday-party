import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { saveRsvp } from "../services/rsvpService";
import type { Attendance, OpenedInvitation } from "../types/guest";
import { ReservationPopup } from "./ReservationPopup";

interface RSVPButtonProps {
  invitation: OpenedInvitation;
  onAttending: () => void;
  onHome: () => void;
}

const SAVE_ERROR = "We couldn't save your confirmation. Please try again.";

export function RSVPButton({ invitation, onAttending, onHome }: RSVPButtonProps) {
  const initial = invitation.attendance ?? (invitation.confirmed ? "in" : null);
  const [choice, setChoice] = useState<Attendance | null>(initial);
  const [saving, setSaving] = useState<Attendance | null>(null);
  const [error, setError] = useState("");
  const [popupName, setPopupName] = useState<string | null>(null);
  const [askDecline, setAskDecline] = useState(false);
  const [sadNote, setSadNote] = useState(false);
  const submitLock = useRef(false);

  async function submit(attendance: Attendance): Promise<boolean> {
    if (submitLock.current || saving) return false;
    if (attendance === "in" && choice === "in") {
      setPopupName(invitation.guest.fullName);
      return true;
    }
    if (choice === attendance) return attendance === "out";
    submitLock.current = true;
    setSaving(attendance);
    setError("");
    const result = await saveRsvp(invitation.sessionToken, attendance);
    submitLock.current = false;
    setSaving(null);
    if (!result.ok || result.guest.id !== invitation.guest.id) {
      setError(SAVE_ERROR);
      return false;
    }
    setChoice(result.attendance);
    if (result.attendance === "in") {
      setSadNote(false);
      setPopupName(result.guest.fullName);
    }
    return result.attendance === attendance;
  }

  function requestDecline() {
    if (saving) return;
    if (choice === "out") {
      setSadNote(true);
      return;
    }
    setAskDecline(true);
  }

  async function confirmDecline() {
    const saved = await submit("out");
    if (!saved) return;
    setAskDecline(false);
    setSadNote(true);
  }

  return (
    <section className="text-center" aria-label="RSVP">
      <div aria-live="polite" aria-atomic="true">
        <p className="fun-ready mb-5 font-display text-2xl tracking-tight text-snow sm:text-3xl">Are you ready to have some fun!?</p>
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className={`inline-flex min-h-16 flex-1 items-center justify-center rounded-full px-6 text-lg font-semibold transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 ${
              choice === "in"
                ? "border border-cyan/50 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#0e7490] text-snow shadow-[0_0_28px_rgba(34,211,238,0.35)]"
                : "border border-white/15 bg-white/[0.03] text-snow"
            }`}
            onClick={() => void submit("in")}
            disabled={saving !== null}
            aria-pressed={choice === "in"}
            aria-busy={saving === "in"}
          >
            {saving === "in" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : "I'm Down"}
          </button>
          <button
            type="button"
            className={`inline-flex min-h-16 flex-1 items-center justify-center rounded-full px-5 text-center text-base leading-tight font-semibold text-balance transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 ${
              choice === "out"
                ? "border border-red-300/70 bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#b91c1c] text-white shadow-[0_0_28px_rgba(220,38,38,0.45)]"
                : "border border-red-400/50 bg-red-950/30 text-red-300"
            }`}
            onClick={requestDecline}
            disabled={saving !== null}
            aria-pressed={choice === "out"}
            aria-busy={saving === "out"}
          >
            {saving === "out" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : "My parents won't let me"}
          </button>
        </div>
        {saving && <p className="sr-only">Saving your answer.</p>}
        {error && (
          <p className="mt-4 text-sm text-snow" role="alert">
            {error}
          </p>
        )}
      </div>

      {popupName &&
        createPortal(
          <ReservationPopup guestName={popupName} onDone={onAttending} />,
          document.body,
        )}
      {sadNote &&
        createPortal(
          <SadDeclinePopup guestName={invitation.guest.fullName} onDone={onHome} />,
          document.body,
        )}
      {askDecline &&
        createPortal(
          <DeclineConfirm
            saving={saving === "out"}
            onYes={() => void confirmDecline()}
            onNo={() => {
              if (saving) return;
              setAskDecline(false);
            }}
          />,
          document.body,
        )}
    </section>
  );
}

function SadDeclinePopup({ guestName, onDone }: { guestName: string; onDone: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 4200);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[#050B18]/75 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sad-decline-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="glass-card w-full max-w-md rounded-[2rem] px-6 py-10 text-center shadow-[0_0_60px_rgba(220,38,38,0.22)]"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
      >
        <p id="sad-decline-title" className="font-display text-3xl tracking-tight text-snow">
          See you next year, {guestName}
        </p>
        <p className="mt-3 text-base leading-relaxed text-mist">
          The food, the drinks, and the whole night are going to go off without you. Everyone else gets the fun. You'll just hear about it later.
        </p>
        <button
          type="button"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-snow transition hover:border-cyan/40 hover:text-cyan"
          onClick={onDone}
        >
          Back home
        </button>
      </motion.div>
    </motion.div>
  );
}

function DeclineConfirm({ saving, onYes, onNo }: { saving: boolean; onYes: () => void; onNo: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onNo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo, saving]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[#050B18]/75 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decline-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="glass-card w-full max-w-md rounded-[2rem] px-6 py-10 text-center shadow-[0_0_60px_rgba(220,38,38,0.22)]"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
      >
        <p id="decline-title" className="font-display text-3xl tracking-tight text-snow">
          Are you sure?
        </p>
        <p className="mt-3 text-base leading-relaxed text-mist">
          This night only happens once. Sit it out and you miss the whole thing.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-snow transition hover:border-cyan/40 hover:text-cyan disabled:opacity-70"
            onClick={onNo}
            disabled={saving}
          >
            No, I'll be there
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-red-300/70 bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#b91c1c] px-5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-70"
            onClick={onYes}
            disabled={saving}
          >
            {saving ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : "Yes, I'm out"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
