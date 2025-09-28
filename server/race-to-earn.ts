import { type InsertAchievement, type RacingProfile, type Race } from "@shared/schema";
import { storage } from "./storage";

// Reward calculation based on position and track difficulty
export function calculateRaceRewards(position: number, trackName: string, lapTime?: string): string {
  const baseReward = 100; // Base NASCORN reward
  
  // Position multipliers - better positions get more rewards
  const positionMultipliers: Record<number, number> = {
    1: 2.0,   // 1st place: 200% of base
    2: 1.5,   // 2nd place: 150% of base  
    3: 1.2,   // 3rd place: 120% of base
    4: 1.0,   // 4th place: 100% of base
    5: 0.8    // 5th+ place: 80% of base
  };
  
  // Track difficulty multipliers
  const trackMultipliers: Record<string, number> = {
    "Monaco": 1.5,        // Most challenging
    "Silverstone": 1.3,
    "Spa": 1.3,
    "Monza": 1.2,
    "Suzuka": 1.4,
    "Nurburgring": 1.6,   // Most challenging
    "Laguna Seca": 1.2,
    "Road America": 1.1
  };
  
  const positionMultiplier = positionMultipliers[position] || 0.5; // Default for positions > 5
  const trackMultiplier = trackMultipliers[trackName] || 1.0; // Default multiplier
  
  // Lap time bonus for sub-90 second laps (encourage fast driving)
  let timeBonus = 1.0;
  if (lapTime) {
    const lapSeconds = parseFloat(lapTime);
    if (lapSeconds < 90) {
      timeBonus = 1.1; // 10% bonus for fast laps
    }
    if (lapSeconds < 80) {
      timeBonus = 1.2; // 20% bonus for very fast laps
    }
  }
  
  const totalReward = baseReward * positionMultiplier * trackMultiplier * timeBonus;
  return totalReward.toFixed(8); // 8 decimal precision to match schema
}

// Achievement definitions and their detection logic
interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  checkCondition: (profile: RacingProfile, newRace: Race, userRaces: Race[]) => boolean;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: "first_win",
    title: "First Victory",
    description: "Win your first race",
    icon: "trophy",
    rarity: "common",
    checkCondition: (profile, newRace) => newRace.position === 1 && profile.totalWins === 1
  },
  {
    type: "speed_demon",
    title: "Speed Demon",
    description: "Complete a lap in under 80 seconds",
    icon: "zap",
    rarity: "rare",
    checkCondition: (profile, newRace) => {
      return newRace.lapTime ? parseFloat(newRace.lapTime) < 80 : false;
    }
  },
  {
    type: "consistent_racer",
    title: "Consistent Racer",
    description: "Complete 10 races",
    icon: "target",
    rarity: "common",
    checkCondition: (profile) => profile.totalRaces === 10
  },
  {
    type: "podium_master",
    title: "Podium Master",
    description: "Finish in top 3 positions 5 times",
    icon: "medal",
    rarity: "rare",
    checkCondition: (profile, newRace, userRaces) => {
      const podiumFinishes = userRaces.filter(race => race.position <= 3).length;
      return podiumFinishes === 5;
    }
  },
  {
    type: "win_streak",
    title: "Win Streak",
    description: "Win 3 races in a row",
    icon: "flame",
    rarity: "epic",
    checkCondition: (profile) => profile.currentStreak >= 3
  },
  {
    type: "monaco_master",
    title: "Monaco Master",
    description: "Win at Monaco Circuit",
    icon: "crown",
    rarity: "epic",
    checkCondition: (profile, newRace) => {
      return newRace.trackName === "Monaco" && newRace.position === 1;
    }
  },
  {
    type: "high_earner",
    title: "High Earner",
    description: "Earn 1000 NASCORN tokens",
    icon: "dollar-sign",
    rarity: "legendary",
    checkCondition: (profile) => parseFloat(profile.totalEarnings) >= 1000
  },
  {
    type: "racing_legend",
    title: "Racing Legend",
    description: "Win 25 races",
    icon: "star",
    rarity: "legendary",
    checkCondition: (profile) => profile.totalWins >= 25
  }
];

