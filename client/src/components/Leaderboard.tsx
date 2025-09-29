import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, Calendar, Filter, Loader2, Coins } from "lucide-react";
import { useReadContract } from "wagmi";
import { CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_ABI, formatNascornAmount } from "@/lib/contracts";
import { formatEther } from "viem";

interface ContractLeaderboardEntry {
  userAddress: string;
  iracingId: string;
  totalClaimed: bigint;
  weeklyEarned: bigint;
  lastClaimTime: bigint;
}

interface DisplayLeaderboardEntry {
  rank: number;
  name: string;
  iracingId: string;
  address: string;
  totalClaimed: string;
  weeklyEarned: string;
  lastClaimTime: Date;
}

export default function Leaderboard() {
  // Fetch all-time top claimers from smart contract
  const { data: topClaimersData, isLoading: loadingClaimers, error: claimersError } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS as `0x${string}`,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'getTopClaimers',
    query: { 
      enabled: CLAIM_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  });

  // Fetch weekly top earners from smart contract
  const { data: weeklyEarnersData, isLoading: loadingWeekly, error: weeklyError } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS as `0x${string}`,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'getTopWeeklyEarners',
    query: { 
      enabled: CLAIM_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 30000
    }
  });

  // Fetch total claimed from contract
  const { data: totalClaimedData } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS as `0x${string}`,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'totalClaimed',
    query: { enabled: CLAIM_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" }
  });

  // Transform contract data for display
  const transformContractData = (data: any[]): DisplayLeaderboardEntry[] => {
    if (!data) return [];
    
    return data.map((entry, index) => ({
      rank: index + 1,
      name: `Racer ${entry.iracingId}`, // In production, resolve to actual names
      iracingId: entry.iracingId,
      address: entry.userAddress,
      totalClaimed: formatNascornAmount(entry.totalClaimed),
      weeklyEarned: formatNascornAmount(entry.weeklyEarned),
      lastClaimTime: new Date(Number(entry.lastClaimTime) * 1000)
    }));
  };

  const allTimeLeaders = transformContractData(topClaimersData as any[]);
  const weeklyLeaders = transformContractData(weeklyEarnersData as any[]);
  
  const isLoading = loadingClaimers || loadingWeekly;
  const error = claimersError || weeklyError;

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
          <p>No claims have been made yet</p>
          <p className="text-sm">Be the first to claim NASCORN rewards!</p>
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
                    <AvatarFallback>{driver.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate" data-testid={`driver-name-${index}`}>
                      {driver.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        ID: {driver.iracingId}
                      </Badge>
                      <span className="ml-2 text-xs font-mono">
                        {driver.address.slice(0, 6)}...{driver.address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span title={driver.lastClaimTime.toLocaleString()}>
                      {driver.lastClaimTime.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex gap-6 text-center">
                  <div>
                    <div className="font-bold text-lg text-primary" data-testid={`total-claimed-${index}`}>{driver.totalClaimed}</div>
                    <div className="text-xs text-muted-foreground">Total Claimed</div>
                  </div>
                  {isMonthly && (
                    <div>
                      <div className="font-bold text-lg text-accent" data-testid={`weekly-earned-${index}`}>{driver.weeklyEarned}</div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                  )}
                </div>

                {/* Mobile Stats */}
                <div className="sm:hidden text-right">
                  <div className="font-bold text-primary">{driver.totalClaimed}</div>
                  {isMonthly && (
                    <div className="text-xs text-muted-foreground">Week: {driver.weeklyEarned}</div>
                  )}
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
            <div className="text-2xl font-bold mb-1" data-testid="stat-active-claimers">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : allTimeLeaders.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Claimers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Coins className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1" data-testid="stat-total-claimed">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               totalClaimedData ? formatNascornAmount(totalClaimedData) : "0"}
            </div>
            <div className="text-sm text-muted-foreground">Total NASCORN Claimed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-destructive mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1" data-testid="stat-weekly-earned">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 
               weeklyLeaders.reduce((sum, driver) => sum + parseFloat(driver.weeklyEarned.replace(/,/g, '')), 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Weekly Earnings</div>
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
              <TabsTrigger value="weekly" className="gap-2" data-testid="tab-weekly">
                <Calendar size={16} />
                This Week
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-time" className="mt-6">
              <LeaderboardTable data={allTimeLeaders} />
            </TabsContent>
            
            <TabsContent value="weekly" className="mt-6">
              <LeaderboardTable data={weeklyLeaders} isMonthly={true} />
              <div className="mt-4 text-center">
                <Badge variant="secondary" className="text-sm">
                  Weekly rankings reset every Sunday
                </Badge>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Rankings update automatically when users claim rewards from the smart contract
        </p>
        {CLAIM_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" && (
          <Badge variant="secondary" className="text-sm">
            Smart contract not deployed - showing placeholder data
          </Badge>
        )}
      </div>
    </div>
  );
}