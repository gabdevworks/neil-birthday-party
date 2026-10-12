import type { Guest } from "../data/guests";

export interface NameSegment {
  text: string;
  match: boolean;
}

export function normalizeGuestQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function filterGuests(roster: readonly Guest[], query: string): Guest[] {
  const needle = normalizeGuestQuery(query);
  if (!needle) return [];
  return roster.filter((guest) => guest.fullName.toLowerCase().includes(needle));
}

export function resolveExactGuest(roster: readonly Guest[], query: string): Guest | null {
  const needle = normalizeGuestQuery(query);
  if (!needle) return null;
  return roster.find((guest) => guest.fullName.toLowerCase() === needle) ?? null;
}

export function validateSelectedGuest(
  roster: readonly Guest[],
  guest: Guest | null,
  query: string,
): Guest | null {
  if (!guest) return null;
  const exact = resolveExactGuest(roster, query);
  if (!exact || exact.id !== guest.id || exact.fullName !== guest.fullName) return null;
  const canonical = roster.find(
    (item) => item.id === guest.id && item.fullName === guest.fullName,
  );
  return canonical ?? null;
}

export function splitMatch(name: string, query: string): NameSegment[] {
  const needle = query.trim();
  if (!needle) return [{ text: name, match: false }];
  const index = name.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return [{ text: name, match: false }];
  return [
    { text: name.slice(0, index), match: false },
    { text: name.slice(index, index + needle.length), match: true },
    { text: name.slice(index + needle.length), match: false },
  ].filter((part) => part.text.length > 0);
}
