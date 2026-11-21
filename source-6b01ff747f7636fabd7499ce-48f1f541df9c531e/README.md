# Walk of Fame · Balul Bobocilor

The event site for **Balul Bobocilor: Walk of Fame**, directed by LSAC Iași (6 December, Vivid Lounge).

- **Header:** the Walk of Fame title card fills the screen. As you scroll, it recedes and fades into the opening text.
- **The Couples:** the five couple posters in matching frames, alternating left and right.
- **Popularity vote:** five Walk-of-Fame star plaques. Visitors pick a couple and vote. Results show as live percentages, and each device can change its vote.

Colour palette: bottle green, cinema red and beige. All photos are shown exactly as supplied: no cropping, filters or re-encoding.

## Tech

- Static HTML/CSS/JS in `public/` (no build step)
- **Netlify Server** (`netlify/server/index.ts`, Hono) for `/api/poll` and `/api/vote`
- **Netlify Database** (managed Postgres) with Drizzle ORM for storing votes

## Run locally

```bash
npm install
npx netlify dev --port 8889
```

Then open http://localhost:8889.

## Editing content

- Couple titles and descriptions live in `public/index.html`, in the "The Couples" section and again in the poll plaques. Keep the two in sync.
- Photos live in `public/img/` (`header.jpeg`, `couple-1.jpeg` … `couple-5.jpeg`).
- Database schema: `db/schema.ts`. After changing it, run `npx drizzle-kit generate --name <change>`. Netlify applies migrations on deploy.
