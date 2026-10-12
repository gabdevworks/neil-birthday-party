import { type Guest } from "../data/guests";
import {
  clearSession,
  demoTokenFor,
  readDemoAttendance,
  readSession,
  writeSession,
} from "../lib/demoStore";
import { addGuestName, listRoster } from "../lib/guestRoster";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import type { Attendance, OpenedInvitation } from "../types/guest";
import { filterGuests, resolveExactGuest } from "../utils/guestSearch";

export class InvitationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationServiceError";
  }
}

interface GuestRow {
  id: string;
  full_name: string;
}

interface OpenPayload {
  guestId: string;
  fullName: string;
  sessionToken: string;
  confirmed: boolean;
  attendance?: string;
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

function isGuestRow(value: unknown): value is GuestRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.full_name === "string";
}

function isOpenPayload(value: unknown): value is OpenPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.guestId === "string" &&
    typeof row.fullName === "string" &&
    typeof row.sessionToken === "string" &&
    typeof row.confirmed === "boolean"
  );
}

function attendanceFromPayload(payload: OpenPayload): Attendance | null {
  if (payload.attendance === "in" || payload.attendance === "out") return payload.attendance;
  return payload.confirmed ? "in" : null;
}

function toInvitation(payload: OpenPayload, persistence: OpenedInvitation["persistence"]): OpenedInvitation {
  const attendance = attendanceFromPayload(payload);
  return {
    guest: { id: payload.guestId, fullName: payload.fullName },
    sessionToken: payload.sessionToken,
    confirmed: attendance === "in",
    attendance,
    persistence,
  };
}

export async function searchGuests(query: string): Promise<Guest[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isDemoMode()) return filterGuests(listRoster(), trimmed);

  const client = getSupabase();
  if (!client) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");

  const { data, error } = await client.rpc("search_guests", { p_query: trimmed });
  if (error) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");
  if (!Array.isArray(data)) return [];

  return data.filter(isGuestRow).map((row) => ({ id: row.id, fullName: row.full_name }));
}

export async function resolveGuest(query: string): Promise<Guest | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (isDemoMode()) return resolveExactGuest(listRoster(), trimmed);

  const matches = await searchGuests(trimmed);
  return resolveExactGuest(matches, trimmed);
}

async function openOnServer(functionName: "open_invitation" | "open_invitation_link" | "get_invitation", args: Record<string, string>): Promise<OpenedInvitation | null> {
  const client = getSupabase();
  if (!client) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");

  const { data, error } = await client.rpc(functionName, args);
  if (error) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");
  if (data == null) return null;
  if (!isOpenPayload(data)) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");

  const invitation = toInvitation(data, "database");
  writeSession({
    guestId: invitation.guest.id,
    fullName: invitation.guest.fullName,
    sessionToken: invitation.sessionToken,
    persistence: "database",
  });
  return invitation;
}

export async function readJoiningStatus(fullName: string): Promise<Attendance | null> {
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  if (isDemoMode()) {
    const guest = resolveExactGuest(listRoster(), trimmed);
    return guest ? readDemoAttendance(guest.id) : null;
  }
  const invitation = await openInvitation(trimmed);
  return invitation?.attendance ?? null;
}

export async function openInvitation(fullName: string): Promise<OpenedInvitation | null> {
  const trimmed = fullName.trim();
  if (!trimmed) return null;

  if (isDemoMode()) {
    const guest = resolveExactGuest(listRoster(), trimmed);
    if (!guest) return null;
    const attendance = readDemoAttendance(guest.id);
    const invitation: OpenedInvitation = {
      guest,
      sessionToken: demoTokenFor(guest.id),
      confirmed: attendance === "in",
      attendance,
      persistence: "demo",
    };
    writeSession({
      guestId: guest.id,
      fullName: guest.fullName,
      sessionToken: invitation.sessionToken,
      persistence: "demo",
    });
    return invitation;
  }

  return openOnServer("open_invitation", { p_name: trimmed });
}

export async function openInvitationLink(token: string): Promise<OpenedInvitation | null> {
  const trimmed = token.trim();
  if (!trimmed || isDemoMode()) return null;
  return openOnServer("open_invitation_link", { p_token: trimmed });
}

export async function restoreInvitation(): Promise<OpenedInvitation | null> {
  const session = readSession();
  if (!session) return null;

  if (session.persistence === "demo") {
    if (!isDemoMode()) {
      clearSession();
      return null;
    }
    if (session.sessionToken !== demoTokenFor(session.guestId)) {
      clearSession();
      return null;
    }
    const guest = listRoster().find((item) => item.id === session.guestId && item.fullName === session.fullName);
    if (!guest) {
      clearSession();
      return null;
    }
    const attendance = readDemoAttendance(guest.id);
    return {
      guest,
      sessionToken: session.sessionToken,
      confirmed: attendance === "in",
      attendance,
      persistence: "demo",
    };
  }

  if (isDemoMode()) {
    clearSession();
    return null;
  }

  const invitation = await openOnServer("get_invitation", { p_token: session.sessionToken });
  if (!invitation) clearSession();
  return invitation;
}

export function leaveInvitation(): void {
  clearSession();
}

export function readInviteTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("invite");
  return token?.trim() ? token.trim() : null;
}

export function removeInviteTokenFromLocation(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("invite")) return;
  url.searchParams.delete("invite");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export async function fetchGuestList(): Promise<Guest[]> {
  if (isDemoMode()) return listRoster();
  const client = getSupabase();
  if (!client) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");
  const { data, error } = await client.rpc("list_guests");
  if (error || !Array.isArray(data)) throw new InvitationServiceError("The invitation service is unavailable. Please try again.");
  return data.flatMap((row) => {
    if (!isGuestRow(row)) return [];
    return [{ id: row.id, fullName: row.full_name }];
  });
}

export async function createGuest(fullName: string): Promise<{ ok: true; guest: Guest } | { ok: false; message: string }> {
  if (isDemoMode()) return addGuestName(fullName);
  const client = getSupabase();
  if (!client) return { ok: false, message: "The invitation service is unavailable. Please try again." };
  const { data, error } = await client.rpc("add_guest", { p_name: fullName });
  if (error || !data || typeof data !== "object") {
    return { ok: false, message: "The invitation service is unavailable. Please try again." };
  }
  const value = data as Record<string, unknown>;
  if (value.ok !== true) {
    return { ok: false, message: typeof value.message === "string" ? value.message : "That name could not be added." };
  }
  if (typeof value.id !== "string" || typeof value.fullName !== "string") {
    return { ok: false, message: "The invitation service is unavailable. Please try again." };
  }
  return { ok: true, guest: { id: value.id, fullName: value.fullName } };
}
