import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const iracingProfiles = pgTable("iracing_profiles", {
  iracingId: varchar("iracing_id", { length: 50 }).primaryKey(),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertIRacingProfileSchema = createInsertSchema(iracingProfiles).omit({
  lastUpdated: true,
});

export type InsertIRacingProfile = z.infer<typeof insertIRacingProfileSchema>;
export type IRacingProfile = typeof iracingProfiles.$inferSelect;
