import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  walletAddress: text("wallet_address"),
  displayName: text("display_name"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const racingProfiles = pgTable("racing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalRaces: integer("total_races").default(0).notNull(),
  totalWins: integer("total_wins").default(0).notNull(),
  totalEarnings: decimal("total_earnings", { precision: 18, scale: 8 }).default("0").notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  bestLapTime: decimal("best_lap_time", { precision: 10, scale: 3 }),
  favoriteTrack: text("favorite_track"),
  skillLevel: text("skill_level").default("rookie").notNull(), // rookie, amateur, semi-pro, pro, elite
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const races = pgTable("races", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trackName: text("track_name").notNull(),
  position: integer("position").notNull(),
  lapTime: decimal("lap_time", { precision: 10, scale: 3 }),
  earnings: decimal("earnings", { precision: 18, scale: 8 }).default("0").notNull(),
  metadata: json("metadata"), // Additional race data like weather, car type, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // first_win, speed_demon, consistent_racer, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  rarity: text("rarity").default("common").notNull(), // common, rare, epic, legendary
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // swap, earn, withdraw, deposit
  fromToken: text("from_token"),
  toToken: text("to_token"),
  fromAmount: decimal("from_amount", { precision: 18, scale: 8 }),
  toAmount: decimal("to_amount", { precision: 18, scale: 8 }),
  txHash: text("tx_hash"),
  status: text("status").default("pending").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  racingProfile: one(racingProfiles, {
    fields: [users.id],
    references: [racingProfiles.userId],
  }),
  races: many(races),
  achievements: many(achievements),
  transactions: many(transactions),
}));

export const racingProfilesRelations = relations(racingProfiles, ({ one }) => ({
  user: one(users, {
    fields: [racingProfiles.userId],
    references: [users.id],
  }),
}));

export const racesRelations = relations(races, ({ one }) => ({
  user: one(users, {
    fields: [races.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  walletAddress: true,
  displayName: true,
  avatar: true,
});

export const insertRacingProfileSchema = createInsertSchema(racingProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRaceSchema = createInsertSchema(races).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  earnedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRacingProfile = z.infer<typeof insertRacingProfileSchema>;
export type RacingProfile = typeof racingProfiles.$inferSelect;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type Race = typeof races.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
