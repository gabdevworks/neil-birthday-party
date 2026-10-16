import { ArrowUpRight, LoaderCircle, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { Guest } from "../data/guests";
import { splitMatch } from "../utils/guestSearch";

interface GuestSuggestionsProps {
  query: string;
  matches: Guest[];
  activeIndex: number;
  status: "loading" | "ready" | "error";
  listId: string;
  onSelect: (guest: Guest) => void;
  onHighlight: (index: number) => void;
}

export function GuestSuggestions({
  query,
  matches,
  activeIndex,
  status,
  listId,
  onSelect,
  onHighlight,
}: GuestSuggestionsProps) {
  return (
    <motion.div
      id={listId}
      role={matches.length > 0 ? "listbox" : "status"}
      aria-label={matches.length > 0 ? "Matching invitations" : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute top-[calc(100%+0.6rem)] z-30 max-h-[min(18rem,42vh)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-navy-2/95 p-2 shadow-[0_18px_50px_rgba(2,6,23,0.55)] backdrop-blur-xl"
    >
      {status === "loading" && (
        <p className="flex items-center gap-2 px-3 py-3 text-sm text-mist">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-cyan" aria-hidden="true" />
          Looking up invitations...
        </p>
      )}
      {status === "error" && (
        <p className="px-3 py-3 text-sm text-snow" role="alert">
          The invitation service is unavailable. Please try again.
        </p>
      )}
      {status === "ready" && matches.length === 0 && (
        <p className="px-3 py-3 text-sm leading-relaxed text-snow">
          No invitation found under this name. Please check your spelling.
        </p>
      )}
      {status === "ready" &&
        matches.map((guest, index) => {
          const selected = index === activeIndex;
          const segments = splitMatch(guest.fullName, query);
          return (
            <motion.button
              key={guest.id}
              id={`${listId}-option-${guest.id}`}
              type="button"
              role="option"
              aria-selected={selected}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.2 }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
                selected ? "bg-[#3B82F6]/20 text-snow" : "text-snow hover:bg-white/5"
              }`}
              onMouseEnter={() => onHighlight(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(guest)}
            >
              <UserRound className="size-4 shrink-0 text-cyan" aria-hidden="true" />
              <span className="flex-1 text-base">
                {segments.map((segment, segmentIndex) =>
                  segment.match ? (
                    <mark key={`${guest.id}-${segmentIndex}`} className="bg-transparent font-semibold text-cyan">
                      {segment.text}
                    </mark>
                  ) : (
                    <span key={`${guest.id}-${segmentIndex}`}>{segment.text}</span>
                  ),
                )}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-mist" aria-hidden="true" />
            </motion.button>
          );
        })}
    </motion.div>
  );
}
