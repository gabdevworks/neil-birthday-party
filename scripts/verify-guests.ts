import { guests } from "../src/data/guests.ts";
import { filterGuests, resolveExactGuest, validateSelectedGuest } from "../src/utils/guestSearch.ts";
import { EVENT_INSTANT_ISO, getCountdownParts, getEventInstant } from "../src/utils/dateTime.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const ids = new Set(guests.map((guest) => guest.id));
assert(guests.length === 48, `Expected 48 guests, received ${guests.length}`);
assert(ids.size === 48, "Guest ids must be unique");
assert(guests.every((guest) => guest.id.startsWith("G")), "Guest ids must use the supplied identifiers");

const ja = filterGuests(guests, "ja").map((guest) => guest.fullName);
assert(
  ja.join("|") === "Jazi|Jarwin|Janrey",
  `Unexpected matches for ja: ${ja.join(", ")}`,
);

assert(resolveExactGuest(guests, "JAZI")?.fullName === "Jazi", "JAZI should resolve to Jazi");
assert(resolveExactGuest(guests, "  Gab  ")?.id === "G018", "Padded Gab should resolve to Gab");
assert(filterGuests(guests, "Don").map((guest) => guest.fullName).join("|") === "Don Johnson", "Don should suggest Don Johnson");
assert(resolveExactGuest(guests, "Don") === null, "A partial name must not resolve");
assert(resolveExactGuest(guests, "Nobody") === null, "Unknown names must not resolve");
assert(validateSelectedGuest(guests, guests[0] ?? null, "Ja") === null, "A partial selection must not validate");
assert(validateSelectedGuest(guests, resolveExactGuest(guests, "Gab"), "  gab ")?.id === "G018", "Exact Gab should validate");

const instant = getEventInstant();
assert(instant !== null, "Event instant should parse");
assert(instant?.toISOString() === "2026-10-31T13:00:00.000Z", `Unexpected instant ${instant?.toISOString()}`);
assert(EVENT_INSTANT_ISO.endsWith("+08:00"), "Event instant must use Philippine offset");

const before = getCountdownParts(instant, Date.parse("2026-10-31T12:59:59.000Z"));
assert(before.started === false && before.seconds === 1, "Countdown should remain positive before the event");
const after = getCountdownParts(instant, Date.parse("2026-10-31T13:00:01.000Z"));
assert(after.started === true && after.days === 0 && after.hours === 0 && after.minutes === 0 && after.seconds === 0, "Countdown should stop at zero");
assert(getCountdownParts(new Date("invalid"), Date.now()).valid === false, "Invalid dates should be handled");

console.log("Guest search and countdown checks passed.");
