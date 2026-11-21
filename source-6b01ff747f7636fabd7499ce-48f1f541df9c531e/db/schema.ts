import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// One row per voter (browser). Re-voting updates the row, so each voter counts once.
export const votes = pgTable(
  "votes",
  {
    id: serial().primaryKey(),
    voterId: text("voter_id").notNull().unique(),
    coupleId: integer("couple_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("votes_couple_id_idx").on(t.coupleId)],
);
