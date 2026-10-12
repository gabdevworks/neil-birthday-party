export const EVENT_TIME_ZONE = "Asia/Manila";
export const EVENT_INSTANT_ISO = "2026-10-31T21:00:00+08:00";

export const eventDetails = {
  host: "Neil Martin",
  title: "PULL UP & DRINK",
  dateLabel: "October 31, 2026",
  monthLabel: "OCTOBER 2026",
  dayLabel: "31",
  timeLabel: "9:00 PM Onwards",
  venue: "The Beech, Panay Avenue",
  timeZone: EVENT_TIME_ZONE,
} as const;

export function getEventInstant(): Date | null {
  const instant = new Date(EVENT_INSTANT_ISO);
  if (Number.isNaN(instant.getTime())) return null;
  return instant;
}

export function mapsSearchUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

export interface CountdownParts {
  valid: boolean;
  started: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getCountdownParts(target: Date | null, nowMs: number): CountdownParts {
  if (!target || Number.isNaN(target.getTime()) || Number.isNaN(nowMs)) {
    return { valid: false, started: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diff = target.getTime() - nowMs;
  if (diff <= 0) {
    return { valid: true, started: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  return {
    valid: true,
    started: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function padTime(value: number): string {
  return value.toString().padStart(2, "0");
}
