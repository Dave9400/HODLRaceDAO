import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Coins, 
  Trophy, 
  Target, 
  Car,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  TrendingDown
} from "lucide-react";
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useToast } from "@/hooks/use-toast";

// Smart contract ABI (subset for the functions we need)
const CLAIM_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "iracingId", "type": "string"}],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "iracingId", "type": "string"}],
    "name": "getUserStats",
    "outputs": [
      {"internalType": "uint256", "name": "careerWins", "type": "uint256"},
      {"internalType": "uint256", "name": "careerTop5s", "type": "uint256"},
      {"internalType": "uint256", "name": "careerStarts", "type": "uint256"},
      {"internalType": "uint256", "name": "totalClaimed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastClaimTimestamp", "type": "uint256"},
      {"internalType": "bool", "name": "hasClaimedInitial", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRewardRates",
    "outputs": [
      {"internalType": "uint256", "name": "accountReward", "type": "uint256"},
      {"internalType": "uint256", "name": "perWin", "type": "uint256"},
      {"internalType": "uint256", "name": "perTop5", "type": "uint256"},
      {"internalType": "uint256", "name": "perStart", "type": "uint256"},
      {"internalType": "uint256", "name": "halvingEpoch", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract address from environment or config
const CLAIM_CONTRACT_ADDRESS = import.meta.env.VITE_CLAIM_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

interface UserStats {
  careerWins: number;
  careerTop5s: number;
  careerStarts: number;
  totalClaimed: number;
  lastClaimTimestamp: number;
  hasClaimedInitial: boolean;
  isRegistered: boolean;
}

interface RewardRates {
  accountReward: bigint;
  perWin: bigint;
  perTop5: bigint;
  perStart: bigint;
  halvingEpoch: number;
}

interface IRacingStats {
  iracingId: string;
  careerWins: number;
  careerTop5s: number;
  careerStarts: number;
  irating: number;
  licenseName: string;
}

interface RewardsClaimingProps {
  iracingStats: IRacingStats | null;
  authToken: string | null;
  isAuthenticated: boolean;
}

export default function RewardsClaiming({ iracingStats, authToken, isAuthenticated }: RewardsClaimingProps) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [rewardRates, setRewardRates] = useState<RewardRates | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();

  // Read user stats from contract
  const { data: contractUserStats } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'getUserStats',
    args: iracingStats ? [iracingStats.iracingId] : undefined,
    query: { enabled: !!iracingStats?.iracingId }
  });

  // Read current reward rates
  const { data: contractRewardRates } = useReadContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: 'getCurrentRewardRates'
  });

  useEffect(() => {
    if (contractUserStats) {
      setUserStats({
        careerWins: Number(contractUserStats[0]),
        careerTop5s: Number(contractUserStats[1]), 
        careerStarts: Number(contractUserStats[2]),
        totalClaimed: Number(formatEther(contractUserStats[3])),
        lastClaimTimestamp: Number(contractUserStats[4]),
        hasClaimedInitial: contractUserStats[5],
        isRegistered: Number(contractUserStats[3]) > 0 || contractUserStats[5]
      });
    }
  }, [contractUserStats]);

  useEffect(() => {
    if (contractRewardRates) {
      setRewardRates({
        accountReward: contractRewardRates[0],
        perWin: contractRewardRates[1],
        perTop5: contractRewardRates[2],
        perStart: contractRewardRates[3],
        halvingEpoch: Number(contractRewardRates[4])
      });
    }
  }, [contractRewardRates]);

  const registerUser = async () => {
    if (!iracingStats || !isConnected) return;
    
    setIsRegistering(true);
    try {
      await writeContractAsync({
        address: CLAIM_CONTRACT_ADDRESS,
        abi: CLAIM_CONTRACT_ABI,
        functionName: 'registerUser',
        args: [iracingStats.iracingId]
      });
      
      toast({
        title: "Registration Successful",
        description: "Your iRacing account has been registered with the smart contract.",
      });
      
      // Refresh stats after registration
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register with smart contract.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const claimRewards = async () => {
    if (!iracingStats || !isConnected || !authToken) return;
    
    setIsClaiming(true);
    setClaimStatus('idle');
    
    try {
      // First, sync the latest stats with the smart contract backend
      await fetch('/api/iracing/sync-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      // Then claim rewards from the smart contract
      await writeContractAsync({
        address: CLAIM_CONTRACT_ADDRESS,
        abi: CLAIM_CONTRACT_ABI,
        functionName: 'claimRewards'
      });
      
      setClaimStatus('success');
      toast({
        title: "Rewards Claimed!",
        description: "Your NASCORN tokens have been successfully claimed.",
      });
      
      // Refresh stats after claim
      setTimeout(() => window.location.reload(), 3000);
      
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimStatus('error');
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const calculatePendingRewards = () => {
    if (!iracingStats || !rewardRates) return 0;
    
    const accountReward = userStats?.hasClaimedInitial ? 0 : Number(formatEther(rewardRates.accountReward));
    const winReward = iracingStats.careerWins * Number(formatEther(rewardRates.perWin));
    const top5Reward = iracingStats.careerTop5s * Number(formatEther(rewardRates.perTop5));
    const startReward = iracingStats.careerStarts * Number(formatEther(rewardRates.perStart));
    
    const totalPending = accountReward + winReward + top5Reward + startReward;
    const alreadyClaimed = userStats?.totalClaimed || 0;
    
    return Math.max(0, Math.min(totalPending - alreadyClaimed, 100_000_000 - alreadyClaimed));
  };

  const getSupplyProgress = () => {
    if (!rewardRates) return 0;
    return (rewardRates.halvingEpoch + 1) * 10; // Each epoch represents 10% of supply claimed
  };

  if (!isAuthenticated || !iracingStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6" />
            Claim NASCORN Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your iRacing account first to view and claim your rewards.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!userStats?.isRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6" />
            Register for Rewards
          </CardTitle>
          <CardDescription>
            Register your iRacing account with the smart contract to start claiming rewards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold">Ready to Register</div>
            <div className="text-muted-foreground">
              Your iRacing account (ID: {iracingStats.iracingId}) needs to be registered 
              with the NASCORN rewards contract.
            </div>
            
            <Button 
              onClick={registerUser}
              disabled={!isConnected || isRegistering}
              size="lg"
              className="gap-2"
              data-testid="button-register-user"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isRegistering ? 'Registering...' : 'Register Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reward Rates Info */}
      {rewardRates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-6 h-6" />
              Current Reward Rates
              {rewardRates.halvingEpoch > 0 && (
                <Badge variant="destructive">Epoch {rewardRates.halvingEpoch}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Reward rates decrease by half every time 10% of total supply is claimed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="font-semibold">Account</div>
                <div className="text-lg">{Number(formatEther(rewardRates.accountReward)).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="font-semibold">Per Win</div>
                <div className="text-lg">{Number(formatEther(rewardRates.perWin)).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="font-semibold">Per Top 5</div>
                <div className="text-lg">{Number(formatEther(rewardRates.perTop5)).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="font-semibold">Per Start</div>
                <div className="text-lg">{Number(formatEther(rewardRates.perStart)).toLocaleString()}</div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Supply Claimed Progress</span>
                <span>{getSupplyProgress()}%</span>
              </div>
              <Progress value={getSupplyProgress()} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Next halving occurs when {(rewardRates.halvingEpoch + 1) * 10 + 10}% of total supply is claimed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Stats and Claiming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Your Rewards
          </CardTitle>
          <CardDescription>
            Based on your verified iRacing statistics and previous claims.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <div className="font-semibold">Wins</div>
              <div className="text-2xl">{iracingStats.careerWins}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="font-semibold">Top 5s</div>
              <div className="text-2xl">{iracingStats.careerTop5s}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Car className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="font-semibold">Starts</div>
              <div className="text-2xl">{iracingStats.careerStarts}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Coins className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="font-semibold">Claimed</div>
              <div className="text-2xl">{(userStats?.totalClaimed || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Pending Rewards */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">
                {calculatePendingRewards().toLocaleString()} NASCORN
              </div>
              <div className="text-muted-foreground">Available to Claim</div>
              {userStats && userStats.lastClaimTimestamp > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last claimed: {new Date(userStats.lastClaimTimestamp * 1000).toLocaleDateString()}
                </div>
              )}
            </div>

            {claimStatus === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Rewards successfully claimed! Your NASCORN tokens will appear in your wallet shortly.
                </AlertDescription>
              </Alert>
            )}

            {claimStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to claim rewards. Please check your wallet connection and try again.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={claimRewards}
              disabled={!isConnected || isClaiming || calculatePendingRewards() <= 0}
              size="lg"
              className="gap-2"
              data-testid="button-claim-rewards"
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              {isClaiming ? 'Claiming Rewards...' : 'Claim Rewards'}
            </Button>

            {calculatePendingRewards() <= 0 && (
              <div className="text-sm text-muted-foreground">
                No new rewards available. Complete more races to earn additional NASCORN!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}