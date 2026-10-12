import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import type { Guest } from "../data/guests";
import { openInvitation, readJoiningStatus, resolveGuest, searchGuests } from "../services/guestService";
import type { OpenedInvitation } from "../types/guest";
import { resolveExactGuest } from "../utils/guestSearch";
import { GuestSuggestions } from "./GuestSuggestions";

interface GuestSearchProps {
  onContinue: (invitation: OpenedInvitation) => void;
  onViewList: () => void;
  locked: boolean;
}

export function GuestSearch({ onContinue, onViewList, locked }: GuestSearchProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [joinState, setJoinState] = useState<"unknown" | "joining" | "open">("unknown");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const requestId = useRef(0);

  function lookup(value: string) {
    const trimmed = value.trim();
    const id = ++requestId.current;
    if (!trimmed) {
      setMatches([]);
      setStatus("idle");
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    setStatus("loading");
    Promise.all([searchGuests(value), resolveGuest(value)])
      .then(([found, exact]) => {
        if (requestId.current !== id) return;
        if (exact) {
          setSelected(exact);
          setMatches([]);
          setActiveIndex(-1);
          setOpen(false);
          setStatus("ready");
          return;
        }
        setMatches(found);
        setActiveIndex(-1);
        setSelected(null);
        setOpen(true);
        setStatus("ready");
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setMatches([]);
        setSelected(null);
        setActiveIndex(-1);
        setStatus("error");
      });
  }

  useEffect(() => {
    if (!selected || selected.fullName.toLowerCase() !== query.trim().toLowerCase()) {
      setJoinState("unknown");
      return;
    }
    let cancelled = false;
    setJoinState("unknown");
    readJoiningStatus(selected.fullName)
      .then((attendance) => {
        if (!cancelled) setJoinState(attendance === "in" ? "joining" : "open");
      })
      .catch(() => {
        if (!cancelled) setJoinState("open");
      });
    return () => {
      cancelled = true;
    };
  }, [query, selected]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listId}-option-${matches[activeIndex]?.id}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, listId, matches]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function updateQuery(value: string) {
    setQuery(value);
    setFormError("");
    setActiveIndex(-1);
    const immediate = resolveExactGuest(matches, value);
    if (immediate) {
      requestId.current += 1;
      setSelected(immediate);
      setMatches([]);
      setActiveIndex(-1);
      setStatus("ready");
      setOpen(false);
      return;
    }
    const trimmed = value.trim().toLowerCase();
    setSelected((current) => {
      if (!current) return null;
      return current.fullName.toLowerCase() === trimmed ? current : null;
    });
    lookup(value);
  }

  function isExactQuery(value = query, guest = selected): boolean {
    return Boolean(guest && guest.fullName.toLowerCase() === value.trim().toLowerCase());
  }

  function selectGuest(guest: Guest) {
    requestId.current += 1;
    setQuery(guest.fullName);
    setSelected(guest);
    setStatus("ready");
    setOpen(false);
    setActiveIndex(-1);
    setFormError("");
    inputRef.current?.focus();
  }

  async function continueInvitation() {
    if (locked || submitting || submitLock.current || !selected) return;
    submitLock.current = true;
    setSubmitting(true);
    setFormError("");
    try {
      const exact = await resolveGuest(query);
      if (!exact || exact.id !== selected.id || exact.fullName !== selected.fullName) {
        setSelected(null);
        setFormError("No invitation found under this name. Please check your spelling.");
        submitLock.current = false;
        setSubmitting(false);
        return;
      }
      const invitation = await openInvitation(exact.fullName);
      if (!invitation || invitation.guest.id !== exact.id || invitation.guest.fullName !== exact.fullName) {
        setFormError("No invitation found under this name. Please check your spelling.");
        submitLock.current = false;
        setSubmitting(false);
        return;
      }
      if (invitation.attendance === "in") {
        submitLock.current = false;
        setSubmitting(false);
        onViewList();
        return;
      }
      onContinue(invitation);
    } catch {
      setFormError("The invitation service is unavailable. Please try again.");
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (matches.length === 0 || isExactQuery()) return;
      setOpen(true);
      setActiveIndex((current) => (current + 1) % matches.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length === 0 || isExactQuery()) return;
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && matches[activeIndex]) {
        event.preventDefault();
        selectGuest(matches[activeIndex]);
        return;
      }
      if (selected) {
        event.preventDefault();
        if (joinState === "joining") onViewList();
        else void continueInvitation();
      }
    }
  }

  const showSuggestions = open && query.trim().length > 0 && status !== "idle";
  const activeOptionId =
    open && activeIndex >= 0 && matches[activeIndex]
      ? `${listId}-option-${matches[activeIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      <label htmlFor="guest-name" className="mb-3 block text-center text-xs tracking-[0.28em] text-mist">
        YOUR NAME
      </label>
      <div className="search-shell">
        <div className="search-field flex min-h-16 items-center gap-2 rounded-[1.1rem] px-4 sm:px-5">
          <input
            ref={inputRef}
            id="guest-name"
            role="combobox"
            type="text"
            value={query}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            placeholder="Enter your name to find your invitation..."
            className="h-14 w-full bg-transparent text-base text-snow outline-none placeholder:text-mist/80 sm:text-lg"
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => {
              if (query.trim() && !isExactQuery()) setOpen(true);
            }}
            onClick={() => {
              if (query.trim() && status !== "idle" && !isExactQuery()) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {query && (
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-full text-mist transition hover:bg-white/5 hover:text-snow"
              aria-label="Clear name"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <GuestSuggestions
            query={query}
            matches={status === "ready" ? matches : []}
            activeIndex={activeIndex}
            status={status}
            listId={listId}
            onSelect={selectGuest}
            onHighlight={setActiveIndex}
          />
        )}
      </AnimatePresence>

      <div className="mt-4 min-h-6 text-center text-sm text-cyan" role="alert">
        {formError}
      </div>

      <AnimatePresence>
        {selected && joinState === "joining" && (
          <motion.div
            key="already-joining"
            className="mt-2 text-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <p className="text-sm text-snow" role="status">
              You're already joining, {selected.fullName}.
            </p>
            <button
              type="button"
              className="primary-button mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full border border-cyan/50 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#0891b2] px-8 text-sm font-semibold tracking-[0.22em] text-snow shadow-[0_0_28px_rgba(59,130,246,0.35)] transition hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              onClick={onViewList}
            >
              SEE THE GUEST LIST
            </button>
          </motion.div>
        )}
        {selected && joinState === "open" && (
          <motion.div
            key="see-invitation"
            className="mt-2 flex justify-center"
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              className="primary-button inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-cyan/50 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#0891b2] px-8 text-sm font-semibold tracking-[0.22em] text-snow shadow-[0_0_28px_rgba(59,130,246,0.35)] transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
              disabled={locked || submitting}
              onClick={() => void continueInvitation()}
            >
              LET'S GO
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
