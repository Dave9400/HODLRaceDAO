import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ethers } from "ethers";

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
      
      // Create the message hash (must match contract's messageHash)
      // Using ethers v6 syntax: solidityPackedKeccak256
      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
        [walletAddress, iracingId, wins, top5s, starts]
      );
      
      // Sign the VERIFIED message
      const wallet = new ethers.Wallet(process.env.CLAIM_SIGNER_PRIVATE_KEY);
      // In ethers v6, signMessage accepts the hash directly (as bytes or hex string)
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      
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