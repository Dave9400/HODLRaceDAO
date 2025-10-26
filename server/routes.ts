import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ethers } from "ethers";

// Temporary in-memory store for OAuth state (use Redis in production)
const oauthStates = new Map<string, { 
  walletAddress: string; 
  timestamp: number;
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
    
    // Generate secure state (no PKCE for confidential server-side clients)
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with wallet address
    oauthStates.set(state, {
      walletAddress,
      timestamp: Date.now()
    });
    
    // Determine redirect URI based on environment
    let redirectUri: string;
    if (process.env.NODE_ENV === 'production' && process.env.IRACING_REDIRECT_URI) {
      redirectUri = process.env.IRACING_REDIRECT_URI;
    } else {
      // In development, use the current host from the request
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
      `audience=data-server`;
    
    console.log('[iRacing OAuth] Starting auth flow (confidential client):', {
      client_id: process.env.IRACING_CLIENT_ID,
      redirect_uri: redirectUri,
      walletAddress,
      scope: 'iracing.auth',
      audience: 'data-server',
      env: process.env.NODE_ENV
    });
    
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
      
      const { walletAddress } = stateData;
      
      // Remove used state
      oauthStates.delete(state as string);
      
      console.log('[iRacing OAuth] Callback received:', { 
        hasCode: !!code, 
        walletAddress 
      });
      
      // Determine redirect URI (must match the one used in authorization request)
      let redirectUri: string;
      if (process.env.NODE_ENV === 'production' && process.env.IRACING_REDIRECT_URI) {
        redirectUri = process.env.IRACING_REDIRECT_URI;
      } else {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:5000';
        redirectUri = `${protocol}://${host}/api/auth/callback`;
      }
      
      // Exchange code for access token (confidential client with Basic Auth)
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        code: (code as string).trim(),
        redirect_uri: redirectUri.trim(),
        audience: 'data-server'
      };
      
      // Manually construct URL-encoded body to ensure proper encoding
      const formBody = Object.entries(tokenRequestBody)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      // Create Basic Auth header with client credentials
      const clientId = process.env.IRACING_CLIENT_ID!.trim();
      const clientSecret = process.env.IRACING_CLIENT_SECRET!.trim();
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      console.log('[iRacing OAuth] Exchanging code for token with Basic Auth (confidential client)');
      
      const tokenResponse = await axios.post('https://oauth.iracing.com/oauth2/token', formBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
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
      
      console.log('[iRacing Profile] Fetching profile data');
      
      // Get user profile from iRacing using the access token
      const profileResponse = await axios.get('https://members.iracing.com/api/member/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const profile = profileResponse.data;
      
      console.log('[iRacing Profile] Profile data received:', JSON.stringify(profile, null, 2));
      
      // Extract relevant stats
      const careerStats = {
        iracingId: profile.custid?.toString() || profile.cust_id?.toString() || 'unknown',
        careerWins: profile.stats?.wins || 0,
        careerTop5s: profile.stats?.top5s || 0,
        careerStarts: profile.stats?.starts || 0,
        irating: profile.irating || 0,
        licenseName: profile.license?.name || "Unknown"
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
  
  // Generate oracle signature for racing stats (called after iRacing auth)
  app.post("/api/oracle/generate-signature", authenticateToken, async (req: any, res: any) => {
    try {
      const { iracingId, iracingToken } = req.user;
      
      if (!process.env.ORACLE_PRIVATE_KEY) {
        return res.status(503).json({ error: "Oracle not configured" });
      }
      
      // Fetch latest stats from iRacing
      const statsResponse = await axios.get(`https://members.iracing.com/membersite/member/GetCareerStats?custid=${iracingId}`, {
        headers: {
          'Authorization': `Bearer ${iracingToken}`
        }
      });
      
      const stats = statsResponse.data;
      const wins = stats.wins || 0;
      const top5s = stats.top5 || 0;
      const starts = stats.starts || 0;
      
      // Create expiry (10 minutes from now)
      const expiry = Math.floor(Date.now() / 1000) + 600;
      
      // Create oracle signature: keccak256(abi.encodePacked(racerId, wins, top5s, starts, expiry))
      const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        [iracingId, wins, top5s, starts, expiry]
      );
      
      const oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY);
      const oracleSignature = await oracleWallet.signMessage(ethers.utils.arrayify(hash));
      
      res.json({
        racerId: iracingId,
        wins,
        top5s,
        starts,
        expiry,
        oracleSignature
      });
      
    } catch (error) {
      console.error('Error generating oracle signature:', error);
      res.status(500).json({ error: "Failed to generate oracle signature" });
    }
  });
  
  // Relayer endpoint - accepts both signatures and submits claim tx (relayer pays gas)
  app.post("/api/relayer/submit-claim", async (req, res) => {
    try {
      const {
        racerId,
        wallet,
        wins,
        top5s,
        starts,
        expiry,
        oracleSignature,
        userSignature
      } = req.body;
      
      if (!process.env.RELAYER_PRIVATE_KEY || !process.env.CONTRACT_ADDRESS || !process.env.BASE_RPC_URL) {
        return res.status(503).json({ error: "Relayer not configured" });
      }
      
      // Verify expiry hasn't passed
      if (Date.now() / 1000 > expiry) {
        return res.status(400).json({ error: "Signatures expired" });
      }
      
      // Setup provider and relayer wallet
      const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
      const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
      
      // Contract ABI (minimal - just the claimOnBehalfWithWallet function)
      const contractABI = [
        "function claimOnBehalfWithWallet(uint256 racerId, address wallet, uint256 wins, uint256 top5s, uint256 starts, uint256 expiry, bytes calldata oracleSig, bytes calldata userSig) external"
      ];
      
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        relayerWallet
      );
      
      // Submit transaction (relayer pays gas)
      const tx = await contract.claimOnBehalfWithWallet(
        racerId,
        wallet,
        wins,
        top5s,
        starts,
        expiry,
        oracleSignature,
        userSignature,
        { gasLimit: 800000 }
      );
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      res.json({
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
    } catch (error: any) {
      console.error('Relayer error:', error);
      res.status(500).json({ 
        error: "Failed to submit claim",
        details: error.message
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