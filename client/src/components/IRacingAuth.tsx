import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  ExternalLink, 
  Car, 
  Trophy, 
  Target, 
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Coins,
  TrendingUp,
  Wallet
} from "lucide-react";
import { useAccount } from 'wagmi';
import { useToast } from "@/hooks/use-toast";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_ABI, NASCORN_TOKEN_ADDRESS, NASCORN_TOKEN_ABI } from '@/lib/contracts';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface IRacingStats {
  iracingId: string;
  displayName: string;
  careerWins: number;
  careerTop5s: number;
  careerStarts: number;
  irating: number;
  licenseName: string;
}

interface ContractStats {
  totalClaimed: number;
  totalPool: number;
  halvingInterval: number;
  currentMultiplier: string;
  halving: {
    currentTier: number;
    tierStart: number;
    tierEnd: number;
    progressInCurrentTier: number;
    progressPercent: number;
    nextHalvingAt: number;
    remainingUntilHalving: number;
  };
}

interface IRacingAuthProps {
  onAuthSuccess?: (token: string, stats: IRacingStats) => void;
  onAuthStatusChange?: (status: 'idle' | 'authenticated' | 'error') => void;
}


export default function IRacingAuth({ onAuthSuccess, onAuthStatusChange }: IRacingAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticated' | 'error'>('idle');
  const [iracingStats, setIracingStats] = useState<IRacingStats | null>(null);
  const [searchParams, setSearchParams] = useState(window.location.search);
  const [isClaiming, setIsClaiming] = useState(false);
  const [iracingAuthToken, setIracingAuthToken] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const { writeContract, data: claimTxHash, isPending: isClaimPending } = useWriteContract();
  
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });
  
  const { data: hasClaimedData, refetch: refetchHasClaimed } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'hasClaimed',
    args: iracingStats ? [BigInt(iracingStats.iracingId)] : undefined,
  }) as { data: boolean | undefined; refetch: () => void };
  
  const { data: claimableAmount, refetch: refetchClaimableAmount } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'getClaimableAmountForId',
    args: iracingStats ? [
      BigInt(iracingStats.iracingId),
      BigInt(iracingStats.careerWins),
      BigInt(iracingStats.careerTop5s),
      BigInt(iracingStats.careerStarts)
    ] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };
  
  const { data: userClaimCount, refetch: refetchUserClaimCount } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'claimCount',
    args: address ? [address] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };
  
  const { data: lastClaimData, refetch: refetchLastClaim } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'lastClaim',
    args: iracingStats ? [BigInt(iracingStats.iracingId)] : undefined,
  }) as { data: readonly [bigint, bigint, bigint] | undefined; refetch: () => void };
  
  const { data: nascornBalance, refetch: refetchNascornBalance } = useReadContract({
    address: NASCORN_TOKEN_ADDRESS,
    abi: NASCORN_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };
  
  const { data: contractStats, refetch: refetchContractStats } = useQuery<ContractStats>({
    queryKey: ['/api/contract/stats'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update search params when URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      setSearchParams(window.location.search);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Check for auth token from URL (OAuth redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    console.log('[IRacingAuth] Checking URL params:', { 
      hasToken: !!token, 
      success, 
      error,
      fullSearch: searchParams 
    });
    
    if (error) {
      console.error('[IRacingAuth] OAuth error:', error);
      setAuthStatus('error');
      toast({
        title: "Authentication Failed",
        description: decodeURIComponent(error) || "Failed to authenticate with iRacing. Please try again.",
        variant: "destructive",
      });
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setSearchParams('');
      
      if (onAuthStatusChange) {
        onAuthStatusChange('error');
      }
    } else if (token && success === 'true') {
      console.log('[IRacingAuth] OAuth success, fetching stats...');
      setAuthStatus('authenticated');
      setIracingAuthToken(token);
      fetchIRacingStats(token);
      
      // Notify parent of status change
      if (onAuthStatusChange) {
        onAuthStatusChange('authenticated');
      }
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setSearchParams('');
    }
  }, [searchParams]);

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

  const handleClaim = async () => {
    if (!iracingStats || !address || !CLAIM_CONTRACT_ADDRESS || !iracingAuthToken) {
      toast({
        title: "Error",
        description: "Missing required information for claim. Please re-authenticate with iRacing.",
        variant: "destructive",
      });
      return;
    }
    
    setIsClaiming(true);
    
    try {
      const response = await fetch('/api/claim/generate-signature', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${iracingAuthToken}`
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate signature');
      }
      
      const { signature, iracingId, wins, top5s, starts } = await response.json();
      
      writeContract({
        address: CLAIM_CONTRACT_ADDRESS,
        abi: CLAIM_CONTRACT_ABI,
        functionName: 'claim',
        args: [
          BigInt(iracingId),
          BigInt(wins),
          BigInt(top5s),
          BigInt(starts),
          signature as `0x${string}`,
        ],
      });
      
    } catch (error: any) {
      console.error('Claim error:', error);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to submit claim transaction",
        variant: "destructive",
      });
      setIsClaiming(false);
    }
  };
  
  useEffect(() => {
    if (isTxSuccess) {
      toast({
        title: "Claim Successful! 🎉",
        description: "NASCORN tokens have been sent to your wallet",
      });
      setIsClaiming(false);
      
      // Wait a moment for blockchain state to update, then refetch all data
      setTimeout(() => {
        refetchContractStats();
        refetchHasClaimed();
        refetchClaimableAmount();
        refetchUserClaimCount();
        refetchLastClaim();
        refetchNascornBalance();
        queryClient.invalidateQueries({ queryKey: ['/api/contract/stats'] });
      }, 2000); // 2 second delay
    }
  }, [isTxSuccess]);
  
  const calculatePotentialRewards = () => {
    if (!iracingStats) return 0;
    
    // Use contract claimable amount if available (including 0)
    if (claimableAmount !== undefined) {
      return Number(formatEther(claimableAmount));
    }
    
    // Fallback calculation only when contract data not available
    const POINTS_PER_WIN = 1000;
    const POINTS_PER_TOP5 = 100;
    const POINTS_PER_START = 10;
    const BASE_TOKENS_PER_POINT = 1000;
    
    const points = 
      (iracingStats.careerWins * POINTS_PER_WIN) +
      (iracingStats.careerTop5s * POINTS_PER_TOP5) +
      (iracingStats.careerStarts * POINTS_PER_START);
    
    return points * BASE_TOKENS_PER_POINT;
  };

  if (authStatus === 'authenticated' && iracingStats) {
    // Calculate delta stats - based on iRacing ID, not wallet
    const deltaWins = lastClaimData ? iracingStats.careerWins - Number(lastClaimData[0]) : iracingStats.careerWins;
    const deltaTop5s = lastClaimData ? iracingStats.careerTop5s - Number(lastClaimData[1]) : iracingStats.careerTop5s;
    const deltaStarts = lastClaimData ? iracingStats.careerStarts - Number(lastClaimData[2]) : iracingStats.careerStarts;
    
    // Check if this iRacing ID has claimed before (regardless of wallet)
    const hasPreviousClaim = lastClaimData !== undefined && 
      (lastClaimData[0] > BigInt(0) || lastClaimData[1] > BigInt(0) || lastClaimData[2] > BigInt(0));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-500" />
              Claim NASCORN Tokens
            </CardTitle>
            <CardDescription>
              Based on your iRacing career statistics, claim your rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nascornBalance !== undefined && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Wallet Balance</span>
                  </div>
                  <div className="font-bold">{Number(formatEther(nascornBalance)).toLocaleString()} NASCORN</div>
                </div>
              )}

              {hasPreviousClaim && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your iRacing account has claimed rewards before with last stats: {Number(lastClaimData[0])} wins, {Number(lastClaimData[1])} top 5s, {Number(lastClaimData[2])} starts.
                    {calculatePotentialRewards() > 0 
                      ? " You can claim more rewards based on your new racing stats below." 
                      : " Complete more races to earn additional rewards!"}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2" data-testid="text-claimable-amount">
                  {calculatePotentialRewards().toLocaleString()} NASCORN
                </div>
                <div className="text-sm text-muted-foreground">
                  {hasPreviousClaim 
                    ? `Rewards based on ${deltaWins} new wins, ${deltaTop5s} new top 5s, ${deltaStarts} new starts`
                    : `Rewards based on ${iracingStats.careerWins} wins, ${iracingStats.careerTop5s} top 5s, ${iracingStats.careerStarts} starts`
                  }
                </div>
              </div>

              {!CLAIM_CONTRACT_ADDRESS ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Claim contract not configured. Please add VITE_CLAIM_CONTRACT_ADDRESS to environment.
                  </AlertDescription>
                </Alert>
              ) : calculatePotentialRewards() <= 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No new rewards available. Race more to earn additional tokens!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming || isClaimPending || isTxLoading}
                    className="w-full gap-2"
                    size="lg"
                    data-testid="button-claim-tokens"
                  >
                    {(isClaiming || isClaimPending || isTxLoading) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isTxLoading ? 'Confirming...' : 'Claiming...'}
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        {hasPreviousClaim ? 'Claim Additional Tokens' : 'Claim Tokens'}
                      </>
                    )}
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Rewards halve every 100M tokens claimed. Claim early to maximize your rewards.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              iRacing Statistics
            </CardTitle>
            <CardDescription>
              Welcome, {iracingStats.displayName}! Your iRacing account is successfully linked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Account Information</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <Badge variant="outline">{iracingStats.iracingId}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">License:</span>
                    <Badge>{iracingStats.licenseName}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">iRating:</span>
                    <Badge variant="secondary">{iracingStats.irating}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Career Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Wins</span>
                    </div>
                    <div className="text-2xl font-bold">{iracingStats.careerWins}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Top 5s</span>
                    </div>
                    <div className="text-2xl font-bold">{iracingStats.careerTop5s}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Car className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Starts</span>
                    </div>
                    <div className="text-2xl font-bold">{iracingStats.careerStarts}</div>
                  </div>
                </div>
              </div>

              {hasPreviousClaim && (
                <div>
                  <h3 className="font-semibold mb-3">New Stats Since Last Claim</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">New Wins</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">{deltaWins}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">New Top 5s</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{deltaTop5s}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Car className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">New Starts</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{deltaStarts}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {contractStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Halving Progress
              </CardTitle>
              <CardDescription>
                Track the total claimed supply and progress towards the next halving event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pool</div>
                    <div className="text-2xl font-bold">
                      {contractStats.totalPool.toLocaleString(undefined, { maximumFractionDigits: 0 })}M
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Available to Claim</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(contractStats.totalPool - contractStats.totalClaimed).toLocaleString(undefined, { maximumFractionDigits: 0 })}M
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Claimed</div>
                    <div className="text-2xl font-bold">
                      {contractStats.totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })}M
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Current Multiplier</div>
                    <div className="text-2xl font-bold">
                      {contractStats.currentMultiplier}x
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to Next Halving</span>
                    <span className="font-medium">{contractStats.halving.progressPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={contractStats.halving.progressPercent} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {contractStats.halving.remainingUntilHalving.toLocaleString(undefined, { maximumFractionDigits: 2 })}M tokens until rewards halve
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
            <p className="mb-2">Claim NASCORN tokens based on your iRacing career:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>1,000 points</strong> per win</li>
              <li><strong>100 points</strong> per top 5 finish</li>
              <li><strong>10 points</strong> per race start</li>
              <li><strong>1,000 NASCORN</strong> per point earned</li>
            </ul>
            <p className="mt-2 text-xs">
              *Rewards halve every 100M tokens claimed. Early adopters get up to 2x bonus!
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