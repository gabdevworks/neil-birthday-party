import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { createGuest, fetchGuestList } from "../services/guestService";
import type { Guest } from "../types/guest";

interface AdminPageProps {
  onHome: () => void;
}

export function AdminPage({ onHome }: AdminPageProps) {
  const [roster, setRoster] = useState<Guest[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGuestList()
      .then((guests) => {
        if (!cancelled) setRoster(guests);
      })
      .catch(() => {
        if (!cancelled) setError("The guest list could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addGuest(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    const result = await createGuest(name);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRoster(await fetchGuestList());
    setName("");
    setMessage(`${result.guest.fullName} is on the list.`);
  }

  return (
    <motion.section
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/10 px-4 text-xs tracking-[0.18em] text-mist transition hover:border-cyan/50 hover:bg-cyan/10 hover:text-snow"
        onClick={onHome}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        HOME
      </button>

      <header className="mt-8 text-center">
        <p className="text-xs tracking-[0.28em] text-cyan">ADMIN</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-snow sm:text-6xl">Add a guest</h1>
        <p className="mt-3 text-sm text-mist">No login. New names can be searched on the home page right away.</p>
      </header>

      <form className="mt-8" onSubmit={addGuest}>
        <label htmlFor="new-guest" className="mb-3 block text-center text-xs tracking-[0.28em] text-mist">
          GUEST NAME
        </label>
        <div className="search-field flex min-h-16 items-center rounded-[1.1rem] px-4">
          <input
            id="new-guest"
            value={name}
            autoComplete="off"
            className="h-14 w-full bg-transparent text-base text-snow outline-none placeholder:text-mist/80"
            placeholder="Type a name"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <button
            type="submit"
            className="primary-button inline-flex min-h-14 items-center justify-center rounded-full border border-cyan/50 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#0891b2] px-8 text-sm font-semibold tracking-[0.22em] text-snow"
            disabled={saving}
          >
            {saving ? "ADDING..." : "ADD NAME"}
          </button>
        </div>
        <p className="mt-4 min-h-6 text-center text-sm text-cyan" role="status">
          {error || message}
        </p>
      </form>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2" aria-label="Guest list">
        {roster.map((guest) => (
          <li key={guest.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-snow">
            {guest.fullName}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
