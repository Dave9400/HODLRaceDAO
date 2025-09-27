import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Star, ArrowRight } from "lucide-react";

export default function RaceToEarn() {
  // Mock data - todo: remove mock functionality
  const userStats = {
    totalRaces: 47,
    wins: 12,
    topFives: 23,
    earnings: "1,247.50"
  };

  const upcomingRewards = [
    { event: "Weekly Challenge", requirement: "5 races", reward: "50 NASCORN", deadline: "2 days" },
    { event: "Top 10 Finish", requirement: "Finish top 10", reward: "25 NASCORN", deadline: "Ongoing" },
    { event: "Clean Racing", requirement: "0 incidents", reward: "15 NASCORN", deadline: "Per race" }
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Race to Earn</h1>
        <p className="text-lg text-muted-foreground">
          Earn NASCORN tokens based on your iRacing performance
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
            <div className="text-3xl font-bold text-primary mb-2">{userStats.totalRaces}</div>
            <div className="text-sm text-muted-foreground">Total Races</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-destructive mb-2">{userStats.wins}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">{userStats.topFives}</div>
            <div className="text-sm text-muted-foreground">Top 5 Finishes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary mb-2">{userStats.earnings}</div>
            <div className="text-sm text-muted-foreground">NASCORN Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Reward Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingRewards.map((reward, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                data-testid={`reward-${index}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{reward.event}</div>
                    <div className="text-sm text-muted-foreground">{reward.requirement}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-accent">{reward.reward}</div>
                  <div className="text-sm text-muted-foreground">{reward.deadline}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <Button className="w-full" size="lg" disabled data-testid="button-connect-iracing">
              <ArrowRight className="w-4 h-4 mr-2" />
              Connect iRacing Account (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Join our Discord to get notified when Race to Earn goes live and be among the first to claim rewards!
        </p>
      </div>
    </div>
  );
}