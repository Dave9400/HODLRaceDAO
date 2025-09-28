import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign,
  BarChart3,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { useAccount } from "wagmi";

export default function TradingInterface() {
  const { address, isConnected } = useAccount();

  // NASCORN token address on Base network
  const NASCORN_ADDRESS = "0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07";
  
  // Uniswap URL for Base network with NASCORN pre-selected
  const uniswapUrl = `https://app.uniswap.org/#/swap?outputCurrency=${NASCORN_ADDRESS}&chain=base`;

  return (
    <div className="space-y-6">
      {/* Token Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Current Price</span>
              </div>
              <Badge variant="secondary">Loading...</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">24h Change</span>
              </div>
              <Badge variant="secondary">-</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">24h Volume</span>
              </div>
              <Badge variant="secondary">-</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uniswap Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Trade NASCORN
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
              title="Uniswap NASCORN Trading"
              data-testid="iframe-uniswap-trading"
            />
          </div>
          
          {!isConnected && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Connect your wallet in the Uniswap interface above to start trading NASCORN tokens on Base network
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About NASCORN Trading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Powered by Uniswap</h4>
              <p className="text-sm text-muted-foreground">
                Trade directly through Uniswap's decentralized exchange on Base network
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Low Fees</h4>
              <p className="text-sm text-muted-foreground">
                Benefit from Base network's low transaction costs
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Racing Rewards</h4>
              <p className="text-sm text-muted-foreground">
                Earn NASCORN tokens through iRacing performance achievements
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Base Network</h4>
              <p className="text-sm text-muted-foreground">
                NASCORN token: {NASCORN_ADDRESS}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}