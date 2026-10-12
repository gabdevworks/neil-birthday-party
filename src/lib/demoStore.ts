import type { Guest } from "../data/guests";
import type { PersistenceMode } from "../types/guest";

const RSVP_KEY = "nm-demo-rsvps";
const SESSION_KEY = "nm-invitation-session";

interface DemoRsvpRecord {
  guestId: string;
  status: "in" | "out" | "confirmed";
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  guestId: string;
  fullName: string;
  sessionToken: string;
  persistence: PersistenceMode;
}

let confirmLock = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readRsvps(): Record<string, DemoRsvpRecord> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(RSVP_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, DemoRsvpRecord>;
  } catch {
    return {};
  }
}

function writeRsvps(records: Record<string, DemoRsvpRecord>): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(RSVP_KEY, JSON.stringify(records));
}

export function demoTokenFor(guestId: string): string {
  return `demo:${guestId}`;
}

export function readDemoAttendance(guestId: string): "in" | "out" | null {
  const status = readRsvps()[guestId]?.status;
  if (status === "confirmed" || status === "in") return "in";
  if (status === "out") return "out";
  return null;
}

export function listDemoConfirmedIds(): string[] {
  return Object.values(readRsvps())
    .filter((record) => record.status === "in" || record.status === "confirmed")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .map((record) => record.guestId);
}

export function saveDemoAttendance(guest: Guest, attendance: "in" | "out"): { alreadyConfirmed: boolean } {
  if (confirmLock) return { alreadyConfirmed: readDemoAttendance(guest.id) === attendance };
  confirmLock = true;
  try {
    const records = readRsvps();
    const existing = records[guest.id];
    const current = existing?.status === "out" ? "out" : existing ? "in" : null;
    if (current === attendance) return { alreadyConfirmed: true };
    const timestamp = new Date().toISOString();
    records[guest.id] = {
      guestId: guest.id,
      status: attendance,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    writeRsvps(records);
    return { alreadyConfirmed: false };
  } finally {
    confirmLock = false;
  }
}

export function readSession(): StoredSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<StoredSession>;
    if (
      typeof value.guestId !== "string" ||
      typeof value.fullName !== "string" ||
      typeof value.sessionToken !== "string" ||
      (value.persistence !== "demo" && value.persistence !== "database")
    ) {
      return null;
    }
    return {
      guestId: value.guestId,
      fullName: value.fullName,
      sessionToken: value.sessionToken,
      persistence: value.persistence,
    };
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

const ATTENDANCE_RESET = "2026-10-12-clear-all";

function resetStoredAttendanceOnce(): void {
  if (!canUseStorage()) return;
  try {
    if (window.localStorage.getItem("nm-attendance-reset") === ATTENDANCE_RESET) return;
    window.localStorage.removeItem(RSVP_KEY);
    window.localStorage.setItem("nm-attendance-reset", ATTENDANCE_RESET);
  } catch {
    return;
  }
}

resetStoredAttendanceOnce();
