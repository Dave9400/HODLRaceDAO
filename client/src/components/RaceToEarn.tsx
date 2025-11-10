import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Star, ArrowRight, Loader2, Plus, Calendar, Award, Wallet, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const [showAddRace, setShowAddRace] = useState(false);
  const [raceForm, setRaceForm] = useState({
    trackName: "",
    position: "",
    lapTime: ""
  });
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
      
      {/* Fallback Manual Entry for Development */}
      {!isAuthenticated && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Manual Race Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              While we're building the automated iRacing integration, you can manually add races to test the interface.
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowAddRace(true)}
              data-testid="button-add-race-manual"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Race Result Manually
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Race Entry Modal */}
      {showAddRace && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Race Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trackName">Track Name</Label>
                <Select value={raceForm.trackName} onValueChange={(value) => setRaceForm(prev => ({ ...prev, trackName: value }))}>
                  <SelectTrigger data-testid="select-track">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monaco">Monaco</SelectItem>
                    <SelectItem value="Silverstone">Silverstone</SelectItem>
                    <SelectItem value="Spa">Spa-Francorchamps</SelectItem>
                    <SelectItem value="Monza">Monza</SelectItem>
                    <SelectItem value="Suzuka">Suzuka</SelectItem>
                    <SelectItem value="Nurburgring">Nürburgring</SelectItem>
                    <SelectItem value="Laguna Seca">Laguna Seca</SelectItem>
                    <SelectItem value="Road America">Road America</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="position">Finish Position</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  max="20"
                  value={raceForm.position}
                  onChange={(e) => setRaceForm(prev => ({ ...prev, position: e.target.value }))}
                  data-testid="input-position"
                />
              </div>
              
              <div>
                <Label htmlFor="lapTime">Best Lap Time (seconds, e.g., 83.456)</Label>
                <Input
                  id="lapTime"
                  type="number"
                  step="0.001"
                  value={raceForm.lapTime}
                  onChange={(e) => setRaceForm(prev => ({ ...prev, lapTime: e.target.value }))}
                  placeholder="83.456"
                  data-testid="input-laptime"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddRace(false)}
                  data-testid="button-cancel-race"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    if (!user?.id) {
                      toast({
                        title: "Error",
                        description: "User not found. Please try reconnecting your wallet.",
                        variant: "destructive"
                      });
                      return;
                    }

                    try {
                      const response = await fetch("/api/races", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          trackName: raceForm.trackName,
                          position: parseInt(raceForm.position),
                          lapTime: raceForm.lapTime
                        })
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        toast({
                          title: "Race Added Successfully!",
                          description: result.achievements ? 
                            `Earned ${result.achievements.length} new achievement${result.achievements.length > 1 ? 's' : ''}!` :
                            `Race completed at ${raceForm.trackName}. Earned ${parseFloat(result.race.earnings).toFixed(2)} APEX!`
                        });
                        
                        // Invalidate and refetch all related queries
                        queryClient.invalidateQueries({ queryKey: ["/api/racing-profiles", user.id] });
                        queryClient.invalidateQueries({ queryKey: ["/api/achievements/user", user.id] });
                        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
                        
                        // Reset form
                        setRaceForm({ trackName: "", position: "", lapTime: "" });
                        setShowAddRace(false);
                      } else {
                        throw new Error("Failed to add race");
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to add race result",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!raceForm.trackName || !raceForm.position || !user?.id}
                  data-testid="button-submit-race"
                >
                  Add Race
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

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