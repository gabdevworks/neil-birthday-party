import { guests, type Guest } from "../data/guests";

const EXTRA_KEY = "nm-extra-guests";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readExtraGuests(): Guest[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(EXTRA_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Partial<Guest>;
      if (typeof value.id !== "string" || typeof value.fullName !== "string") return [];
      const fullName = value.fullName.trim();
      if (!fullName) return [];
      return [{ id: value.id, fullName }];
    });
  } catch {
    return [];
  }
}

export function listRoster(): Guest[] {
  return [...guests, ...readExtraGuests()];
}

export function addGuestName(fullName: string): { ok: true; guest: Guest } | { ok: false; message: string } {
  const name = fullName.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, message: "Enter a name." };
  if (name.length > 80) return { ok: false, message: "That name is too long." };
  const roster = listRoster();
  if (roster.some((guest) => guest.fullName.toLowerCase() === name.toLowerCase())) {
    return { ok: false, message: "That name is already on the list." };
  }
  const nextNumber =
    roster.reduce((max, guest) => {
      const value = Number(guest.id.slice(1));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;
  const guest = { id: `G${String(nextNumber).padStart(3, "0")}`, fullName: name };
  if (!canUseStorage()) return { ok: false, message: "This browser can't save a new name." };
  window.localStorage.setItem(EXTRA_KEY, JSON.stringify([...readExtraGuests(), guest]));
  return { ok: true, guest };
}
