import type { Guest } from "../data/guests";

export type { Guest };

export type PersistenceMode = "demo" | "database";
export type Attendance = "in" | "out";

export interface OpenedInvitation {
  guest: Guest;
  sessionToken: string;
  confirmed: boolean;
  attendance: Attendance | null;
  persistence: PersistenceMode;
}

export interface RsvpConfirmation {
  ok: true;
  alreadyConfirmed: boolean;
  attendance: Attendance;
  persistence: PersistenceMode;
  guest: Guest;
}

export interface RsvpFailure {
  ok: false;
  message: string;
}

export type RsvpResult = RsvpConfirmation | RsvpFailure;
