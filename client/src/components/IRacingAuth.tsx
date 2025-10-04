import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ExternalLink, 
  Car, 
  Trophy, 
  Target, 
  Users,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useAccount } from 'wagmi';
import { useToast } from "@/hooks/use-toast";

interface IRacingStats {
  iracingId: string;
  careerWins: number;
  careerTop5s: number;
  careerStarts: number;
  irating: number;
  licenseName: string;
}

interface IRacingAuthProps {
  onAuthSuccess?: (token: string, stats: IRacingStats) => void;
  onAuthStatusChange?: (status: 'idle' | 'authenticated' | 'error') => void;
}

export default function IRacingAuth({ onAuthSuccess, onAuthStatusChange }: IRacingAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticated' | 'error'>('idle');
  const [iracingStats, setIracingStats] = useState<IRacingStats | null>(null);
  
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // Check for auth token from URL (OAuth redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (error) {
      setAuthStatus('error');
      toast({
        title: "Authentication Failed",
        description: decodeURIComponent(error) || "Failed to authenticate with iRacing. Please try again.",
        variant: "destructive",
      });
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onAuthStatusChange) {
        onAuthStatusChange('error');
      }
    } else if (token && success === 'true') {
      setAuthStatus('authenticated');
      fetchIRacingStats(token);
      
      // Notify parent of status change
      if (onAuthStatusChange) {
        onAuthStatusChange('authenticated');
      }
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const startAuthentication = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet before authenticating with iRacing.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/iracing/auth/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        throw new Error('Failed to start authentication');
      }

      const { authUrl } = await response.json();
      
      // Redirect to iRacing OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthStatus('error');
      toast({
        title: "Authentication Failed",
        description: "Unable to start iRacing authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchIRacingStats = async (token: string) => {
    try {
      const response = await fetch('/api/iracing/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const stats = await response.json();
      setIracingStats(stats);
      
      // Notify parent component of successful authentication
      if (onAuthSuccess) {
        // Use the token parameter directly instead of stale authToken state
        onAuthSuccess(token, stats);
      }
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setAuthStatus('error');
      
      // Notify parent of error status
      if (onAuthStatusChange) {
        onAuthStatusChange('error');
      }
      
      toast({
        title: "Error",
        description: "Failed to fetch iRacing statistics.",
        variant: "destructive",
      });
    }
  };

  const calculatePotentialRewards = () => {
    if (!iracingStats) return 0;
    
    // Base rates (these will be fetched from smart contract in production)
    const validAccountReward = 1_000_000;
    const winReward = 420_000;
    const top5Reward = 69_000;
    const startReward = 42_000;
    
    const totalRewards = 
      validAccountReward +
      (iracingStats.careerWins * winReward) +
      (iracingStats.careerTop5s * top5Reward) +
      (iracingStats.careerStarts * startReward);
    
    // Cap at 100 million
    return Math.min(totalRewards, 100_000_000);
  };

  if (authStatus === 'authenticated' && iracingStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              iRacing Account Connected
            </CardTitle>
            <CardDescription>
              Your iRacing account is successfully linked. View your stats and potential rewards below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Account Information</h3>
                <div className="text-sm space-y-1">
                  <div>iRacing ID: <Badge variant="outline">{iracingStats.iracingId}</Badge></div>
                  <div>License: <Badge>{iracingStats.licenseName}</Badge></div>
                  <div>iRating: <Badge variant="secondary">{iracingStats.irating}</Badge></div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Career Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>{iracingStats.careerWins} Wins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span>{iracingStats.careerTop5s} Top 5s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-green-500" />
                    <span>{iracingStats.careerStarts} Starts</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Potential NASCORN Rewards
            </CardTitle>
            <CardDescription>
              Based on your current career statistics, you could earn the following rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {calculatePotentialRewards().toLocaleString()} NASCORN
                </div>
                <div className="text-sm text-muted-foreground">
                  {calculatePotentialRewards() >= 100_000_000 && (
                    <span className="text-orange-500">(Capped at 100M per user)</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold">Account Bonus</div>
                  <div className="text-lg">1,000,000</div>
                  <div className="text-xs text-muted-foreground">One-time</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold">Win Bonus</div>
                  <div className="text-lg">{(iracingStats.careerWins * 420_000).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{iracingStats.careerWins} × 420k</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold">Top 5 Bonus</div>
                  <div className="text-lg">{(iracingStats.careerTop5s * 69_000).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{iracingStats.careerTop5s} × 69k</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold">Start Bonus</div>
                  <div className="text-lg">{(iracingStats.careerStarts * 42_000).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{iracingStats.careerStarts} × 42k</div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Rewards decrease by half every time 10% of total supply is claimed. 
                  Claim early to maximize your rewards!
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card data-testid="iracing-auth-component">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-6 h-6" />
          Connect iRacing Account
        </CardTitle>
        <CardDescription>
          Link your iRacing account to claim NASCORN tokens based on your racing performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet first before linking your iRacing account.
            </AlertDescription>
          </Alert>
        )}

        {authStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Authentication failed. Please make sure you have a valid iRacing account and try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">You'll earn NASCORN tokens for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>1,000,000 NASCORN</strong> - Valid account verification (one-time)</li>
              <li><strong>420,000 NASCORN</strong> - Per career win</li>
              <li><strong>69,000 NASCORN</strong> - Per career top 5 finish</li>
              <li><strong>42,000 NASCORN</strong> - Per race start</li>
            </ul>
            <p className="mt-2 text-xs">
              *Rewards are capped at 100 million NASCORN per user and decrease over time as more tokens are claimed.
            </p>
          </div>

          <Button 
            onClick={startAuthentication}
            disabled={!isConnected || isAuthenticating}
            className="w-full gap-2"
            data-testid="button-iracing-auth"
          >
            {isAuthenticating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {isAuthenticating ? 'Redirecting to iRacing...' : 'Connect iRacing Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}