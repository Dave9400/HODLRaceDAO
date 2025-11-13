import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ethers } from "ethers";
import { db, schema } from "./db";
import { eq, inArray } from "drizzle-orm";

// Temporary in-memory store for OAuth state with PKCE (use Redis in production)
const oauthStates = new Map<string, { 
  walletAddress: string; 
  timestamp: number;
  codeVerifier: string;
}>();

// Clean up expired states every 15 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(oauthStates.entries());
  for (const [state, data] of entries) {
    if (now - data.timestamp > 15 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}, 15 * 60 * 1000);

// PKCE helper functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    iracingId: string;
    walletAddress: string;
    iracingToken: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Farcaster manifest endpoint
  app.get("/.well-known/farcaster.json", (req, res) => {
    res.sendFile(process.cwd() + "/client/.well-known/farcaster.json");
  });

  // Serve icon for Farcaster mini app manifest
  app.get("/icon.png", (req, res) => {
    res.sendFile(process.cwd() + "/client/public/logo.png");
  });

  // Serve preview image for Farcaster mini app
  app.get("/image.png", (req, res) => {
    res.sendFile(process.cwd() + "/client/public/image.png");
  });

  // Serve splash screen for Farcaster mini app
  app.get("/splash.png", (req, res) => {
    res.sendFile(process.cwd() + "/client/public/splash.png");
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

  // Leaderboard routes - fetch from blockchain claim events
  app.get("/api/leaderboard", async (req, res) => {
    try {
      // Use shared chain configuration
      const { getActiveChainConfig } = await import("../shared/chain");
      const chainConfig = getActiveChainConfig();
      
      const claimContractABI = [
        "event Claimed(address indexed user, uint256 iracingId, uint256 amount, uint256 claimNumber)",
        "function lastClaim(uint256 iracingId) view returns (uint256 wins, uint256 top5s, uint256 starts)",
        "function totalClaimed() view returns (uint256)"
      ];
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      const contract = new ethers.Contract(chainConfig.contracts.claim, claimContractABI, provider);
      
      // Fetch all Claimed events from contract deployment block
      const deploymentBlock = chainConfig.deploymentBlock;
      const filter = contract.filters.Claimed();
      const events = await contract.queryFilter(filter, deploymentBlock, 'latest');
      
      // Cache block timestamps to avoid duplicate RPC calls
      const blockTimestamps = new Map<number, number>();
      const getBlockTimestamp = async (blockNumber: number): Promise<number> => {
        if (blockTimestamps.has(blockNumber)) {
          return blockTimestamps.get(blockNumber)!;
        }
        const block = await provider.getBlock(blockNumber);
        const timestamp = block!.timestamp;
        blockTimestamps.set(blockNumber, timestamp);
        return timestamp;
      };
      
      // Aggregate claims by iRacing ID
      const claimsByIracingId = new Map<string, {
        iracingId: string;
        totalClaimed: bigint;
        walletAddress: string;
        lastClaimTime: number;
        claimCount: number;
        events: Array<{ amount: bigint; timestamp: number; blockNumber: number }>;
      }>();
      
      for (const event of events) {
        if (!('args' in event) || !event.args) continue;
        
        const [user, iracingId, amount, claimNumber] = event.args as unknown as [string, bigint, bigint, bigint];
        const id = iracingId.toString();
        const timestamp = await getBlockTimestamp(event.blockNumber);
        
        const existing = claimsByIracingId.get(id);
        
        // Always accumulate totalClaimed (fix for same-block claims bug)
        claimsByIracingId.set(id, {
          iracingId: id,
          totalClaimed: (existing?.totalClaimed || BigInt(0)) + amount,
          walletAddress: user,
          lastClaimTime: Math.max(existing?.lastClaimTime || 0, timestamp),
          claimCount: Math.max(existing?.claimCount || 0, Number(claimNumber)),
          events: [
            ...(existing?.events || []),
            { amount, timestamp, blockNumber: event.blockNumber }
          ]
        });
      }
      
      // Fetch stats for each iRacing ID and build leaderboard
      const leaderboard = await Promise.all(
        Array.from(claimsByIracingId.values()).map(async (claim) => {
          try {
            const [wins, top5s, starts] = await contract.lastClaim(BigInt(claim.iracingId));
            return {
              iracingId: claim.iracingId,
              walletAddress: claim.walletAddress,
              totalClaimed: claim.totalClaimed.toString(),
              claimCount: claim.claimCount,
              lastClaimTime: claim.lastClaimTime,
              wins: wins.toString(),
              top5s: top5s.toString(),
              starts: starts.toString()
            };
          } catch (error) {
            console.error(`Error fetching stats for iRacing ID ${claim.iracingId}:`, error);
            return {
              iracingId: claim.iracingId,
              walletAddress: claim.walletAddress,
              totalClaimed: claim.totalClaimed.toString(),
              claimCount: claim.claimCount,
              lastClaimTime: claim.lastClaimTime,
              wins: "0",
              top5s: "0",
              starts: "0"
            };
          }
        })
      );
      
      // Sort by total claimed (descending)
      leaderboard.sort((a, b) => BigInt(b.totalClaimed) - BigInt(a.totalClaimed) > 0 ? 1 : -1);
      
      // Fetch iRacing profiles from database
      const iracingIds = leaderboard.map(entry => entry.iracingId);
      let profilesMap = new Map<string, { firstName: string | null; lastName: string | null; displayName: string }>();
      
      if (iracingIds.length > 0) {
        try {
          const profiles = await db.select()
            .from(schema.iracingProfiles)
            .where(inArray(schema.iracingProfiles.iracingId, iracingIds));
          
          profiles.forEach(profile => {
            profilesMap.set(profile.iracingId, {
              firstName: profile.firstName,
              lastName: profile.lastName,
              displayName: profile.displayName
            });
          });
          
          console.log(`[Leaderboard] Fetched ${profiles.length} iRacing profiles from database`);
        } catch (dbError) {
          console.error('[Leaderboard] Failed to fetch iRacing profiles:', dbError);
        }
      }
      
      // Enrich leaderboard with real names from iRacing profiles
      const enrichedLeaderboard = leaderboard.map(entry => {
        const profile = profilesMap.get(entry.iracingId);
        let displayName = `Racer ${entry.iracingId}`;
        
        if (profile) {
          if (profile.firstName && profile.lastName) {
            displayName = `${profile.firstName} ${profile.lastName}`;
          } else if (profile.displayName) {
            displayName = profile.displayName;
          }
        }
        
        return {
          ...entry,
          displayName
        };
      });
      
      // Calculate weekly stats (last 7 days) using cached event data
      const now = Math.floor(Date.now() / 1000);
      const weekAgo = now - (7 * 24 * 60 * 60);
      
      const weeklyLeaderboard = enrichedLeaderboard.map(entry => {
        const claimData = claimsByIracingId.get(entry.iracingId);
        
        if (!claimData) {
          return {
            ...entry,
            weeklyEarned: "0"
          };
        }
        
        // Sum amounts from events within last 7 days (using cached timestamps)
        const weeklyTotal = claimData.events
          .filter(e => e.timestamp >= weekAgo)
          .reduce((sum, e) => sum + e.amount, BigInt(0));
        
        return {
          ...entry,
          weeklyEarned: weeklyTotal.toString()
        };
      });
      
      weeklyLeaderboard.sort((a, b) => BigInt(b.weeklyEarned) - BigInt(a.weeklyEarned) > 0 ? 1 : -1);
      
      res.json({
        allTime: enrichedLeaderboard,
        weekly: weeklyLeaderboard,
        totalClaimers: enrichedLeaderboard.length
      });
      
    } catch (error: any) {
      console.error('[Leaderboard] Error:', error.message);
      res.json({
        allTime: [],
        weekly: [],
        totalClaimers: 0,
        error: "Unable to fetch leaderboard data"
      });
    }
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
      message: "APEX transactions are tracked on Base blockchain" 
    });
  });

  // iRacing integration endpoints
  app.get("/api/iracing/status", (req, res) => {
    const hasCredentials = process.env.IRACING_CLIENT_ID && process.env.IRACING_CLIENT_SECRET;
    res.json({
      available: !!hasCredentials,
      message: hasCredentials ? "iRacing API ready" : "iRacing credentials not configured"
    });
  });

  // iRacing OAuth initialization
  app.post("/api/iracing/auth/start", (req, res) => {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    if (!process.env.IRACING_CLIENT_ID) {
      return res.status(503).json({ error: "iRacing OAuth not configured" });
    }
    
    // Generate PKCE values (required by iRacing)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Generate secure state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with wallet address and PKCE verifier
    oauthStates.set(state, {
      walletAddress,
      codeVerifier,
      timestamp: Date.now()
    });
    
    // Determine redirect URI - always use IRACING_REDIRECT_URI if set
    let redirectUri: string;
    if (process.env.IRACING_REDIRECT_URI) {
      redirectUri = process.env.IRACING_REDIRECT_URI;
    } else {
      // Fallback to dynamic detection if IRACING_REDIRECT_URI not set
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5000';
      redirectUri = `${protocol}://${host}/api/auth/callback`;
    }
    
    const authUrl = `https://oauth.iracing.com/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.IRACING_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}&` +
      `scope=iracing.auth&` +
      `audience=data-server&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256`;
    
    console.log('[iRacing OAuth] Starting auth flow with PKCE:', {
      client_id: process.env.IRACING_CLIENT_ID,
      redirect_uri: redirectUri,
      walletAddress,
      scope: 'iracing.auth',
      audience: 'data-server',
      env: process.env.NODE_ENV
    });
    
    console.log('[iRacing OAuth] Full auth URL:', authUrl);
    
    res.json({ authUrl });
  });
  
  // iRacing OAuth callback
  app.get("/api/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.error('[iRacing OAuth] Callback missing code or state:', { code: !!code, state: !!state });
      return res.redirect('/?error=missing_params');
    }
    
    try {
      // Validate state and retrieve stored data
      const stateData = oauthStates.get(state as string);
      
      if (!stateData) {
        console.error('[iRacing OAuth] Invalid or expired state');
        return res.redirect('/?error=invalid_state');
      }
      
      // Check if state is expired (15 minutes)
      if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
        oauthStates.delete(state as string);
        console.error('[iRacing OAuth] Expired state');
        return res.redirect('/?error=expired');
      }
      
      const { walletAddress, codeVerifier } = stateData;
      
      // Remove used state
      oauthStates.delete(state as string);
      
      console.log('[iRacing OAuth] Callback received:', { 
        hasCode: !!code, 
        walletAddress 
      });
      
      // Determine redirect URI - always use IRACING_REDIRECT_URI if set (must match auth request)
      let redirectUri: string;
      if (process.env.IRACING_REDIRECT_URI) {
        redirectUri = process.env.IRACING_REDIRECT_URI;
      } else {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5000';
        redirectUri = `${protocol}://${host}/api/auth/callback`;
      }
      
      // Exchange code for access token with all credentials in body (per iRacing docs)
      // Mask the client_secret using iRacing's specific algorithm
      const rawSecret = process.env.IRACING_CLIENT_SECRET!.trim();
      const clientId = process.env.IRACING_CLIENT_ID!.trim();
      const normalizedClientId = clientId.trim().toLowerCase();
      const maskedSecret = crypto.createHash('sha256')
        .update(`${rawSecret}${normalizedClientId}`)
        .digest('base64');
      
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: maskedSecret,
        code: (code as string).trim(),
        redirect_uri: redirectUri.trim(),
        code_verifier: codeVerifier
      };
      
      // Manually construct URL-encoded body to ensure proper encoding
      const formBody = Object.entries(tokenRequestBody)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      console.log('[iRacing OAuth] Exchanging code for token with client credentials in body');
      
      const tokenResponse = await axios.post('https://oauth.iracing.com/oauth2/token', formBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = tokenResponse.data;
      
      console.log('[iRacing OAuth] Access token received');
      
      // Redirect to frontend with access token
      let baseUrl = '';
      if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://hodlracing.fun';
      } else {
        // In development, redirect to the same host
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5000';
        baseUrl = `${protocol}://${host}`;
      }
      
      console.log('[iRacing OAuth] Redirecting to:', `${baseUrl}/?token=***&success=true`);
      res.redirect(`${baseUrl}/?token=${access_token}&success=true`);
      
    } catch (error: any) {
      console.error('[iRacing OAuth] Error:', {
        status: error.response?.status,
        status_reason: error.response?.statusText,
        error: error.response?.data?.error,
        error_description: error.response?.data?.error_description,
        error_uri: error.response?.data?.error_uri,
        message: error.message
      });
      const errorMsg = encodeURIComponent(error.response?.data?.error || error.message || 'Authentication failed');
      
      // Redirect to frontend with error
      let baseUrl = '';
      if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://hodlracing.fun';
      } else {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5000';
        baseUrl = `${protocol}://${host}`;
      }
      
      return res.redirect(`${baseUrl}/?error=${errorMsg}`);
    }
  });
  
  // Get user's iRacing profile and stats
  app.get("/api/iracing/profile", async (req, res) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      console.log('[iRacing Profile] Fetching member info...');
      
      // Fetch member info first
      const memberInfoResponse = await axios.get('https://members-ng.iracing.com/data/member/info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[iRacing Profile] Member info link received, fetching data...');
      
      if (!memberInfoResponse.data.link) {
        throw new Error('No member info link returned from iRacing API');
      }
      
      const memberData = await axios.get(memberInfoResponse.data.link);
      const profile = memberData.data;
      
      console.log('[iRacing Profile] Member info received for:', profile.display_name || 'Unknown');
      
      // Save user data to database for leaderboard display
      const iracingId = profile.cust_id?.toString();
      const displayName = profile.display_name || 'Unknown Driver';
      const firstName = profile.first_name || null;
      const lastName = profile.last_name || null;
      
      if (iracingId) {
        try {
          await db.insert(schema.iracingProfiles)
            .values({
              iracingId,
              displayName,
              firstName,
              lastName,
            })
            .onConflictDoUpdate({
              target: schema.iracingProfiles.iracingId,
              set: {
                displayName,
                firstName,
                lastName,
                lastUpdated: new Date(),
              },
            });
          
          console.log('[iRacing Profile] ✅ Saved iRacing profile to database:', { 
            iracingId, 
            displayName, 
            firstName, 
            lastName 
          });
        } catch (dbError) {
          console.error('[iRacing Profile] ❌ Failed to save iRacing profile (non-fatal, continuing):', dbError);
          // Don't throw - allow authentication to complete even if DB save fails
          // This ensures users can still claim tokens even if leaderboard names aren't cached
        }
      } else {
        console.warn('[iRacing Profile] ⚠️  No iRacing ID found in profile data');
      }
      
      // Now fetch yearly stats (more reliable than career stats)
      console.log('[iRacing Profile] Fetching yearly stats...');
      const yearlyStatsResponse = await axios.get('https://members-ng.iracing.com/data/stats/member_yearly', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!yearlyStatsResponse.data.link) {
        throw new Error('No yearly stats link returned from iRacing API');
      }
      
      console.log('[iRacing Profile] Yearly stats link received, fetching data...');
      const yearlyData = await axios.get(yearlyStatsResponse.data.link);
      const yearlyStats = yearlyData.data;
      
      console.log('[iRacing Profile] Yearly stats type:', typeof yearlyStats, 'isArray:', Array.isArray(yearlyStats));
      console.log('[iRacing Profile] Yearly stats preview:', JSON.stringify(yearlyStats).substring(0, 500));
      
      // Sum up stats across all categories
      let wins = 0, top5s = 0, starts = 0;
      
      if (yearlyStats.stats && Array.isArray(yearlyStats.stats)) {
        // The response is an object with a "stats" array
        // Each item in the array represents a category (Oval, Road, etc.)
        yearlyStats.stats.forEach((categoryData: any) => {
          wins += categoryData.wins || 0;
          top5s += categoryData.top5 || 0;
          starts += categoryData.starts || 0;
        });
        console.log('[iRacing Profile] Aggregated stats from', yearlyStats.stats.length, 'categories');
      } else if (Array.isArray(yearlyStats)) {
        // Fallback: if it's just an array of year data
        yearlyStats.forEach((yearData: any) => {
          if (yearData.stats) {
            wins += yearData.stats.wins || 0;
            top5s += yearData.stats.top5 || 0;
            starts += yearData.stats.starts || 0;
          }
        });
      }
      
      console.log('[iRacing Profile] Total stats calculated:', { wins, top5s, starts });
      
      // Extract relevant stats
      const careerStats = {
        iracingId: profile.cust_id?.toString() || 'unknown',
        displayName: profile.display_name || 'Unknown Driver',
        careerWins: wins,
        careerTop5s: top5s,
        careerStarts: starts,
        irating: profile.licenses?.[0]?.irating || 0,
        licenseName: profile.licenses?.[0]?.license_level_name || "Unknown"
      };
      
      res.json(careerStats);
      
    } catch (error: any) {
      console.error('[iRacing Profile] Error:', error.response?.data || error.message || error);
      res.status(error.response?.status || 500).json({ 
        error: error.response?.data?.error || "Failed to fetch profile" 
      });
    }
  });
  
  // Update user stats in smart contract (called after OAuth verification)
  app.post("/api/iracing/sync-stats", authenticateToken, async (req: any, res: any) => {
    try {
      const { iracingId } = req.user;
      
      // This endpoint will be called by the frontend after successful OAuth
      // The frontend will handle the smart contract interaction
      // This endpoint just confirms the user is authenticated
      
      res.json({ 
        success: true,
        message: "User authenticated and ready to sync stats",
        iracingId: iracingId
      });
      
    } catch (error) {
      console.error('Error syncing stats:', error);
      res.status(500).json({ error: "Failed to sync stats" });
    }
  });
  
  // Get contract stats - total claimed, halving progress, etc.
  // Paymaster proxy endpoint for gas sponsorship
  app.post("/api/paymaster", async (req, res) => {
    try {
      const paymasterUrl = process.env.CDP_PAYMASTER_URL;
      
      console.log('[Paymaster] Request received');
      console.log('[Paymaster] CDP_PAYMASTER_URL configured:', !!paymasterUrl);
      console.log('[Paymaster] Environment:', process.env.NODE_ENV);
      
      if (!paymasterUrl) {
        console.error('[Paymaster] CDP_PAYMASTER_URL not configured');
        return res.status(503).json({ 
          error: "Gas sponsorship not configured",
          message: "Please configure CDP_PAYMASTER_URL to enable gasless transactions"
        });
      }
      
      console.log('[Paymaster] Forwarding request to CDP');
      
      // Proxy the request to Coinbase Paymaster
      const response = await axios.post(paymasterUrl, req.body, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[Paymaster] CDP response received successfully');
      res.json(response.data);
    } catch (error: any) {
      console.error('[Paymaster] Error:', error.message);
      console.error('[Paymaster] Error details:', error.response?.data || error);
      res.status(500).json({ 
        error: "Paymaster request failed",
        message: error.message 
      });
    }
  });

  app.get("/api/contract/stats", async (req, res) => {
    try {
      // Use shared chain configuration
      const { getActiveChainConfig } = await import("../shared/chain");
      const chainConfig = getActiveChainConfig();
      
      // Minimal ABI for reading contract data
      const claimContractABI = [
        "function totalClaimed() view returns (uint256)",
        "function TOTAL_CLAIM_POOL() view returns (uint256)",
        "function HALVING_INTERVAL() view returns (uint256)",
        "function getCurrentMultiplier() view returns (uint256)"
      ];
      
      // Connect to active chain
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      const contract = new ethers.Contract(chainConfig.contracts.claim, claimContractABI, provider);
      
      // Read contract state
      const [totalClaimed, totalPool, halvingInterval, currentMultiplier] = await Promise.all([
        contract.totalClaimed(),
        contract.TOTAL_CLAIM_POOL(),
        contract.HALVING_INTERVAL(),
        contract.getCurrentMultiplier()
      ]);
      
      // Calculate halving progress - convert to millions for display
      const claimed = Number(ethers.formatEther(totalClaimed)) / 1_000_000;
      const pool = Number(ethers.formatEther(totalPool)) / 1_000_000;
      const interval = Number(ethers.formatEther(halvingInterval)) / 1_000_000;
      
      // Determine current halving tier (0 = first 100M, 1 = second 100M, etc.)
      const currentTier = Math.floor(claimed / interval);
      const tierStart = currentTier * interval;
      const tierEnd = (currentTier + 1) * interval;
      const progressInCurrentTier = claimed - tierStart;
      const progressPercent = (progressInCurrentTier / interval) * 100;
      
      res.json({
        totalClaimed: claimed,
        totalPool: pool,
        halvingInterval: interval,
        currentMultiplier: currentMultiplier.toString(),
        halving: {
          currentTier,
          tierStart,
          tierEnd,
          progressInCurrentTier,
          progressPercent: Math.round(progressPercent * 100) / 100,
          nextHalvingAt: tierEnd,
          remainingUntilHalving: tierEnd - claimed
        }
      });
      
    } catch (error: any) {
      console.error('[Contract Stats] Error:', error.message);
      
      // Return default values if contract read fails (e.g., RPC issues or initialization)
      res.json({
        totalClaimed: 0,
        totalPool: 50000, // Updated to 50B tokens (was 500M)
        halvingInterval: 5000, // Updated to 5B tokens per cycle (was 100M)
        currentMultiplier: "512", // Updated to match new contract (was "100")
        halving: {
          currentTier: 0,
          tierStart: 0,
          tierEnd: 5000, // Updated to match new halving interval
          progressInCurrentTier: 0,
          progressPercent: 0,
          nextHalvingAt: 5000, // Updated to match new halving interval
          remainingUntilHalving: 5000 // Updated to match new halving interval
        },
        note: "Using default values - contract data may not be available yet"
      });
    }
  });
  
  // Generate signature for claiming tokens - REQUIRES VALID IRACING AUTH TOKEN
  app.post("/api/claim/generate-signature", async (req: any, res: any) => {
    try {
      const { walletAddress } = req.body;
      const authHeader = req.headers['authorization'];
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "iRacing authentication required" });
      }
      
      if (!process.env.CLAIM_SIGNER_PRIVATE_KEY) {
        return res.status(503).json({ error: "Claim signer not configured" });
      }
      
      const token = authHeader.substring(7);
      
      // Fetch VERIFIED stats directly from iRacing API - reject client-supplied stats
      console.log('[Claim Signature] Fetching verified stats from iRacing...');
      
      const memberInfoResponse = await axios.get('https://members-ng.iracing.com/data/member/info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!memberInfoResponse.data.link) {
        throw new Error('No member info link returned from iRacing API');
      }
      
      const memberData = await axios.get(memberInfoResponse.data.link);
      const profile = memberData.data;
      const iracingId = profile.cust_id?.toString();
      
      if (!iracingId) {
        throw new Error('Failed to get iRacing ID from verified profile');
      }
      
      // Fetch verified yearly stats
      const yearlyStatsResponse = await axios.get('https://members-ng.iracing.com/data/stats/member_yearly', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!yearlyStatsResponse.data.link) {
        throw new Error('No yearly stats link returned from iRacing API');
      }
      
      const yearlyData = await axios.get(yearlyStatsResponse.data.link);
      const yearlyStats = yearlyData.data;
      
      // Calculate stats from VERIFIED data only
      let wins = 0, top5s = 0, starts = 0;
      
      if (yearlyStats.stats && Array.isArray(yearlyStats.stats)) {
        yearlyStats.stats.forEach((categoryData: any) => {
          wins += categoryData.wins || 0;
          top5s += categoryData.top5 || 0;
          starts += categoryData.starts || 0;
        });
      }
      
      console.log('[Claim Signature] Verified stats from iRacing:', {
        iracingId,
        stats: { wins, top5s, starts }
      });
      
      // EIP-712 Domain Separator (must match contract)
      // Use shared chain configuration to ensure frontend and backend match
      const { getActiveChainConfig } = await import("../shared/chain");
      const chainConfig = getActiveChainConfig();
      
      const domain = {
        name: "APEXClaim",
        version: "2",
        chainId: chainConfig.id,
        verifyingContract: chainConfig.contracts.claim
      };
      
      const types = {
        Claim: [
          { name: "user", type: "address" },
          { name: "iracingId", type: "uint256" },
          { name: "wins", type: "uint256" },
          { name: "top5s", type: "uint256" },
          { name: "starts", type: "uint256" }
        ]
      };
      
      const value = {
        user: walletAddress,
        iracingId: iracingId,
        wins: wins,
        top5s: top5s,
        starts: starts
      };
      
      // Sign using EIP-712 (prevents cross-chain/cross-contract replay)
      const wallet = new ethers.Wallet(process.env.CLAIM_SIGNER_PRIVATE_KEY);
      const signature = await wallet.signTypedData(domain, types, value);
      
      res.json({ 
        signature,
        iracingId,
        wins,
        top5s,
        starts
      });
      
    } catch (error: any) {
      console.error('[Claim Signature] Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to generate signature - ensure you have a valid iRacing authentication token" 
      });
    }
  });

  // Authentication middleware
  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'development-secret', (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}