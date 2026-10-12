import type { Attendance, Guest } from "../types/guest";
import { listDemoRsvpRecords } from "./demoStore";

const ENDPOINT = "/api/party";

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) return undefined;
  return response.json();
}

export async function readSharedAttendance(fullName: string): Promise<Attendance | null | undefined> {
  try {
    const response = await fetch(`${ENDPOINT}?action=status&name=${encodeURIComponent(fullName)}`);
    const data = await readJson(response);
    if (!data || typeof data !== "object") return undefined;
    const attendance = (data as { attendance?: unknown }).attendance;
    if (attendance === "in" || attendance === "out") return attendance;
    if (attendance === null) return null;
    return undefined;
  } catch {
    return undefined;
  }
}

export async function listSharedArrivals(): Promise<Guest[] | undefined> {
  try {
    const response = await fetch(`${ENDPOINT}?action=arrivals`);
    const data = await readJson(response);
    if (!data || typeof data !== "object") return undefined;
    const arrivals = (data as { arrivals?: unknown }).arrivals;
    if (!Array.isArray(arrivals)) return undefined;
    return arrivals.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const value = row as { id?: unknown; fullName?: unknown };
      if (typeof value.id !== "string" || typeof value.fullName !== "string") return [];
      return [{ id: value.id, fullName: value.fullName }];
    });
  } catch {
    return undefined;
  }
}

export async function saveSharedAttendance(
  guest: Guest,
  attendance: Attendance,
): Promise<boolean> {
  try {
    const response = await fetch(`${ENDPOINT}?action=rsvp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guestId: guest.id, fullName: guest.fullName, attendance }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listSharedExtras(): Promise<Guest[] | undefined> {
  try {
    const response = await fetch(`${ENDPOINT}?action=roster`);
    const data = await readJson(response);
    if (!data || typeof data !== "object") return undefined;
    const extras = (data as { extras?: unknown }).extras;
    if (!Array.isArray(extras)) return undefined;
    return extras.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const value = row as { id?: unknown; fullName?: unknown };
      if (typeof value.id !== "string" || typeof value.fullName !== "string") return [];
      const fullName = value.fullName.trim();
      if (!fullName) return [];
      return [{ id: value.id, fullName }];
    });
  } catch {
    return undefined;
  }
}

export async function addSharedGuest(
  fullName: string,
): Promise<{ ok: true; guest: Guest } | { ok: false; message: string } | undefined> {
  try {
    const response = await fetch(`${ENDPOINT}?action=add-guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
    if (response.status === 404 || response.status === 503) return undefined;
    const data: unknown = await response.json().catch(() => undefined);
    if (!data || typeof data !== "object") return undefined;
    const value = data as { ok?: unknown; id?: unknown; fullName?: unknown; message?: unknown };
    if (value.ok === true && typeof value.id === "string" && typeof value.fullName === "string") {
      return { ok: true, guest: { id: value.id, fullName: value.fullName } };
    }
    if (value.ok === false) {
      return {
        ok: false,
        message: typeof value.message === "string" ? value.message : "That name could not be added.",
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function publishLocalRsvps(): Promise<void> {
  const records = listDemoRsvpRecords();
  if (records.length === 0) return;
  try {
    await fetch(`${ENDPOINT}?action=sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ records }),
    });
  } catch {
    return;
  }
}
