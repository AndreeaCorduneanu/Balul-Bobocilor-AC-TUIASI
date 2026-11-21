# AGENTS.md

## What this is
A single-page event site for "Balul Bobocilor: Walk of Fame" (LSAC Iași). It has three parts: a scroll-driven header transition, five couple posters, and a popularity poll that stores votes in Netlify Database.

## Architecture
- `public/`: the publish directory, served statically with no build step.
  - `index.html`: all markup. Couple ids 1–5 appear as `data-couple` on both the poster rows and the poll plaques.
  - `styles.css`: all styles. Palette variables are at the top (green / red / beige, plus `--brass` for star rims).
  - `app.js`: the hero scroll transition (rAF-driven transforms on a sticky stage), reveal-on-scroll, and the poll client.
  - `img/`: user-supplied photos, **byte-identical to the originals**. The one exception is `header-warm.jpg`, a copy of `header.jpeg` that the owner asked to have edited (see below). The original `header.jpeg` stays untouched next to it.
- `netlify/server/index.ts`: a Netlify Server (Hono), scoped to `/api/*` through `export const config`.
  - `GET /api/poll` returns `{ counts: {1..5}, total, myVote }`
  - `POST /api/vote` takes `{ coupleId }` and upserts one vote per voter.
- `db/schema.ts`, `db/index.ts`: Drizzle schema and client (`drizzle-orm/netlify-db`). Migrations live in `netlify/database/migrations/`.

## Decisions and conventions
- **Don't modify the couple photos.** The owner asked that nothing be changed about them. Don't crop them (no `object-fit: cover`), filter them, or route them through the Image CDN. They are always shown at their natural aspect ratio.
- **Header card:** later, the owner asked for the header to be edited to fit the site. `header-warm.jpg` warms only the bright lettering to the site beige (`#efe3cc`) and leaves the greens unchanged (ImageMagick `-fx`, weighted by luminance). In CSS, the card's four edges are feathered with a mask that stays inside its empty margins, and the hero stage's multi-stop gradient is sampled from the card's edge column. If you change the image, re-sample its edges and update those stops. The card is still never cropped.
- **Poll layout:** the plaques form 3 on the first row and 2 centred beneath at every width (a 6-track grid in which each plaque spans 2). On phones the plaques are compact rather than reflowing.
- Voter identity is a random UUID in an httpOnly cookie (`wof_voter`), so each browser has one vote and voting again changes it. The poll is meant as a light popularity vote, not tamper-proof voting.
- No frontend framework. The page is static, so a Netlify Server handles the API (full-stack framework templates would intercept `/*`).
- Without JS or with `prefers-reduced-motion`, the hero image and text stack instead of cross-fading.
- Schema changes: edit `db/schema.ts`, then `npx drizzle-kit generate --name <change>`. Never apply migrations manually.
