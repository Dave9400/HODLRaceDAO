import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Users, AlertCircle, ExternalLink } from "lucide-react";
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { APEX_TOKEN_ADDRESS, APEX_TOKEN_ABI, DAO_TREASURY_ADDRESS } from '@/lib/contracts';
import { getActiveChainConfig } from '@shared/chain';

export default function DAOTreasury() {
  const chainConfig = getActiveChainConfig();
  
  // Fetch DAO treasury balance
  const { data: treasuryBalance, isLoading: isLoadingBalance } = useReadContract({
    address: APEX_TOKEN_ADDRESS,
    abi: APEX_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [DAO_TREASURY_ADDRESS],
  });

  // Fetch total supply for comparison
  const { data: totalSupply } = useReadContract({
    address: APEX_TOKEN_ADDRESS,
    abi: APEX_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0';
    return Number(formatEther(balance)).toLocaleString(undefined, {
      maximumFractionDigits: 0
    });
  };

  const calculatePercentage = (balance: bigint | undefined, total: bigint | undefined) => {
    if (!balance || !total || total === BigInt(0)) return '0';
    return ((Number(balance) / Number(total)) * 100).toFixed(2);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Wallet className="w-10 h-10 text-primary" />
          DAO Treasury
        </h1>
        <p className="text-muted-foreground text-lg">
          Monitor the HODL Racing DAO treasury and participate in governance decisions
        </p>
      </div>

      {/* Treasury Balance Card */}
      <Card className="mb-6" data-testid="card-treasury-balance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            Treasury Balance
          </CardTitle>
          <CardDescription>
            Current APEX holdings in the DAO treasury
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Balance Display */}
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2" data-testid="text-treasury-balance">
                {isLoadingBalance ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${formatBalance(treasuryBalance)} APEX`
                )}
              </div>
              {totalSupply && treasuryBalance && (
                <div className="text-sm text-muted-foreground">
                  {calculatePercentage(treasuryBalance, totalSupply)}% of total supply
                </div>
              )}
            </div>

            {/* Treasury Address */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="text-sm font-medium mb-2">Treasury Address</div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-background px-2 py-1 rounded border break-all" data-testid="text-treasury-address">
                  {DAO_TREASURY_ADDRESS}
                </code>
                <a
                  href={`${chainConfig.blockExplorer}/address/${DAO_TREASURY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                  data-testid="link-view-on-explorer"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Initial Allocation</div>
                <div className="text-2xl font-bold">20B APEX</div>
                <div className="text-xs text-muted-foreground">20% of supply</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Management</div>
                <div className="text-lg font-semibold">Gnosis Safe</div>
                <div className="text-xs text-muted-foreground">Multi-sig (planned)</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Governance</div>
                <div className="text-lg font-semibold">Coming Soon</div>
                <div className="text-xs text-muted-foreground">OpenZeppelin Governor</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance Section - Coming Soon */}
      <Card data-testid="card-governance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Governance Proposals
          </CardTitle>
          <CardDescription>
            Participate in DAO governance and vote on proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Governance System Coming Soon</p>
                <p className="text-sm">
                  The DAO governance system is under development. Once deployed, APEX token holders will be able to:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Create proposals for treasury spending and protocol changes</li>
                  <li>Vote on active proposals (For / Against / Abstain)</li>
                  <li>Execute passed proposals through the Gnosis Safe</li>
                  <li>View proposal history and voting records</li>
                </ul>
                <p className="text-sm mt-3">
                  The governance contracts (OpenZeppelin Governor + Timelock Controller) will be deployed soon.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Placeholder for future governance features */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-6 text-center opacity-50">
              <div className="text-4xl mb-2">📝</div>
              <div className="font-semibold mb-1">Create Proposal</div>
              <div className="text-sm text-muted-foreground">Submit governance proposals</div>
            </div>
            <div className="border rounded-lg p-6 text-center opacity-50">
              <div className="text-4xl mb-2">🗳️</div>
              <div className="font-semibold mb-1">Vote</div>
              <div className="text-sm text-muted-foreground">Participate in active votes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>About the DAO Treasury</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The HODL Racing DAO treasury will hold 20 billion APEX tokens (20% of the total 100 billion supply) 
              to fund the development and growth of the racing ecosystem.
            </p>
            <p>
              Treasury funds will be used for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Development and maintenance of the platform</li>
              <li>Racing events and prize pools</li>
              <li>Marketing and community growth initiatives</li>
              <li>Partnerships with racing organizations</li>
              <li>Liquidity provision and market making</li>
            </ul>
            <p>
              All treasury spending will be governed by APEX token holders through on-chain proposals 
              once the governance system is deployed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
