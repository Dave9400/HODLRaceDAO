import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRacingProfileSchema, insertRaceSchema, insertAchievementSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

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

  // Race routes
  app.post("/api/races", async (req, res) => {
    try {
      const raceData = insertRaceSchema.parse(req.body);
      const race = await storage.createRace(raceData);
      
      // Update racing profile stats after race completion
      const profile = await storage.getRacingProfile(raceData.userId);
      if (profile) {
        const updates = {
          totalRaces: profile.totalRaces + 1,
          totalWins: raceData.position === 1 ? profile.totalWins + 1 : profile.totalWins,
          totalEarnings: (parseFloat(profile.totalEarnings) + parseFloat(raceData.earnings || "0")).toString(),
          currentStreak: raceData.position === 1 ? profile.currentStreak + 1 : 0,
          bestLapTime: raceData.lapTime && (!profile.bestLapTime || parseFloat(raceData.lapTime) < parseFloat(profile.bestLapTime)) 
            ? raceData.lapTime : profile.bestLapTime
        };
        await storage.updateRacingProfile(raceData.userId, updates);
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

  const httpServer = createServer(app);

  return httpServer;
}
