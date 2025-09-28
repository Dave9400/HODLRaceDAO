import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRacingProfileSchema, insertRaceSchema, insertAchievementSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { calculateRaceRewards, checkAndAwardAchievements, calculateSkillLevel, isiRacingAvailable, iRacingAPI } from "./race-to-earn";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/wallet/:address", async (req, res) => {
    try {
      const user = await storage.getUserByWallet(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Racing profile routes
  app.get("/api/racing-profiles/:userId", async (req, res) => {
    try {
      const profile = await storage.getRacingProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ error: "Racing profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch racing profile" });
    }
  });

  app.post("/api/racing-profiles", async (req, res) => {
    try {
      const profileData = insertRacingProfileSchema.parse(req.body);
      const profile = await storage.createRacingProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid profile data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create racing profile" });
    }
  });

  app.patch("/api/racing-profiles/:userId", async (req, res) => {
    try {
      const updates = insertRacingProfileSchema.partial().parse(req.body);
      const profile = await storage.updateRacingProfile(req.params.userId, updates);
      if (!profile) {
        return res.status(404).json({ error: "Racing profile not found" });
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update racing profile" });
    }
  });

  app.delete("/api/racing-profiles/:userId", async (req, res) => {
    try {
      const deleted = await storage.deleteRacingProfile(req.params.userId);
      if (!deleted) {
        return res.status(404).json({ error: "Racing profile not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete racing profile" });
    }
  });

  // Race routes
  app.post("/api/races", async (req, res) => {
    try {
      const raceData = insertRaceSchema.parse(req.body);
      
      // Calculate race earnings based on performance
      const calculatedEarnings = calculateRaceRewards(raceData.position, raceData.trackName, raceData.lapTime);
      
      // Create race with calculated earnings (override any provided earnings)
      const raceWithEarnings = { ...raceData, earnings: calculatedEarnings };
      const race = await storage.createRace(raceWithEarnings);
      
      // Update racing profile stats after race completion
      const profile = await storage.getRacingProfile(raceData.userId);
      if (profile) {
        // Use precise BigInt arithmetic for earnings to avoid floating point errors
        const PRECISION = 8;
        const SCALE = BigInt(10 ** PRECISION);
        
        // Helper function to convert decimal string to BigInt (8 decimal places)
        const decimalToBigInt = (decimalStr: string): bigint => {
          const [integerPart, fractionalPart = ""] = decimalStr.split(".");
          const paddedFractional = fractionalPart.padEnd(PRECISION, "0").slice(0, PRECISION);
          return BigInt(integerPart) * SCALE + BigInt(paddedFractional);
        };
        
        // Helper function to convert BigInt back to decimal string
        const bigIntToDecimal = (value: bigint): string => {
          const integerPart = value / SCALE;
          const fractionalPart = value % SCALE;
          return `${integerPart}.${fractionalPart.toString().padStart(PRECISION, "0")}`;
        };
        
        const currentEarnings = decimalToBigInt(profile.totalEarnings);
        const newEarnings = decimalToBigInt(calculatedEarnings);
        const totalEarnings = currentEarnings + newEarnings;
        const totalEarningsDecimal = bigIntToDecimal(totalEarnings);
        
        const updates = {
          totalRaces: profile.totalRaces + 1,
          totalWins: raceData.position === 1 ? profile.totalWins + 1 : profile.totalWins,
          totalEarnings: totalEarningsDecimal,
          currentStreak: raceData.position === 1 ? profile.currentStreak + 1 : 0,
          bestLapTime: raceData.lapTime && (!profile.bestLapTime || parseFloat(raceData.lapTime) < parseFloat(profile.bestLapTime)) 
            ? raceData.lapTime : profile.bestLapTime,
          favoriteTrack: raceData.trackName
        };
        
        // Update skill level based on performance
        const newSkillLevel = calculateSkillLevel(
          updates.totalRaces, 
          updates.totalWins, 
          updates.totalEarnings
        );
        updates.skillLevel = newSkillLevel;
        
        const updatedProfile = await storage.updateRacingProfile(raceData.userId, updates);
        
        // Check for achievements after profile update
        if (updatedProfile) {
          const newAchievements = await checkAndAwardAchievements(raceData.userId, race, updatedProfile);
          
          // Include achievements in response if any were earned
          if (newAchievements.length > 0) {
            return res.status(201).json({
              race,
              achievements: newAchievements
            });
          }
        }
      }
      
      res.status(201).json(race);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid race data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create race" });
    }
  });

  app.get("/api/races/user/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const races = await storage.getUserRaces(req.params.userId, limit);
      res.json(races);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user races" });
    }
  });

  app.delete("/api/races/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRace(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Race not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete race" });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Achievement routes
  app.get("/api/achievements/user/:userId", async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.params.userId);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const achievementData = insertAchievementSchema.parse(req.body);
      const achievement = await storage.createAchievement(achievementData);
      res.status(201).json(achievement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid achievement data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create achievement" });
    }
  });

  app.delete("/api/achievements/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAchievement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Achievement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete achievement" });
    }
  });

  // Transaction routes
  app.get("/api/transactions/user/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const transactions = await storage.getUserTransactions(req.params.userId, limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const updates = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(req.params.id, updates);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // iRacing integration endpoints (placeholders for future OAuth integration)
  app.get("/api/iracing/status", (req, res) => {
    res.json({
      available: isiRacingAvailable(),
      message: isiRacingAvailable() 
        ? "iRacing integration is available" 
        : "iRacing OAuth credentials not configured - using manual race entry"
    });
  });

  app.post("/api/iracing/oauth", async (req, res) => {
    try {
      const { authCode } = req.body;
      
      if (!authCode) {
        return res.status(400).json({ error: "Authorization code required" });
      }
      
      const accessToken = await iRacingAPI.authenticateUser(authCode);
      
      if (!accessToken) {
        return res.status(503).json({ 
          error: "iRacing OAuth not available", 
          message: "OAuth credentials not configured" 
        });
      }
      
      res.json({ accessToken });
    } catch (error) {
      res.status(500).json({ error: "iRacing authentication failed" });
    }
  });

  app.get("/api/iracing/profile/:userId", async (req, res) => {
    try {
      const { accessToken } = req.headers;
      
      if (!accessToken || typeof accessToken !== "string") {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await iRacingAPI.getUserProfile(accessToken);
      
      if (!profile) {
        return res.status(503).json({ 
          error: "iRacing API not available", 
          message: "Profile fetch not implemented - OAuth credentials required" 
        });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch iRacing profile" });
    }
  });

  app.post("/api/iracing/sync/:userId", async (req, res) => {
    try {
      const { accessToken } = req.headers;
      
      if (!accessToken || typeof accessToken !== "string") {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const syncedRaces = await iRacingAPI.syncRaceResults(req.params.userId, accessToken);
      
      res.json({
        message: "Race sync placeholder - will sync with iRacing when OAuth is configured",
        syncedRaces: syncedRaces.length,
        races: syncedRaces
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync races from iRacing" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
