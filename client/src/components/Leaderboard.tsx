import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, Calendar, Filter, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardEntry {
  profile: {
    totalRaces: number;
    totalWins: number;
    totalEarnings: string;
    skillLevel: string;
    bestLapTime?: string;
    favoriteTrack?: string;
  };
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export default function Leaderboard() {
  // Fetch leaderboard data from the API
  const { data: leaderboardData = [], isLoading, error } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const response = await fetch("/api/leaderboard?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });

  // Transform API data to match component expectations
  const transformLeaderboardData = (data: LeaderboardEntry[]) => {
    return data.map((entry, index) => ({
      rank: index + 1,
      name: entry.user.displayName || entry.user.username,
      avatar: entry.user.avatar || "",
      wins: entry.profile.totalWins,
      totalRaces: entry.profile.totalRaces,
      earnings: parseFloat(entry.profile.totalEarnings).toFixed(2),
      skillLevel: entry.profile.skillLevel,
      bestLapTime: entry.profile.bestLapTime,
      favoriteTrack: entry.profile.favoriteTrack,
      change: "+0" // TODO: Implement ranking change tracking
    }));
  };

  const allTimeLeaders = transformLeaderboardData(leaderboardData);
  
  // For now, show same data for monthly (could be enhanced with date filtering)
  const monthlyLeaders = allTimeLeaders.slice(0, 10);

  const LeaderboardTable = ({ data, isMonthly = false }: { data: any[], isMonthly?: boolean }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading leaderboard...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Failed to load leaderboard data</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No race data available yet</p>
          <p className="text-sm">Be the first to set a record!</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((driver, index) => (
          <Card key={index} className="hover-elevate transition-all" data-testid={`leaderboard-entry-${index}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-12 text-center">
                  {driver.rank <= 3 ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      driver.rank === 1 ? 'bg-accent text-accent-foreground' :
                      driver.rank === 2 ? 'bg-secondary text-secondary-foreground' :
                      'bg-destructive text-destructive-foreground'
                    }`}>
                      {driver.rank === 1 ? <Trophy size={16} /> :
                       driver.rank === 2 ? <Medal size={16} /> :
                       <Award size={16} />}
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">#{driver.rank}</span>
                  )}
                </div>

                {/* Driver Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback>{driver.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate" data-testid={`driver-name-${index}`}>
                      {driver.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {driver.skillLevel}
                      </Badge>
                      {driver.favoriteTrack && (
                        <span className="ml-2">{driver.favoriteTrack}</span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    driver.change.startsWith('+') ? 'text-destructive' : 'text-red-500'
                  }`}>
                    <TrendingUp size={12} />
                    <span>{driver.change}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex gap-6 text-center">
                  <div>
                    <div className="font-bold text-lg" data-testid={`wins-${index}`}>{driver.wins}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg" data-testid={`races-${index}`}>{driver.totalRaces}</div>
                    <div className="text-xs text-muted-foreground">Races</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-accent" data-testid={`earnings-${index}`}>{driver.earnings}</div>
                    <div className="text-xs text-muted-foreground">NASCORN</div>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="sm:hidden text-right">
                  <div className="font-bold text-accent">{driver.earnings}</div>
                  <div className="text-xs text-muted-foreground">{driver.wins}W/{driver.totalRaces}R</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-lg text-muted-foreground">
          Top performing drivers in the HODL Racing DAO community
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 text-accent mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1" data-testid="stat-active-racers">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : allTimeLeaders.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Racers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1" data-testid="stat-total-races">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               allTimeLeaders.reduce((sum, driver) => sum + driver.totalRaces, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Races</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-destructive mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1" data-testid="stat-nascorn-distributed">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               allTimeLeaders.reduce((sum, driver) => sum + parseFloat(driver.earnings), 0).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">NASCORN Distributed</div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Driver Rankings
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter">
              <Filter size={16} />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all-time" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all-time" className="gap-2" data-testid="tab-all-time">
                <Trophy size={16} />
                All Time
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2" data-testid="tab-monthly">
                <Calendar size={16} />
                This Month
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-time" className="mt-6">
              <LeaderboardTable data={allTimeLeaders} />
            </TabsContent>
            
            <TabsContent value="monthly" className="mt-6">
              <LeaderboardTable data={monthlyLeaders} isMonthly={true} />
              <div className="mt-4 text-center">
                <Badge variant="secondary" className="text-sm">
                  Monthly rankings reset on the 1st of each month
                </Badge>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Rankings are updated every hour based on iRacing performance data
        </p>
        <Button variant="outline" data-testid="button-view-profile">
          View Your Profile
        </Button>
      </div>
    </div>
  );
}