// Check for earned achievements after a race
export async function checkAndAwardAchievements(
  userId: string, 
  newRace: Race, 
  profile: RacingProfile
): Promise<InsertAchievement[]> {
  const userRaces = await storage.getUserRaces(userId, 100); // Get more races for streak/pattern analysis
  const existingAchievements = await storage.getUserAchievements(userId);
  const existingTypes = new Set(existingAchievements.map(a => a.type));
  
  const newAchievements: InsertAchievement[] = [];
  
  for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
    // Skip if user already has this achievement
    if (existingTypes.has(achievementDef.type)) continue;
    
    // Check if condition is met
    if (achievementDef.checkCondition(profile, newRace, userRaces)) {
      newAchievements.push({
        userId,
        type: achievementDef.type,
        title: achievementDef.title,
        description: achievementDef.description,
        icon: achievementDef.icon,
        rarity: achievementDef.rarity
      });
    }
  }
  
  // Create achievements in database
  const createdAchievements = [];
  for (const achievement of newAchievements) {
    const created = await storage.createAchievement(achievement);
    createdAchievements.push(created);
  }
  
  return createdAchievements;
}

// Skill level progression system
export function calculateSkillLevel(totalRaces: number, totalWins: number, totalEarnings: string): string {
  const winRate = totalRaces > 0 ? totalWins / totalRaces : 0;
  const earnings = parseFloat(totalEarnings);
  
  if (totalRaces >= 50 && winRate >= 0.6 && earnings >= 2000) {
    return "elite";
  } else if (totalRaces >= 25 && winRate >= 0.4 && earnings >= 1000) {
    return "pro";
  } else if (totalRaces >= 10 && winRate >= 0.3 && earnings >= 300) {
    return "semi-pro";
  } else if (totalRaces >= 5 && winRate >= 0.2) {
    return "amateur";
  } else {
    return "rookie";
  }
}

// iRacing API placeholder - ready for future OAuth integration
export interface iRacingProfile {
  customerId: number;
  displayName: string;
  clubId: number;
  clubName: string;
  helmets: any[];
  suits: any[];
  cars: any[];
  tracks: any[];
}

export interface iRacingRaceResult {
  sessionId: number;
  trackId: number;
  trackName: string;
  finishPosition: number;
  lapTime: number;
  sessionDate: string;
}

// Placeholder functions for iRacing integration
export class iRacingAPI {
  private static clientId: string | undefined = process.env.IRACING_CLIENT_ID;
  private static clientSecret: string | undefined = process.env.IRACING_CLIENT_SECRET;
  
  static async authenticateUser(authCode: string): Promise<string | null> {
    // TODO: Implement OAuth flow when credentials are available
    if (!this.clientId || !this.clientSecret) {
      console.log("[iRacing] OAuth credentials not configured - using manual race entry");
      return null;
    }
    
    // Placeholder for iRacing OAuth
    return "mock_access_token";
  }
  
  static async getUserProfile(accessToken: string): Promise<iRacingProfile | null> {
    // TODO: Implement when iRacing API credentials are available
    console.log("[iRacing] Profile fetch placeholder - token:", accessToken.substring(0, 10) + "...");
    return null;
  }
  
  static async getRecentRaces(accessToken: string, limit: number = 10): Promise<iRacingRaceResult[]> {
    // TODO: Implement when iRacing API credentials are available
    console.log("[iRacing] Recent races fetch placeholder - limit:", limit);
    return [];
  }
  
  static async syncRaceResults(userId: string, accessToken: string): Promise<Race[]> {
    // TODO: Implement automatic race sync from iRacing when API is available
    console.log("[iRacing] Race sync placeholder for user:", userId);
    return [];
  }
}

// Export helper for checking if iRacing integration is available
export function isiRacingAvailable(): boolean {
  return !!(process.env.IRACING_CLIENT_ID && process.env.IRACING_CLIENT_SECRET);
}