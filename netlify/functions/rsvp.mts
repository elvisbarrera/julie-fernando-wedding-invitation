import type { Config } from "@netlify/functions";
import { store, getAll, totals, type Rsvp } from "../lib/rsvps.mts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const clamp = (v: unknown, lo: number, hi: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async (req: Request) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  // Honeypot: bots fill the hidden field. Pretend success, save nothing.
  if (body?.website) return json({ ok: true });

  const name = clean(body?.name, 80);
  if (name.length < 2) return json({ error: "Name required" }, 400);

  const attending = body?.attending === true;
  const adults = attending ? clamp(body?.adults, 1, 10) : 0;
  const kids = attending ? clamp(body?.kids, 0, 10) : 0;
  const note = clean(body?.note, 400);

  // One reply per name: a guest who answers again replaces their earlier reply.
  const id = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
  const s = store();
  const existing = (await s.get(id, { type: "json" })) as Rsvp | null;
  const record: Rsvp = { id, name, attending, adults, kids, note, at: new Date().toISOString() };
  await s.setJSON(id, record);

  // Optional phone notification through ntfy. Never fail the guest's reply over it.
  const topic = Netlify.env.get("NTFY_TOPIC");
  if (topic) {
    try {
      const t = totals(await getAll());
      const key = Netlify.env.get("GUESTS_KEY");
      const origin = new URL(req.url).origin;
      const party = kids ? `${pl(adults, "adult", "adults")} + ${pl(kids, "child", "children")}` : pl(adults, "adult", "adults");
      const title = attending ? `💍 ${name} is coming (${party})` : `${name} can't make it`;
      const message = [
        existing ? "Updated reply." : "",
        note ? `Note: ${note}` : "",
        `Total so far: ${t.people} guests (${t.adults} adults, ${t.kids} children) · ${t.no} declined`,
      ].filter(Boolean).join("\n");
      const res = await fetch("https://ntfy.sh/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          title,
          message,
          tags: [attending ? "tada" : "wave"],
          priority: 4,
          ...(key ? { click: `${origin}/guests?key=${encodeURIComponent(key)}` } : {}),
        }),
      });
      if (!res.ok) console.error("ntfy failed", res.status, await res.text());
    } catch (err) {
      console.error("ntfy error", err);
    }
  }

  return json({ ok: true });
};

export const config: Config = { path: "/api/rsvp", method: "POST" };
