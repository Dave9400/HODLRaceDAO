import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  BarChart3,
  ExternalLink,
  Copy
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
      {/* Uniswap Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Trade APEX
            </div>
            <a 
              href={uniswapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              data-testid="link-uniswap-external"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <iframe
              src={uniswapUrl}
              height="660px"
              width="100%"
              style={{ 
                border: 0, 
                borderRadius: '10px', 
                overflow: 'hidden',
                minHeight: '660px'
              }}
              title="Uniswap APEX Trading"
              data-testid="iframe-uniswap-trading"
            />
          </div>
          
          {!isConnected && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Connect your wallet in the Uniswap interface above to start trading APEX tokens on Base network
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GeckoTerminal Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              APEX Price Chart
            </div>
            <div className="flex gap-2">
              <a 
                href={clankerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                data-testid="link-clanker-external"
              >
                View on Clanker
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href={geckoterminalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                data-testid="link-geckoterminal-external"
              >
                View on GeckoTerminal
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <iframe
              src={`${geckoterminalUrl}?embed=true&info=0&swaps=0`}
              height="500px"
              width="100%"
              style={{ 
                border: 0, 
                borderRadius: '10px', 
                overflow: 'hidden',
                minHeight: '500px'
              }}
              title="APEX Price Chart"
              data-testid="iframe-price-chart"
            />
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