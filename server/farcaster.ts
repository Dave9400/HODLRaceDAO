import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.warn('[Farcaster] NEYNAR_API_KEY not set - Farcaster features will be disabled');
}

export const neynarClient = NEYNAR_API_KEY 
  ? new NeynarAPIClient(NEYNAR_API_KEY)
  : null;

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio?: string;
  followerCount?: number;
}

export async function getFarcasterUserByFid(fid: number): Promise<FarcasterUser | null> {
  if (!neynarClient) {
    console.warn('[Farcaster] Neynar client not initialized');
    return null;
  }

  try {
    const response = await neynarClient.fetchBulkUsers([fid]);
    const user = response.users[0];
    
    if (!user) {
      console.warn(`[Farcaster] No user found for FID ${fid}`);
      return null;
    }

    return {
      fid: user.fid,
      username: user.username,
      displayName: user.displayName || user.username,
      pfpUrl: user.pfp?.url || '',
      bio: user.profile?.bio?.text,
      followerCount: user.followerCount,
    };
  } catch (error) {
    console.error(`[Farcaster] Error fetching user ${fid}:`, error);
    return null;
  }
}

export async function getFarcasterUsersByFids(fids: number[]): Promise<Map<number, FarcasterUser>> {
  if (!neynarClient) {
    console.warn('[Farcaster] Neynar client not initialized');
    return new Map();
  }

  if (fids.length === 0) {
    return new Map();
  }

  try {
    // Neynar API allows batching up to 100 FIDs per request
    const BATCH_SIZE = 100;
    const results = new Map<number, FarcasterUser>();

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);
      const response = await neynarClient.fetchBulkUsers(batch);
      
      for (const user of response.users) {
        results.set(user.fid, {
          fid: user.fid,
          username: user.username,
          displayName: user.displayName || user.username,
          pfpUrl: user.pfp?.url || '',
          bio: user.profile?.bio?.text,
          followerCount: user.followerCount,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[Farcaster] Error batch fetching users:', error);
    return new Map();
  }
}
