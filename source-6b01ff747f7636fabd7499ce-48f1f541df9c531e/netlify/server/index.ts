import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { votes } from "../../db/schema.js";

// Couple ids 1–5 match the `data-couple` attributes in public/index.html.
const COUPLE_IDS = [1, 2, 3, 4, 5];
const VOTER_COOKIE = "wof_voter";
const ONE_YEAR = 60 * 60 * 24 * 365;

const app = new Hono();

function voterIdFrom(c: Context) {
  let id = getCookie(c, VOTER_COOKIE);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    setCookie(c, VOTER_COOKIE, id, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return id;
}

async function pollState(voterId: string) {
  const rows = await db
    .select({ coupleId: votes.coupleId, count: sql<number>`count(*)::int` })
    .from(votes)
    .groupBy(votes.coupleId);

  const counts: Record<number, number> = Object.fromEntries(COUPLE_IDS.map((id) => [id, 0]));
  for (const r of rows) if (r.coupleId in counts) counts[r.coupleId] = Number(r.count);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const [mine] = await db
    .select({ coupleId: votes.coupleId })
    .from(votes)
    .where(eq(votes.voterId, voterId))
    .limit(1);

  return { counts, total, myVote: mine?.coupleId ?? null };
}

app.get("/api/poll", async (c) => {
  const voterId = voterIdFrom(c);
  c.header("Cache-Control", "no-store");
  return c.json(await pollState(voterId));
});

app.post("/api/vote", async (c) => {
  const voterId = voterIdFrom(c);
  const body = await c.req.json().catch(() => null);
  const coupleId = Number(body?.coupleId);
  if (!COUPLE_IDS.includes(coupleId)) {
    return c.json({ error: "Pick one of the five couples." }, 400);
  }

  await db
    .insert(votes)
    .values({ voterId, coupleId })
    .onConflictDoUpdate({
      target: votes.voterId,
      set: { coupleId, updatedAt: sql`now()` },
    });

  c.header("Cache-Control", "no-store");
  return c.json(await pollState(voterId));
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "The ballot box jammed. Try again in a moment." }, 500);
});

export default app;

export const config = {
  path: "/api/*",
};
