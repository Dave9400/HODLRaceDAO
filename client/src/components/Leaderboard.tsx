import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, Calendar, Filter } from "lucide-react";

export default function Leaderboard() {
  // Mock data - todo: remove mock functionality
  const allTimeLeaders = [
    {
      rank: 1,
      name: "SpeedDemon47",
      avatar: "",
      wins: 127,
      topFives: 201,
      earnings: "15,847",
      iRating: 3247,
      change: "+12"
    },
    {
      rank: 2,
      name: "RacingQueen",
      avatar: "",
      wins: 98,
      topFives: 189,
      earnings: "12,456",
      iRating: 3156,
      change: "+7"
    },
    {
      rank: 3,
      name: "TurboMax",
      avatar: "",
      wins: 89,
      topFives: 167,
      earnings: "11,203",
      iRating: 3089,
      change: "-3"
    },
    {
      rank: 4,
      name: "ApexLegend",
      avatar: "",
      wins: 76,
      topFives: 145,
      earnings: "9,876",
      iRating: 2987,
      change: "+15"
    },
    {
      rank: 5,
      name: "NitroBoost",
      avatar: "",
      wins: 71,
      topFives: 134,
      earnings: "9,234",
      iRating: 2934,
      change: "+5"
    }
  ];

  const monthlyLeaders = [
    {
      rank: 1,
      name: "TurboMax",
      avatar: "",
      wins: 12,
      topFives: 18,
      earnings: "847",
      iRating: 3089,
      change: "+45"
    },
    {
      rank: 2,
      name: "RacingQueen",
      avatar: "",
      wins: 11,
      topFives: 16,
      earnings: "756",
      iRating: 3156,
      change: "+32"
    },
    {
      rank: 3,
      name: "SpeedDemon47",
      avatar: "",
      wins: 9,
      topFives: 15,
      earnings: "689",
      iRating: 3247,
      change: "+28"
    }
  ];

  const LeaderboardTable = ({ data, isMonthly = false }: { data: any[], isMonthly?: boolean }) => (
    <div className="space-y-3">
      {data.map((driver, index) => (
        <Card key={index} className="hover-elevate transition-all">
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
                  <div className="font-semibold text-sm truncate">{driver.name}</div>
                  <div className="text-xs text-muted-foreground">iRating: {driver.iRating}</div>
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
                  <div className="font-bold text-lg">{driver.wins}</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
                <div>
                  <div className="font-bold text-lg">{driver.topFives}</div>
                  <div className="text-xs text-muted-foreground">Top 5s</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-accent">{driver.earnings}</div>
                  <div className="text-xs text-muted-foreground">NASCORN</div>
                </div>
              </div>

              {/* Mobile Stats */}
              <div className="sm:hidden text-right">
                <div className="font-bold text-accent">{driver.earnings}</div>
                <div className="text-xs text-muted-foreground">{driver.wins}W/{driver.topFives}T5</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

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
            <div className="text-2xl font-bold mb-1">2,847</div>
            <div className="text-sm text-muted-foreground">Active Racers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1">15,293</div>
            <div className="text-sm text-muted-foreground">Total Races</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-destructive mx-auto mb-3" />
            <div className="text-2xl font-bold mb-1">847K</div>
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