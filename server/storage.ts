import { users, racingProfiles, races, achievements, transactions, type User, type InsertUser, type InsertRacingProfile, type RacingProfile, type InsertRace, type Race, type InsertAchievement, type Achievement, type InsertTransaction, type Transaction } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Database connection variable
let db: any = null;
let dbInitialized = false;

// Initialize database connection
async function initializeDatabase() {
  if (dbInitialized) return db;
  
  try {
    if (process.env.DATABASE_URL) {
      const dbModule = await import("./db");
      db = dbModule.db;
      console.log("[Storage] PostgreSQL database connection successful");
    } else {
      console.log("[Storage] DATABASE_URL not found, using in-memory storage");
    }
  } catch (error) {
    console.warn("[Storage] Database connection failed, falling back to in-memory storage:", error instanceof Error ? error.message : String(error));
  }
  
  dbInitialized = true;
  return db;
}

// Initialize database immediately
initializeDatabase();

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Racing profile methods
  getRacingProfile(userId: string): Promise<RacingProfile | undefined>;
  createRacingProfile(profile: InsertRacingProfile): Promise<RacingProfile>;
  updateRacingProfile(userId: string, updates: Partial<InsertRacingProfile>): Promise<RacingProfile | undefined>;
  deleteRacingProfile(userId: string): Promise<boolean>;
  
  // Race methods
  createRace(race: InsertRace): Promise<Race>;
  getUserRaces(userId: string, limit?: number): Promise<Race[]>;
  getLeaderboard(limit?: number): Promise<Array<{ profile: RacingProfile; user: User }>>;
  deleteRace(id: string): Promise<boolean>;
  
  // Achievement methods
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
  deleteAchievement(id: string): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
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
  
  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
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
  
  async deleteRacingProfile(userId: string): Promise<boolean> {
    const result = await db.delete(racingProfiles).where(eq(racingProfiles.userId, userId));
    return result.rowCount > 0;
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
  
  async deleteRace(id: string): Promise<boolean> {
    const result = await db.delete(races).where(eq(races.id, id));
    return result.rowCount > 0;
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
  
  async deleteAchievement(id: string): Promise<boolean> {
    const result = await db.delete(achievements).where(eq(achievements.id, id));
    return result.rowCount > 0;
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
  
  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return result.rowCount > 0;
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
  
  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
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
  
  async deleteRacingProfile(userId: string): Promise<boolean> {
    return this.profiles.delete(userId);
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
  
  async deleteRace(id: string): Promise<boolean> {
    const index = this.racesList.findIndex(race => race.id === id);
    if (index === -1) return false;
    this.racesList.splice(index, 1);
    return true;
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
  
  async deleteAchievement(id: string): Promise<boolean> {
    const index = this.achievementsList.findIndex(achievement => achievement.id === id);
    if (index === -1) return false;
    this.achievementsList.splice(index, 1);
    return true;
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
  
  async deleteTransaction(id: string): Promise<boolean> {
    const index = this.transactionsList.findIndex(transaction => transaction.id === id);
    if (index === -1) return false;
    this.transactionsList.splice(index, 1);
    return true;
  }
}

// Create storage instance after database initialization
function createStorage(): IStorage {
  if (db && process.env.DATABASE_URL) {
    console.log("[Storage] Using PostgreSQL database storage");
    return new DatabaseStorage();
  } else {
    console.log("[Storage] Using in-memory storage");
    return new MemStorage();
  }
}

// Export storage promise to ensure initialization before use
export const storagePromise = initializeDatabase().then(() => {
  return createStorage();
}).catch(() => {
  console.log("[Storage] Using in-memory storage (fallback)");
  return new MemStorage();
});

// Synchronous storage getter that throws if not initialized
let _storage: IStorage | null = null;
storagePromise.then(s => _storage = s);

export const storage: IStorage = new Proxy({} as IStorage, {
  get(target, prop) {
    if (!_storage) {
      throw new Error("Storage not initialized. Use storagePromise to wait for initialization.");
    }
    return (_storage as any)[prop];
  }
});
