import { SwapWidget } from '@uniswap/widgets';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { useAccount } from "wagmi";

export default function TradingInterface() {
  const { address, isConnected } = useAccount();

  // NASCORN token configuration for Base network
  const NASCORN_TOKEN = {
    chainId: 8453, // Base network
    address: "0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07",
    decimals: 18,
    symbol: "NASCORN",
    name: "NASCORN"
  };

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

      {/* Uniswap Trading Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Trade NASCORN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <SwapWidget
                jsonRpcEndpoint="https://mainnet.base.org"
                tokenList="https://tokens.coingecko.com/base/all.json"
                defaultInputTokenAddress="NATIVE" // ETH on Base
                defaultOutputTokenAddress={NASCORN_TOKEN.address}
                defaultInputAmount="0.1"
                theme={{
                  primary: '#2563eb',
                  secondary: '#f1f5f9',
                  interactive: '#3b82f6',
                  container: '#ffffff',
                  module: '#f8fafc',
                  accent: '#fbbf24',
                  outline: '#e2e8f0',
                  dialog: '#ffffff',
                  fontFamily: 'Inter',
                  borderRadius: '0.75rem'
                }}
                width={400}
                brandedFooter={false}
              />
            </div>
          </div>
          
          {!isConnected && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Connect your wallet to start trading NASCORN tokens on Base network
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
        </CardContent>
      </Card>
    </div>
  );
}