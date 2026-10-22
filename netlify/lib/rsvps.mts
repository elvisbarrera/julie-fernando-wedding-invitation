import { getStore } from "@netlify/blobs";

export type Rsvp = {
  id: string;
  name: string;
  attending: boolean;
  adults: number;
  kids: number;
  note: string;
  at: string;
};

export const store = () => getStore({ name: "wedding-rsvps", consistency: "strong" });

export async function getAll(): Promise<Rsvp[]> {
  const s = store();
  const { blobs } = await s.list();
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Rsvp | null>));
  return rows.filter((r): r is Rsvp => !!r).sort((a, b) => a.at.localeCompare(b.at));
}

export function totals(all: Rsvp[]) {
  const yes = all.filter((r) => r.attending);
  const adults = yes.reduce((n, r) => n + r.adults, 0);
  const kids = yes.reduce((n, r) => n + r.kids, 0);
  return { adults, kids, people: adults + kids, yes: yes.length, no: all.length - yes.length };
}
