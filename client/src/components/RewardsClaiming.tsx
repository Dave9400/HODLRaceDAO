import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Coins, 
  Trophy, 
  Target, 
  Car,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  ExternalLink
} from "lucide-react";
import { useAccount, useSignMessage } from 'wagmi';
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";

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

interface OracleAttestation {
  racerId: number;
  wins: number;
  top5s: number;
  starts: number;
  expiry: number;
  oracleSignature: string;
}

export default function RewardsClaiming({ iracingStats, authToken, isAuthenticated }: RewardsClaimingProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'fetching-oracle' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();

  const claimRewards = async () => {
    if (!iracingStats || !isConnected || !authToken || !address) {
      toast({
        title: "Not Ready",
        description: "Please ensure you're connected and authenticated.",
        variant: "destructive",
      });
      return;
    }
    
    setIsClaiming(true);
    setClaimStatus('fetching-oracle');
    setStatusMessage("Getting verified stats from oracle...");
    setTxHash(null);
    
    try {
      // Step 1: Get oracle signature (oracle verifies stats and signs them)
      const oracleResponse = await fetch('/api/oracle/generate-signature', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!oracleResponse.ok) {
        throw new Error("Failed to get oracle attestation");
      }
      
      const oracleData: OracleAttestation = await oracleResponse.json();
      
      // Step 2: Ask user to sign consent message
      setClaimStatus('signing');
      setStatusMessage("Please sign the message in your wallet to authorize the claim...");
      
      // Create the user consent hash: keccak256(abi.encodePacked("NASCORN LINK", racerId, wallet, expiry))
      const textHash = ethers.utils.solidityKeccak256(
        ["string", "uint256", "address", "uint256"],
        ["NASCORN LINK", oracleData.racerId, address, oracleData.expiry]
      );
      
      // Sign the hash
      const userSignature = await signMessageAsync({
        message: { raw: textHash as `0x${string}` }
      });
      
      // Step 3: Submit both signatures to relayer (relayer pays gas)
      setClaimStatus('submitting');
      setStatusMessage("Submitting claim to blockchain (gas-free for you)...");
      
      const relayerResponse = await fetch('/api/relayer/submit-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          racerId: oracleData.racerId,
          wallet: address,
          wins: oracleData.wins,
          top5s: oracleData.top5s,
          starts: oracleData.starts,
          expiry: oracleData.expiry,
          oracleSignature: oracleData.oracleSignature,
          userSignature: userSignature
        })
      });
      
      if (!relayerResponse.ok) {
        const errorData = await relayerResponse.json();
        throw new Error(errorData.details || errorData.error || "Failed to submit claim");
      }
      
      const result = await relayerResponse.json();
      
      setClaimStatus('success');
      setTxHash(result.transactionHash);
      setStatusMessage("Rewards successfully claimed!");
      
      toast({
        title: "Rewards Claimed!",
        description: "Your NASCORN tokens have been successfully claimed. Check your wallet!",
      });
      
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimStatus('error');
      setStatusMessage(error.message || "Failed to claim rewards");
      
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Reward Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Race to Earn Rewards
          </CardTitle>
          <CardDescription>
            Claim NASCORN tokens based on your verified iRacing performance. Gas fees paid by the platform!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Display */}
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
              <Badge className="mb-2" variant="secondary">
                {iracingStats.licenseName}
              </Badge>
              <div className="font-semibold">iRating</div>
              <div className="text-2xl">{iracingStats.irating}</div>
            </div>
          </div>

          {/* Reward Rates Info */}
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Reward Rates:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Baseline reward: 1,000,000 NASCORN (one-time)</li>
                <li>• Per Win: 420,000 NASCORN</li>
                <li>• Per Top 5: 69,000 NASCORN</li>
                <li>• Per Start: 42,000 NASCORN</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Rewards halve after every 1B NASCORN claimed globally. Max 100M per user.
              </p>
            </AlertDescription>
          </Alert>

          {/* Claim Status */}
          {claimStatus !== 'idle' && (
            <Alert variant={claimStatus === 'success' ? 'default' : claimStatus === 'error' ? 'destructive' : 'default'}>
              {claimStatus === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : claimStatus === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <AlertDescription>
                {statusMessage}
                {txHash && (
                  <a 
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 mt-2 text-primary hover:underline"
                  >
                    View transaction on BaseScan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Claim Button */}
          <div className="text-center space-y-4">
            <Button 
              onClick={claimRewards}
              disabled={!isConnected || isClaiming}
              size="lg"
              className="gap-2"
              data-testid="button-claim-rewards"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {claimStatus === 'fetching-oracle' && 'Verifying Stats...'}
                  {claimStatus === 'signing' && 'Awaiting Signature...'}
                  {claimStatus === 'submitting' && 'Submitting Claim...'}
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  Claim NASCORN Rewards (Gas-Free!)
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              You'll only pay gas if this is your first time claiming. The platform covers gas for all subsequent claims.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>Oracle Verification:</strong> Our backend fetches and verifies your latest iRacing stats</p>
          <p>2. <strong>Wallet Signature:</strong> You sign a message proving you own this wallet (no gas)</p>
          <p>3. <strong>Gas-Free Claim:</strong> Our relayer submits the transaction and pays all gas fees</p>
          <p>4. <strong>Instant Rewards:</strong> NASCORN tokens appear in your wallet within seconds</p>
        </CardContent>
      </Card>
    </div>
  );
}
