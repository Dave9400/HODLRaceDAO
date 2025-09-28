import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy
} from "lucide-react";
import { useAccount } from "wagmi";

interface TokenData {
  price_usd: string;
  price_change_percentage: {
    h24: string;
  };
  volume_usd: {
    h24: string;
  };
}

export default function TradingInterface() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  // NASCORN token address on Base network
  const NASCORN_ADDRESS = "0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07";
  
  // URLs
  const uniswapUrl = `https://app.uniswap.org/#/swap?outputCurrency=${NASCORN_ADDRESS}&chain=base`;
  const clankerUrl = `https://clanker.world/clanker/${NASCORN_ADDRESS}`;
  const geckoterminalUrl = `https://www.geckoterminal.com/base/pools/0x9b350d0188b6a90655633e5bdfc07d0fc91507a994efa82bfcf544d5acdaff3f`;

  // Fetch token data from GeckoTerminal API
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/tokens/${NASCORN_ADDRESS}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.attributes) {
            setTokenData(data.data.attributes);
          }
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTokenData, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(NASCORN_ADDRESS);
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

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num < 0.01) {
      return `$${num.toFixed(6)}`;
    }
    return `$${num.toFixed(4)}`;
  };

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
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
              <Badge variant="secondary" data-testid="badge-current-price">
                {loading ? "Loading..." : tokenData?.price_usd ? formatPrice(tokenData.price_usd) : "$0.0000"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tokenData?.price_change_percentage?.h24 && parseFloat(tokenData.price_change_percentage.h24) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">24h Change</span>
              </div>
              <Badge 
                variant={tokenData?.price_change_percentage?.h24 && parseFloat(tokenData.price_change_percentage.h24) >= 0 ? "default" : "destructive"}
                data-testid="badge-price-change"
              >
                {loading ? "Loading..." : tokenData?.price_change_percentage?.h24 ? `${parseFloat(tokenData.price_change_percentage.h24).toFixed(2)}%` : "-"}
              </Badge>
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
              <Badge variant="secondary" data-testid="badge-volume">
                {loading ? "Loading..." : tokenData?.volume_usd?.h24 ? formatVolume(tokenData.volume_usd.h24) : "$0"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GeckoTerminal Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              NASCORN Price Chart
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
              title="NASCORN Price Chart"
              data-testid="iframe-price-chart"
            />
          </div>
        </CardContent>
      </Card>

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
                  {NASCORN_ADDRESS}
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