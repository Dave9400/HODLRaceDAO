import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  BarChart3,
  ExternalLink,
  Copy,
  Trophy
} from "lucide-react";
import { useAccount } from "wagmi";

export default function TradingInterface() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // APEX token address on Base network
  const APEX_ADDRESS = "0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07";
  
  // URLs
  const uniswapUrl = `https://app.uniswap.org/#/swap?outputCurrency=${APEX_ADDRESS}&chain=base`;
  const clankerUrl = `https://clanker.world/clanker/${APEX_ADDRESS}`;
  const geckoterminalUrl = `https://www.geckoterminal.com/base/pools/0x9b350d0188b6a90655633e5bdfc07d0fc91507a994efa82bfcf544d5acdaff3f`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(APEX_ADDRESS);
      toast({
        title: "Address copied!",
        description: "Contract address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy address to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Testnet Notice */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            <DollarSign className="h-5 w-5" />
            Trade APEX - Coming to Mainnet Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-yellow-900 dark:text-yellow-100 font-medium">
              We're currently running on Base Sepolia testnet for development and testing.
            </p>
            <p className="text-yellow-800 dark:text-yellow-200">
              Please do not attempt to purchase APEX tokens at this time. The trading interface will be enabled once we launch to Base mainnet.
            </p>
            <div className="pt-4 border-t border-yellow-300 dark:border-yellow-700">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">What you can do now:</h4>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li className="flex items-start gap-2">
                  <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Connect your iRacing account and start claiming APEX rewards based on your racing performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Check out the leaderboard to see how you rank against other drivers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Join our community and help shape the future of HODL Racing DAO</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contract Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Base Network</h4>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {APEX_ADDRESS}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
              data-testid="button-copy-address"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}