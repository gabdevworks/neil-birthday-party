import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AdminPage } from "./components/AdminPage";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { BarPage } from "./components/BarPage";
import { GuestSearch } from "./components/GuestSearch";
import { InvitationPage } from "./components/InvitationPage";
import { PageTransition } from "./components/PageTransition";
import { publishLocalRsvps } from "./lib/partyApi";
import {
  isDemoMode,
  leaveInvitation,
  openInvitationLink,
  readInviteTokenFromLocation,
  removeInviteTokenFromLocation,
  restoreInvitation,
} from "./services/guestService";
import type { OpenedInvitation } from "./types/guest";

type View = "welcome" | "sweep" | "invitation" | "bar";

const PARTY_TRACK = "/LMFAO%20-%20Sorry%20For%20Party%20Rocking%20(Lyrics).mp3";

function PartyTrack() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;

    const start = () => {
      void audio.play().catch(() => undefined);
    };

    start();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  return <audio ref={audioRef} src={PARTY_TRACK} preload="auto" autoPlay />;
}

function isAdminPath(): boolean {
  return window.location.pathname.replace(/\/+$/, "") === "/admin";
}

export default function App() {
  const [admin, setAdmin] = useState(isAdminPath);
  const [view, setView] = useState<View>("welcome");
  const [invitation, setInvitation] = useState<OpenedInvitation | null>(null);
  const [pending, setPending] = useState<OpenedInvitation | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootMessage, setBootMessage] = useState("");
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    function onPop() {
      setAdmin(isAdminPath());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        if (isDemoMode()) await publishLocalRsvps();
        const inviteToken = readInviteTokenFromLocation();
        if (inviteToken && !isDemoMode()) {
          const opened = await openInvitationLink(inviteToken);
          removeInviteTokenFromLocation();
          if (cancelled) return;
          if (opened) {
            setInvitation(opened);
            setView("invitation");
            return;
          }
          setBootMessage("This invitation link could not be verified. Search for your name instead.");
        } else if (inviteToken && isDemoMode()) {
          setBootMessage("Invitation links work after the database is configured. Search for your name to continue.");
        }

        const restored = await restoreInvitation();
        if (cancelled) return;
        if (restored) {
          setInvitation(restored);
          setView("invitation");
        }
      } catch {
        if (!cancelled) {
          setBootMessage("We could not restore your invitation. Please search for your name again.");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishSweep = useCallback(() => {
    setInvitation(pending);
    setPending(null);
    setView("invitation");
  }, [pending]);

  const openBar = useCallback(() => {
    setView("bar");
  }, []);

  function openFromSearch(next: OpenedInvitation) {
    setPending(next);
    setView("sweep");
  }

  function closeAdmin() {
    window.history.pushState({}, "", "/");
    setAdmin(false);
  }

  function changeGuest() {
    leaveInvitation();
    setInvitation(null);
    setPending(null);
    setSearchKey((current) => current + 1);
    setView("welcome");
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatedBackground />
      <PartyTrack />
      <main className="relative z-10 min-h-dvh overflow-x-hidden">
        {admin ? (
          <AdminPage onHome={closeAdmin} />
        ) : booting ? (
          <div className="grid min-h-dvh place-items-center px-6">
            <p className="text-center text-sm font-medium tracking-wide text-cyan" role="status">
              NEIL MARTIN'S POST BIRTHDAY CELEBRATION
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === "welcome" && (
              <motion.section
                key="welcome"
                className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="max-w-xs rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-center text-xs font-medium tracking-wide text-cyan sm:max-w-none sm:text-sm">
                  NEIL MARTIN'S POST BIRTHDAY CELEBRATION
                </p>
                <h1 className="mt-7 text-center font-display text-[2.4rem] leading-[0.95] font-semibold tracking-tight text-snow sm:text-7xl">
                  THIS NIGHT'S GONNA HIT
                </h1>
                <p className="mt-5 max-w-md text-center text-base leading-relaxed text-mist sm:text-lg">
                  Food, drinks, and a party worth clearing your night for. If your name's here, you're in.
                </p>
                {bootMessage && (
                  <p className="mt-4 max-w-md text-center text-sm text-snow" role="status">
                    {bootMessage}
                  </p>
                )}
                <div className="mt-10 w-full">
                  <GuestSearch key={searchKey} locked={view !== "welcome"} onContinue={openFromSearch} onViewList={openBar} />
                </div>
                <p className="party-yell mt-10" aria-label="Let's PARTYYYYYYYYYYY!">
                  <span className="party-yell-lead">Let's</span>
                  <span className="party-yell-word">PARTYYYYYYYYYYY!</span>
                </p>
              </motion.section>
            )}
            {view === "invitation" && invitation && (
              <InvitationPage
                key={invitation.guest.id}
                invitation={invitation}
                onChangeGuest={changeGuest}
                onAttending={openBar}
              />
            )}
            {view === "bar" && <BarPage key="bar" onBack={changeGuest} />}
          </AnimatePresence>
        )}
        <AnimatePresence>
          {view === "sweep" && <PageTransition key="sweep" onComplete={finishSweep} />}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
