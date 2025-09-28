import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Star, ArrowRight, Loader2, Plus, Calendar, Award, Wallet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "wagmi";

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
            Earn NASCORN tokens based on your racing performance
          </p>
        </div>

        <Card className="border-2 border-dashed border-primary">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to track your racing achievements and earn NASCORN tokens.
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
          Earn NASCORN tokens based on your racing performance
        </p>
      </div>

      {/* Coming Soon Banner */}
      <Card className="mb-8 border-2 border-dashed border-primary">
        <CardContent className="text-center p-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Smart Contract Integration Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              We're building the infrastructure to automatically reward your iRacing achievements.
              Connect your iRacing account and start earning NASCORN for every race, win, and milestone.
            </p>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              Beta Launch Q2 2024
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2" data-testid="stat-total-races">
              {profileLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : userProfile?.totalRaces || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Races</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-destructive mb-2" data-testid="stat-wins">
              {profileLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : userProfile?.totalWins || 0}
            </div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-win-rate">
              {profileLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               userProfile ? `${((userProfile.totalWins / Math.max(userProfile.totalRaces, 1)) * 100).toFixed(1)}%` : "0%"}
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary mb-2" data-testid="stat-earnings">
              {profileLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               userProfile ? parseFloat(userProfile.totalEarnings).toFixed(2) : "0.00"}
            </div>
            <div className="text-sm text-muted-foreground">NASCORN Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Your Achievements ({achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading achievements...</span>
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No achievements unlocked yet</p>
              <p className="text-sm">Complete your first race to start earning achievements!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={achievement.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`achievement-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-600' :
                      achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-600' :
                      achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {achievement.icon === 'zap' ? <Zap className="w-5 h-5" /> :
                       achievement.icon === 'flame' ? <Star className="w-5 h-5" /> :
                       achievement.icon === 'crown' ? <Trophy className="w-5 h-5" /> :
                       <Award className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {achievement.title}
                        <Badge variant={achievement.rarity === 'legendary' ? 'default' : 'secondary'} className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="flex flex-col gap-4">
              <Button 
                className="w-full" 
                size="lg" 
                disabled={!iRacingStatus?.available}
                data-testid="button-connect-iracing"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {iRacingStatus?.available ? "Connect iRacing Account" : "iRacing Integration (Coming Soon)"}
              </Button>
              
              <div className="text-center">
                <span className="text-sm text-muted-foreground">or</span>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowAddRace(true)}
                data-testid="button-add-race-manual"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Race Result Manually
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                            `Race completed at ${raceForm.trackName}. Earned ${parseFloat(result.race.earnings).toFixed(2)} NASCORN!`
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

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Join our Discord to get notified when Race to Earn goes live and be among the first to claim rewards!
        </p>
      </div>
    </div>
  );
}