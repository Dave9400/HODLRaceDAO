import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Farcaster manifest endpoint
  app.get("/.well-known/farcaster.json", (req, res) => {
    res.sendFile(process.cwd() + "/client/.well-known/farcaster.json");
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "HODL Racing DAO API is running" });
  });

  // Placeholder endpoints for future smart contract integration
  // These will be implemented when iRacing API access and claim contracts are ready
  
  // User routes - placeholder for smart contract user management
  app.get("/api/users/:id", (req, res) => {
    res.json({ message: "User data will be retrieved from smart contract" });
  });

  app.get("/api/users/wallet/:address", (req, res) => {
    res.json({ message: "User lookup by wallet will use smart contract" });
  });

  // Racing profile routes - placeholder for on-chain racing profiles  
  app.get("/api/racing-profiles/:userId", (req, res) => {
    res.json({ message: "Racing profiles will be stored on-chain" });
  });

  // Race routes - placeholder for on-chain race history
  app.get("/api/races/user/:userId", (req, res) => {
    res.json({ races: [], message: "Race history will be retrieved from smart contract" });
  });

  // Leaderboard routes - placeholder for on-chain leaderboard
  app.get("/api/leaderboard", (req, res) => {
    res.json({ 
      leaderboard: [], 
      message: "Leaderboard will be calculated from on-chain race data" 
    });
  });

  // Achievement routes - placeholder for on-chain achievements
  app.get("/api/achievements/user/:userId", (req, res) => {
    res.json({ 
      achievements: [], 
      message: "Achievements will be tracked on-chain" 
    });
  });

  // Transaction routes - placeholder (transactions are already on-chain via Web3)
  app.get("/api/transactions/user/:userId", (req, res) => {
    res.json({ 
      transactions: [], 
      message: "NASCORN transactions are tracked on Base blockchain" 
    });
  });

  // iRacing integration endpoints - placeholder for future API integration
  app.get("/api/iracing/status", (req, res) => {
    res.json({
      available: false,
      message: "iRacing API integration pending - awaiting OAuth credentials"
    });
  });

  app.post("/api/iracing/oauth", (req, res) => {
    res.status(503).json({ 
      error: "iRacing OAuth not configured", 
      message: "Awaiting iRacing API access and OAuth setup" 
    });
  });

  app.get("/api/iracing/profile/:userId", (req, res) => {
    res.status(503).json({ 
      error: "iRacing API not available", 
      message: "Profile sync will be implemented with iRacing API access" 
    });
  });

  app.post("/api/iracing/sync/:userId", (req, res) => {
    res.status(503).json({
      error: "iRacing sync not available",
      message: "Race sync will be implemented with iRacing API and claim contract"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}