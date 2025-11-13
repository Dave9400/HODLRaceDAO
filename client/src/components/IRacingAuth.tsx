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
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
import { parseEther, formatEther } from 'viem';
import { CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_ABI, APEX_TOKEN_ADDRESS, APEX_TOKEN_ABI } from '@/lib/contracts';
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
  
  const { address, isConnected, chainId } = useAccount();
  const { toast } = useToast();
  
  // Legacy hook for fallback (non-Smart Wallet users)
  const { writeContract, data: claimTxHash, isPending: isClaimPending } = useWriteContract();
  
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });
  
  // Paymaster support for Coinbase Smart Wallet (experimental wagmi hooks)
  const [writeContractsId, setWriteContractsId] = useState<string | undefined>(() => {
    // Restore persisted transaction ID on mount (survives page refresh/navigation)
    try {
      const stored = localStorage.getItem('pending-claim-tx');
      if (stored) {
        const { id, timestamp, walletAddress } = JSON.parse(stored);
        // Only restore if less than 10 minutes old and for same wallet
        if (Date.now() - timestamp < 10 * 60 * 1000 && walletAddress === address) {
          console.log('[Claim] Restored pending transaction ID:', id);
          // Don't set isClaiming here - let useEffect handle it based on status
          return id;
        } else {
          // Clear stale data
          console.log('[Claim] Clearing stale transaction data');
          localStorage.removeItem('pending-claim-tx');
        }
      }
    } catch (e) {
      console.error('[Claim] Failed to restore transaction ID:', e);
      localStorage.removeItem('pending-claim-tx');
    }
    return undefined;
  });
  const { data: availableCapabilities } = useCapabilities({ account: address });
  const { writeContracts, writeContractsAsync, data: writeContractsData, isPending: isWriteContractsPending } = useWriteContracts();
  
  const { data: callsStatus } = useCallsStatus({
    id: writeContractsId as `0x${string}`,
    query: {
      enabled: !!writeContractsId,
      refetchInterval: (data) =>
        data?.status === 'CONFIRMED' ? false : 1000,
    },
  });
  
  // Handle restored transaction state - only set claiming if actually pending
  useEffect(() => {
    if (writeContractsId && callsStatus) {
      if (callsStatus.status === 'PENDING') {
        setIsClaiming(true);
        console.log('[Claim] Transaction is still pending, showing claiming UI');
      } else if (callsStatus.status === 'CONFIRMED' || callsStatus.status === 'FAILED') {
        // Transaction already completed - clear claiming state and localStorage
        setIsClaiming(false);
        setWriteContractsId(undefined);
        localStorage.removeItem('pending-claim-tx');
        console.log('[Claim] Restored transaction already completed:', callsStatus.status);
      }
    }
  }, [writeContractsId, callsStatus?.status]);
  
  // Build paymaster capabilities if supported
  const paymasterCapabilities = availableCapabilities && chainId 
    ? (() => {
        const capabilitiesForChain = availableCapabilities[chainId];
        if (capabilitiesForChain?.['paymasterService']?.['supported']) {
          const paymasterUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/api/paymaster`
            : '/api/paymaster';
          
          return {
            paymasterService: {
              url: paymasterUrl, // Absolute URL to backend proxy (keeps CDP_PAYMASTER_URL secret)
            },
          };
        }
        return undefined;
      })()
    : undefined;
  
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
  
  const { data: apexBalance, refetch: refetchApexBalance } = useReadContract({
    address: APEX_TOKEN_ADDRESS,
    abi: APEX_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };
  
  const { data: contractStats, refetch: refetchContractStats } = useQuery<ContractStats>({
    queryKey: ['/api/contract/stats'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Safety check: Clear claiming state if we detect claim was successful
  useEffect(() => {
    const stored = localStorage.getItem('pending-claim-tx');
    if (stored && hasClaimedData && iracingStats) {
      // User has successfully claimed - clear any stale transaction data
      console.log('[Claim] Detected successful claim, clearing pending transaction');
      localStorage.removeItem('pending-claim-tx');
      setWriteContractsId(undefined);
      setIsClaiming(false);
    }
  }, [hasClaimedData, iracingStats?.iracingId]);

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
      
      // Try gas-sponsored transaction first (Coinbase Smart Wallet)
      // Re-derive capabilities to ensure they're fresh
      const freshCapabilities = availableCapabilities && chainId 
        ? availableCapabilities[chainId]?.['paymasterService']?.['supported']
        : false;
      
      if (freshCapabilities && paymasterCapabilities && writeContractsAsync && chainId && address) {
        console.log('[Claim] Using gas-sponsored transaction via paymaster', {
          chainId,
          hasCapabilities: !!availableCapabilities,
          paymasterSupported: freshCapabilities
        });
        try {
          const id = await writeContractsAsync({
            contracts: [
              {
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
              },
            ],
            capabilities: paymasterCapabilities,
          });
          
          if (id) {
            setWriteContractsId(id);
            // Persist ID to localStorage so it survives page refresh/navigation
            localStorage.setItem('pending-claim-tx', JSON.stringify({
              id,
              timestamp: Date.now(),
              walletAddress: address
            }));
            console.log('[Claim] Gas-sponsored transaction submitted:', id);
            toast({
              title: "Transaction Submitted",
              description: "You can safely leave this page. We'll track your transaction.",
            });
          } else {
            console.warn('[Claim] No transaction ID returned, capabilities may be stale');
            throw new Error('No transaction ID returned from paymaster');
          }
        } catch (paymasterError) {
          // Paymaster call failed, fall back to regular transaction
          console.error('[Claim] Paymaster error, falling back to regular transaction:', paymasterError);
          toast({
            title: "Falling back to regular transaction",
            description: "Gas sponsorship unavailable. You'll need to pay gas fees.",
          });
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
        }
      } else {
        // Fallback to regular transaction (user pays gas)
        console.log('[Claim] No paymaster capabilities detected, using regular transaction (user pays gas)');
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
      }
      
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
  
  // Handle legacy transaction completion (non-Smart Wallet)
  useEffect(() => {
    if (isTxSuccess) {
      toast({
        title: "Claim Successful! 🎉",
        description: "APEX tokens have been sent to your wallet",
      });
      setIsClaiming(false);
      
      // Wait a moment for blockchain state to update, then refetch all data
      setTimeout(() => {
        refetchContractStats();
        refetchHasClaimed();
        refetchClaimableAmount();
        refetchUserClaimCount();
        refetchLastClaim();
        refetchApexBalance();
        queryClient.invalidateQueries({ queryKey: ['/api/contract/stats'] });
      }, 2000); // 2 second delay
    }
  }, [isTxSuccess]);
  
  // Handle sponsored transaction completion (Smart Wallet with paymaster)
  useEffect(() => {
    if (callsStatus?.status === 'CONFIRMED') {
      console.log('[Claim] Sponsored transaction confirmed!', callsStatus);
      toast({
        title: "Claim Successful! 🎉",
        description: "APEX tokens have been sent to your wallet (gas-free!)",
      });
      setIsClaiming(false);
      setWriteContractsId(undefined); // Reset
      localStorage.removeItem('pending-claim-tx'); // Clear persisted ID
      
      // Wait a moment for blockchain state to update, then refetch all data
      setTimeout(() => {
        refetchContractStats();
        refetchHasClaimed();
        refetchClaimableAmount();
        refetchUserClaimCount();
        refetchLastClaim();
        refetchApexBalance();
        queryClient.invalidateQueries({ queryKey: ['/api/contract/stats'] });
      }, 2000); // 2 second delay
    } else if (callsStatus?.status === 'FAILED') {
      console.error('[Claim] Sponsored transaction failed', callsStatus);
      toast({
        title: "Gas Sponsorship Failed",
        description: "The gas-free transaction failed. You can try again or contact support if this persists.",
        variant: "destructive",
      });
      setIsClaiming(false);
      setWriteContractsId(undefined); // Reset
      localStorage.removeItem('pending-claim-tx'); // Clear persisted ID
    }
  }, [callsStatus?.status]);
  
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
    const BASE_TOKENS_PER_POINT = 100; // Updated to match new contract (was 1000)
    
    const points = 
      (iracingStats.careerWins * POINTS_PER_WIN) +
      (iracingStats.careerTop5s * POINTS_PER_TOP5) +
      (iracingStats.careerStarts * POINTS_PER_START);
    
    return points * BASE_TOKENS_PER_POINT;
  };

  // Calculate delta stats - based on iRacing ID, not wallet
  const deltaWins = lastClaimData && iracingStats ? iracingStats.careerWins - Number(lastClaimData[0]) : iracingStats?.careerWins || 0;
  const deltaTop5s = lastClaimData && iracingStats ? iracingStats.careerTop5s - Number(lastClaimData[1]) : iracingStats?.careerTop5s || 0;
  const deltaStarts = lastClaimData && iracingStats ? iracingStats.careerStarts - Number(lastClaimData[2]) : iracingStats?.careerStarts || 0;
  
  // Check if this iRacing ID has claimed before (regardless of wallet)
  const hasPreviousClaim = lastClaimData !== undefined && 
    (lastClaimData[0] > BigInt(0) || lastClaimData[1] > BigInt(0) || lastClaimData[2] > BigInt(0));

  return (
    <div className="space-y-6">
      {/* Halving Progress - Show early when contract stats are loaded */}
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

      {/* Wallet Balance - Show immediately when wallet is connected */}
      {isConnected && apexBalance !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-green-500" />
              Your APEX Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2" data-testid="text-wallet-balance">
                {Number(formatEther(apexBalance)).toLocaleString()} APEX
              </div>
              <div className="text-sm text-muted-foreground">
                Connected wallet balance
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {authStatus === 'authenticated' && iracingStats ? (
        <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-500" />
              Claim APEX Tokens
            </CardTitle>
            <CardDescription>
              Based on your iRacing career statistics, claim your rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                  {calculatePotentialRewards().toLocaleString()} APEX
                </div>
                <div className="text-sm text-muted-foreground">
                  {hasPreviousClaim 
                    ? `Rewards based on ${deltaWins} new wins, ${deltaTop5s} new top 5s, ${deltaStarts} new starts`
                    : `Rewards based on ${iracingStats.careerWins} wins, ${iracingStats.careerTop5s} top 5s, ${iracingStats.careerStarts} starts`
                  }
                </div>
              </div>

              {/* Points Breakdown */}
              {calculatePotentialRewards() > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <div className="font-semibold text-sm">Rewards Breakdown</div>
                  <div className="space-y-2 text-sm">
                    {/* Racing Stats Points */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Racing Stats Points:</span>
                      <span className="font-medium">
                        {(deltaWins * 1000 + deltaTop5s * 100 + deltaStarts * 10).toLocaleString()} pts
                      </span>
                    </div>
                    <div className="pl-4 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>{deltaWins} {deltaWins === 1 ? 'win' : 'wins'} × 1,000 pts</span>
                        <span>{(deltaWins * 1000).toLocaleString()} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{deltaTop5s} top 5{deltaTop5s === 1 ? '' : 's'} × 100 pts</span>
                        <span>{(deltaTop5s * 100).toLocaleString()} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{deltaStarts} {deltaStarts === 1 ? 'start' : 'starts'} × 10 pts</span>
                        <span>{(deltaStarts * 10).toLocaleString()} pts</span>
                      </div>
                    </div>
                    
                    {/* First-Time Bonus */}
                    {!hasPreviousClaim && (
                      <>
                        <div className="flex justify-between text-green-600">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            First-Time Sign-On Bonus:
                          </span>
                          <span className="font-medium">+1,000 pts</span>
                        </div>
                      </>
                    )}
                    
                    {/* Total Points */}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total Points:</span>
                      <span className="font-bold">
                        {(deltaWins * 1000 + deltaTop5s * 100 + deltaStarts * 10 + (!hasPreviousClaim ? 1000 : 0)).toLocaleString()} pts
                      </span>
                    </div>
                    
                    {/* Multiplier */}
                    {contractStats && (
                      <div className="flex justify-between text-blue-600">
                        <span>Current Multiplier:</span>
                        <span className="font-medium">{contractStats.currentMultiplier}x</span>
                      </div>
                    )}
                    
                    {/* Base Reward Rate */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Base Rate:</span>
                      <span>100 APEX per point</span>
                    </div>
                  </div>
                </div>
              )}

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
                    disabled={isClaiming || isClaimPending || isTxLoading || isWriteContractsPending || callsStatus?.status === 'PENDING'}
                    className="w-full gap-2"
                    size="lg"
                    data-testid="button-claim-tokens"
                  >
                    {(isClaiming || isClaimPending || isTxLoading || isWriteContractsPending || callsStatus?.status === 'PENDING') ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isTxLoading || callsStatus?.status === 'PENDING' ? 'Confirming...' : 'Claiming...'}
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
                    <span className="text-sm text-muted-foreground">iRacing ID:</span>
                    <Badge variant="outline">{iracingStats.iracingId}</Badge>
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
        </>
      ) : (
    <Card data-testid="iracing-auth-component">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-6 h-6" />
          Connect iRacing Account
        </CardTitle>
        <CardDescription>
          Link your iRacing account to claim APEX tokens based on your racing performance.
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
            <p className="mb-2">Claim APEX tokens based on your iRacing career:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>1,000 points</strong> per win</li>
              <li><strong>100 points</strong> per top 5 finish</li>
              <li><strong>10 points</strong> per race start</li>
              <li><strong>1,000 APEX</strong> per point earned</li>
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
      )}
    </div>
  );
}