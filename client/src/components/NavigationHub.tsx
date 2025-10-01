import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Trophy, Info, Medal, ArrowRight } from "lucide-react";

interface NavigationHubProps {
  onNavigate: (page: string) => void;
}

export default function NavigationHub({ onNavigate }: NavigationHubProps) {
  const navigationItems = [
    {
      id: "trade",
      title: "Trade NASCORN",
      description: "Buy and sell NASCORN tokens on Base network",
      icon: TrendingUp,
      color: "bg-primary",
      textColor: "text-primary-foreground"
    },
    {
      id: "race",
      title: "Race to Earn",
      description: "Claim rewards based on your iRacing performance",
      icon: Trophy,
      color: "bg-destructive",
      textColor: "text-destructive-foreground"
    },
    {
      id: "about",
      title: "About DAO",
      description: "Learn about our racing roadmap and community",
      icon: Info,
      color: "bg-secondary",
      textColor: "text-secondary-foreground"
    },
    {
      id: "leaderboard",
      title: "Leaderboard",
      description: "View top drivers and racing statistics",
      icon: Medal,
      color: "bg-accent",
      textColor: "text-accent-foreground"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">HODL Racing DAO</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card 
              key={item.id} 
              className="hover-elevate transition-all cursor-pointer"
              onClick={() => onNavigate(item.id)}
              data-testid={`card-nav-${item.id}`}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${item.textColor}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Base Network Active</span>
        </div>
      </div>
    </div>
  );
}