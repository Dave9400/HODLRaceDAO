import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount } from "wagmi";
import IRacingAuth from "./IRacingAuth";

interface UserProfile {
  totalRaces: number;
  totalWins: number;
  totalEarnings: string;
  skillLevel: string;
  currentStreak: number;
  bestLapTime?: string;
  favoriteTrack?: string;
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  earnedAt: string;
}

interface IRacingStats {
  iracingId: string;
  careerWins: number;
  careerTop5s: number;
  careerStarts: number;
  irating: number;
  licenseName: string;
}

export default function RaceToEarn() {
  const { address, isConnected } = useAccount();
  const [iracingStats, setIracingStats] = useState<IRacingStats | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle successful iRacing authentication
  const handleAuthSuccess = (token: string, stats: IRacingStats) => {
    setAuthToken(token);
    setIracingStats(stats);
    setIsAuthenticated(true);
  };

  // Handle authentication status changes
  const handleAuthStatusChange = (status: 'idle' | 'authenticated' | 'error') => {
    setIsAuthenticated(status === 'authenticated');
  };


  // Get or create user based on wallet address
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/wallet", address],
    queryFn: async () => {
      if (!address) return null;
      
      // Try to find existing user by wallet address
      const response = await fetch(`/api/users/wallet/${address}`);
      if (response.ok) {
        return response.json();
      }
      
      if (response.status === 404) {
        // Create new user if not found
        const createResponse = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `User_${address.slice(-6)}`,
            walletAddress: address,
            displayName: `Racing Driver ${address.slice(-6)}`
          })
        });
        
        if (createResponse.ok) {
          return createResponse.json();
        }
      }
      
      throw new Error("Failed to get or create user");
    },
    enabled: !!address && isConnected,
  });

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/racing-profiles", user?.id],
    queryFn: async (): Promise<UserProfile> => {
      if (!user?.id) throw new Error("No user ID available");
      
      const response = await fetch(`/api/racing-profiles/${user.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Create profile if it doesn't exist
          const createResponse = await fetch("/api/racing-profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id })
          });
          if (createResponse.ok) {
            return createResponse.json();
          }
        }
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
    enabled: !!user?.id
  });

  // Fetch user achievements
  const { data: achievements = [], isLoading: achievementsLoading, refetch: refetchAchievements } = useQuery({
    queryKey: ["/api/achievements/user", user?.id],
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) throw new Error("No user ID available");
      
      const response = await fetch(`/api/achievements/user/${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch achievements");
      return response.json();
    },
    enabled: !!user?.id
  });

  // Check iRacing integration status
  const { data: iRacingStatus } = useQuery({
    queryKey: ["/api/iracing/status"],
    queryFn: async () => {
      const response = await fetch("/api/iracing/status");
      if (!response.ok) throw new Error("Failed to fetch iRacing status");
      return response.json();
    }
  });

  // Show wallet connection prompt if not connected
  if (!isConnected || !address) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Race to Earn</h1>
          <p className="text-lg text-muted-foreground">
            Earn APEX tokens based on your racing performance
          </p>
        </div>

        <Card className="border-2 border-dashed border-primary">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to track your racing achievements and earn APEX tokens.
            </p>
            <Button size="lg" data-testid="button-connect-wallet-race">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Race to Earn</h1>
        <p className="text-lg text-muted-foreground">
          Earn APEX tokens based on your racing performance
        </p>
      </div>

      {/* iRacing Authentication and Rewards */}
      <div className="mb-8 space-y-6" data-testid="section-iracing-auth">
        <IRacingAuth 
          onAuthSuccess={handleAuthSuccess}
          onAuthStatusChange={handleAuthStatusChange}
        />
      </div>

      <div className="mt-8 text-center border-t pt-6">
        <p className="text-sm text-muted-foreground mb-3">
          Join the HODL Racing community
        </p>
        <Button 
          variant="outline" 
          asChild
          data-testid="button-discord"
        >
          <a 
            href="https://discord.gg/ANhcMvU488" 
            target="_blank" 
            rel="noopener noreferrer"
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Join Discord
          </a>
        </Button>
      </div>
    </div>
  );
}