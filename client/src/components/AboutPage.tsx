import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Calendar, 
  ExternalLink,
  CheckCircle 
} from "lucide-react";

export default function AboutPage() {
  const roadmapItems = [
    {
      phase: "Phase 1",
      title: "Foundation & Community",
      status: "completed",
      items: [
        "Launch NASCORN token on Base",
        "Build initial trading interface",
        "Establish DAO governance structure",
        "Create community Discord"
      ]
    },
    {
      phase: "Phase 2",
      title: "iRacing Integration",
      status: "in-progress",
      items: [
        "Smart contract for automated rewards",
        "iRacing API integration",
        "Performance tracking system",
        "Leaderboard functionality"
      ]
    },
    {
      phase: "Phase 3",
      title: "Exclusive Events",
      status: "planned",
      items: [
        "Monthly DAO racing tournaments",
        "Special event NFT rewards",
        "Pro driver guest appearances",
        "Exclusive track day events"
      ]
    },
    {
      phase: "Phase 4",
      title: "Real Racing",
      status: "planned",
      items: [
        "Sponsor community racing team",
        "Real-world racing events",
        "Professional driver partnerships",
        "Physical merchandise & gear"
      ]
    }
  ];


  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About HODL Racing DAO</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          We're building the future of decentralized racing, where every lap counts, 
          every victory is rewarded, and the community drives the direction.
        </p>
      </div>

      {/* Mission Statement */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="w-6 h-6" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">
            HODL Racing DAO combines the thrill of competitive sim racing with the innovation of 
            decentralized finance. We're creating a community where racers can earn real rewards 
            for their skills, participate in governance, and help shape the future of racing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">What We Believe</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Racing skill should be financially rewarded</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Community governance leads to better decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Virtual racing can bridge to real-world motorsports</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Our Vision</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span>Sponsor professional racing teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span>Host exclusive real-world racing events</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span>Build the largest decentralized racing community</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Roadmap */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="w-6 h-6" />
            Development Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {roadmapItems.map((phase, index) => (
              <div key={index} className="relative">
                {index < roadmapItems.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-border"></div>
                )}
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                      phase.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' :
                      phase.status === 'in-progress' ? 'bg-destructive border-destructive text-destructive-foreground' :
                      'bg-muted border-border text-muted-foreground'
                    }`}>
                      {phase.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <span className="font-bold">{index + 1}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{phase.title}</h3>
                      <Badge variant={
                        phase.status === 'completed' ? 'default' :
                        phase.status === 'in-progress' ? 'destructive' :
                        'secondary'
                      }>
                        {phase.status === 'completed' ? 'Completed' :
                         phase.status === 'in-progress' ? 'In Progress' :
                         'Planned'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {phase.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            phase.status === 'completed' ? 'bg-primary' :
                            phase.status === 'in-progress' ? 'bg-destructive' :
                            'bg-muted-foreground'
                          }`}></div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Community Links */}
      <Card>
        <CardHeader>
          <CardTitle>Join Our Community</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="gap-2" 
              data-testid="button-discord"
              onClick={() => window.open('https://discord.gg/ANhcMvU488', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Discord Community
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              data-testid="button-twitter"
              onClick={() => window.open('https://x.com/MotorsportsDao', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Follow on X
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              data-testid="button-farcaster"
              onClick={() => window.open('https://farcaster.xyz/~/channel/hodl-racing/join?inviteCode=uGg3DDU2O_MKPMerctfumQ', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Farcaster Channel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}