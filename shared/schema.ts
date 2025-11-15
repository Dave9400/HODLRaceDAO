import { pgTable, text, integer, timestamp, varchar, bigint } from "drizzle-orm/pg-core";
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

// Farcaster profiles mapped to iRacing IDs
export const farcasterProfiles = pgTable("farcaster_profiles", {
  iracingId: varchar("iracing_id", { length: 50 }).primaryKey(),
  fid: bigint("fid", { mode: "number" }).notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  pfpUrl: text("pfp_url"),
  bio: text("bio"),
  followerCount: integer("follower_count"),
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
});

export const insertFarcasterProfileSchema = createInsertSchema(farcasterProfiles).omit({
  lastSyncedAt: true,
});

export type InsertFarcasterProfile = z.infer<typeof insertFarcasterProfileSchema>;
export type FarcasterProfile = typeof farcasterProfiles.$inferSelect;
