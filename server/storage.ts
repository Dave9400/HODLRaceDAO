import { users, racingProfiles, races, achievements, transactions, type User, type InsertUser, type InsertRacingProfile, type RacingProfile, type InsertRace, type Race, type InsertAchievement, type Achievement, type InsertTransaction, type Transaction } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Conditional import of database connection
let db: any = null;
try {
  if (process.env.DATABASE_URL) {
    db = require("./db").db;
  }
} catch (error) {
  console.warn("Database connection unavailable, using in-memory storage");
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Racing profile methods
  getRacingProfile(userId: string): Promise<RacingProfile | undefined>;
  createRacingProfile(profile: InsertRacingProfile): Promise<RacingProfile>;
  updateRacingProfile(userId: string, updates: Partial<InsertRacingProfile>): Promise<RacingProfile | undefined>;
  
  // Race methods
  createRace(race: InsertRace): Promise<Race>;
  getUserRaces(userId: string, limit?: number): Promise<Race[]>;
  getLeaderboard(limit?: number): Promise<Array<{ profile: RacingProfile; user: User }>>;
  
  // Achievement methods
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  // Racing profile methods
  async getRacingProfile(userId: string): Promise<RacingProfile | undefined> {
    const [profile] = await db.select().from(racingProfiles).where(eq(racingProfiles.userId, userId));
    return profile || undefined;
  }
  
  async createRacingProfile(profile: InsertRacingProfile): Promise<RacingProfile> {
    const [newProfile] = await db
      .insert(racingProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }
  
  async updateRacingProfile(userId: string, updates: Partial<InsertRacingProfile>): Promise<RacingProfile | undefined> {
    const [profile] = await db
      .update(racingProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(racingProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }
  
  // Race methods
  async createRace(race: InsertRace): Promise<Race> {
    const [newRace] = await db
      .insert(races)
      .values(race)
      .returning();
    return newRace;
  }
  
  async getUserRaces(userId: string, limit: number = 10): Promise<Race[]> {
    return await db
      .select()
      .from(races)
      .where(eq(races.userId, userId))
      .orderBy(desc(races.createdAt))
      .limit(limit);
  }
  
  async getLeaderboard(limit: number = 10): Promise<Array<{ profile: RacingProfile; user: User }>> {
    const results = await db
      .select({
        profile: racingProfiles,
        user: users
      })
      .from(racingProfiles)
      .innerJoin(users, eq(racingProfiles.userId, users.id))
      .orderBy(desc(racingProfiles.totalEarnings), desc(racingProfiles.totalWins))
      .limit(limit);
    return results;
  }
  
  // Achievement methods
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }
  
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.earnedAt));
  }
  
  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }
  
  async getUserTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }
  
  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }
}

// MemStorage fallback for development without database
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private profiles: Map<string, RacingProfile> = new Map();
  private racesList: Race[] = [];
  private achievementsList: Achievement[] = [];
  private transactionsList: Transaction[] = [];

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.walletAddress === walletAddress);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      username: insertUser.username,
      email: insertUser.email || null,
      walletAddress: insertUser.walletAddress || null,
      displayName: insertUser.displayName || null,
      avatar: insertUser.avatar || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Racing profile methods
  async getRacingProfile(userId: string): Promise<RacingProfile | undefined> {
    return this.profiles.get(userId);
  }
  
  async createRacingProfile(profile: InsertRacingProfile): Promise<RacingProfile> {
    const id = randomUUID();
    const newProfile: RacingProfile = {
      id,
      userId: profile.userId,
      totalRaces: profile.totalRaces || 0,
      totalWins: profile.totalWins || 0,
      totalEarnings: profile.totalEarnings || "0",
      currentStreak: profile.currentStreak || 0,
      bestLapTime: profile.bestLapTime || null,
      favoriteTrack: profile.favoriteTrack || null,
      skillLevel: profile.skillLevel || "rookie",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.profiles.set(profile.userId, newProfile);
    return newProfile;
  }
  
  async updateRacingProfile(userId: string, updates: Partial<InsertRacingProfile>): Promise<RacingProfile | undefined> {
    const profile = this.profiles.get(userId);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...updates, updatedAt: new Date() };
    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }
  
  // Race methods
  async createRace(race: InsertRace): Promise<Race> {
    const id = randomUUID();
    const newRace: Race = { 
      id, 
      userId: race.userId,
      trackName: race.trackName,
      position: race.position,
      lapTime: race.lapTime || null,
      earnings: race.earnings || "0",
      metadata: race.metadata || null,
      createdAt: new Date() 
    };
    this.racesList.push(newRace);
    return newRace;
  }
  
  async getUserRaces(userId: string, limit: number = 10): Promise<Race[]> {
    return this.racesList
      .filter(race => race.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  async getLeaderboard(limit: number = 10): Promise<Array<{ profile: RacingProfile; user: User }>> {
    const results: Array<{ profile: RacingProfile; user: User }> = [];
    
    for (const profile of Array.from(this.profiles.values())) {
      const user = this.users.get(profile.userId);
      if (user) {
        results.push({ profile, user });
      }
    }
    
    return results
      .sort((a, b) => {
        const aEarnings = parseFloat(a.profile.totalEarnings);
        const bEarnings = parseFloat(b.profile.totalEarnings);
        return bEarnings - aEarnings || b.profile.totalWins - a.profile.totalWins;
      })
      .slice(0, limit);
  }
  
  // Achievement methods
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const newAchievement: Achievement = { 
      id, 
      userId: achievement.userId,
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon || null,
      rarity: achievement.rarity || "common",
      earnedAt: new Date() 
    };
    this.achievementsList.push(newAchievement);
    return newAchievement;
  }
  
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementsList
      .filter(achievement => achievement.userId === userId)
      .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  }
  
  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const newTransaction: Transaction = { 
      id, 
      userId: transaction.userId,
      type: transaction.type,
      fromToken: transaction.fromToken || null,
      toToken: transaction.toToken || null,
      fromAmount: transaction.fromAmount || null,
      toAmount: transaction.toAmount || null,
      txHash: transaction.txHash || null,
      status: transaction.status || "pending",
      createdAt: new Date() 
    };
    this.transactionsList.push(newTransaction);
    return newTransaction;
  }
  
  async getUserTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    return this.transactionsList
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const index = this.transactionsList.findIndex(transaction => transaction.id === id);
    if (index === -1) return undefined;
    
    this.transactionsList[index] = { ...this.transactionsList[index], ...updates };
    return this.transactionsList[index];
  }
}

// Use database storage if available, fallback to memory storage
export const storage = (db && process.env.DATABASE_URL) 
  ? new DatabaseStorage() 
  : new MemStorage();

// Log which storage type is being used
if (process.env.DATABASE_URL && db) {
  console.log("[Storage] Using PostgreSQL database storage");
} else {
  console.log("[Storage] Using in-memory storage (no DATABASE_URL found)");
}
