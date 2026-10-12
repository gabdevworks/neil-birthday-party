import { getStore } from "@netlify/blobs";
import { guests } from "../../src/data/guests.ts";

const ATTENDANCE_RESET = "2026-10-12-clear-again";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalize(name) {
  return name.trim().toLowerCase();
}

async function readState(store) {
  const [rsvps, extras, reset] = await Promise.all([
    store.get("rsvps", { type: "json" }),
    store.get("extras", { type: "json" }),
    store.get("attendance-reset"),
  ]);
  let records = rsvps && typeof rsvps === "object" ? rsvps : {};
  if (reset !== ATTENDANCE_RESET) {
    records = {};
    await store.setJSON("rsvps", records);
    await store.set("attendance-reset", ATTENDANCE_RESET);
  }
  return {
    rsvps: records,
    extras: cleanExtras(extras),
  };
}

function cleanExtras(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    if (typeof item.id !== "string" || typeof item.fullName !== "string") return [];
    const fullName = item.fullName.trim().replace(/\s+/g, " ");
    if (!fullName) return [];
    return [{ id: item.id, fullName }];
  });
}

function nextGuestId(roster) {
  const nextNumber =
    roster.reduce((max, guest) => {
      const value = Number(String(guest.id).slice(1));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;
  return `G${String(nextNumber).padStart(3, "0")}`;
}

function rosterOf(extras) {
  return [...guests, ...extras];
}

function findGuest(roster, fullName) {
  const needle = normalize(fullName);
  return roster.find((guest) => guest.fullName.toLowerCase() === needle) ?? null;
}

export default async (request) => {
  let store;
  try {
    store = getStore({ name: "party", consistency: "strong" });
  } catch {
    return json({ ok: false }, 503);
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (request.method === "GET" && action === "health") {
    return json({ ok: true });
  }

  try {
    if (request.method === "GET" && action === "status") {
      const state = await readState(store);
      const guest = findGuest(rosterOf(state.extras), url.searchParams.get("name") ?? "");
      if (!guest) return json({ attendance: null });
      const status = state.rsvps[guest.id]?.status;
      return json({
        attendance: status === "in" || status === "out" ? status : null,
        id: guest.id,
        fullName: guest.fullName,
      });
    }

    if (request.method === "GET" && action === "arrivals") {
      const state = await readState(store);
      const roster = rosterOf(state.extras);
      const arrivals = Object.values(state.rsvps)
        .filter((record) => record?.status === "in")
        .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)))
        .flatMap((record) => {
          const guest = roster.find((item) => item.id === record.guestId);
          return guest ? [{ id: guest.id, fullName: guest.fullName }] : [];
        });
      return json({ arrivals });
    }

    if (request.method === "GET" && action === "roster") {
      const state = await readState(store);
      return json({ extras: state.extras });
    }

    if (request.method === "POST" && action === "add-guest") {
      const body = await request.json();
      const fullName = String(body?.fullName ?? "").trim().replace(/\s+/g, " ");
      if (!fullName) return json({ ok: false, message: "Enter a name." }, 400);
      if (fullName.length > 80) return json({ ok: false, message: "That name is too long." }, 400);
      const state = await readState(store);
      const roster = rosterOf(state.extras);
      if (findGuest(roster, fullName)) {
        return json({ ok: false, message: "That name is already on the list." });
      }
      const guest = { id: nextGuestId(roster), fullName };
      await store.setJSON("extras", [...state.extras, guest]);
      return json({ ok: true, id: guest.id, fullName: guest.fullName });
    }

    if (request.method === "POST" && (action === "rsvp" || action === "sync")) {
      const body = await request.json();
      const state = await readState(store);
      const roster = rosterOf(state.extras);
      const incoming = action === "sync" ? body.records : [body];
      if (!Array.isArray(incoming)) return json({ ok: false }, 400);

      const timestamp = new Date().toISOString();
      for (const record of incoming) {
        if (!record || typeof record !== "object") continue;
        const attendance = record.attendance ?? record.status;
        if (attendance !== "in" && attendance !== "out") continue;
        const guest =
          typeof record.guestId === "string"
            ? roster.find((item) => item.id === record.guestId)
            : findGuest(roster, typeof record.fullName === "string" ? record.fullName : "");
        if (!guest) continue;
        const existing = state.rsvps[guest.id];
        if (existing?.status === attendance) continue;
        state.rsvps[guest.id] = {
          guestId: guest.id,
          status: attendance,
          updatedAt: timestamp,
        };
      }
      await store.setJSON("rsvps", state.rsvps);
      return json({ ok: true });
    }
  } catch {
    return json({ ok: false }, 503);
  }

  return json({ ok: false }, 404);
};
