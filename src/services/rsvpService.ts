import { loadRoster } from "../lib/guestRoster";
import { demoTokenFor, listDemoConfirmedIds, saveDemoAttendance } from "../lib/demoStore";
import { listSharedArrivals, saveSharedAttendance } from "../lib/partyApi";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import type { Attendance, Guest, RsvpResult } from "../types/guest";

const SAVE_ERROR = "We couldn't save your confirmation. Please try again.";

interface ConfirmPayload {
  alreadyConfirmed: boolean;
  guestId: string;
  fullName: string;
  attendance?: string;
}

function isConfirmPayload(value: unknown): value is ConfirmPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.alreadyConfirmed === "boolean" &&
    typeof row.guestId === "string" &&
    typeof row.fullName === "string"
  );
}

function attendanceFrom(value: string | undefined, fallback: Attendance): Attendance {
  if (value === "in" || value === "out") return value;
  return fallback;
}

async function guestFromDemoToken(sessionToken: string): Promise<Guest | null> {
  if (!sessionToken.startsWith("demo:")) return null;
  const guestId = sessionToken.slice("demo:".length);
  return (await loadRoster()).find((guest) => guest.id === guestId) ?? null;
}

export async function saveRsvp(sessionToken: string, attendance: Attendance): Promise<RsvpResult> {
  if (!isSupabaseConfigured()) {
    const guest = await guestFromDemoToken(sessionToken);
    if (!guest || sessionToken !== demoTokenFor(guest.id)) {
      return { ok: false, message: SAVE_ERROR };
    }
    const result = saveDemoAttendance(guest, attendance);
    await saveSharedAttendance(guest, attendance);
    return {
      ok: true,
      alreadyConfirmed: result.alreadyConfirmed,
      attendance,
      persistence: "demo",
      guest,
    };
  }

  const client = getSupabase();
  if (!client) return { ok: false, message: SAVE_ERROR };

  const { data, error } = await client.rpc("confirm_rsvp", {
    p_token: sessionToken,
    p_status: attendance === "in" ? "confirmed" : "declined",
  });
  if (error || !isConfirmPayload(data)) return { ok: false, message: SAVE_ERROR };

  return {
    ok: true,
    alreadyConfirmed: data.alreadyConfirmed,
    attendance: attendanceFrom(data.attendance, attendance),
    persistence: "database",
    guest: { id: data.guestId, fullName: data.fullName },
  };
}

export async function listArrivals(): Promise<Guest[]> {
  if (!isSupabaseConfigured()) {
    const roster = await loadRoster();
    const local = listDemoConfirmedIds().flatMap((id) => {
      const guest = roster.find((item) => item.id === id);
      return guest ? [guest] : [];
    });
    const shared = await listSharedArrivals();
    if (!shared) return local;
    const seen = new Set(shared.map((guest) => guest.id));
    return [...shared, ...local.filter((guest) => !seen.has(guest.id))];
  }

  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.rpc("list_confirmed_guests");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.full_name !== "string") return [];
    return [{ id: value.id, fullName: value.full_name }];
  });
}
