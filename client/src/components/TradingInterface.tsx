import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function TradingInterface() {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - todo: remove mock functionality
  const tokenPrice = 0.0042;
  const priceChange = 12.5;
  const volume24h = "1,234,567";

  const handleSwap = async () => {
    setIsLoading(true);
    console.log("Executing swap:", { fromAmount, toAmount });
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    alert("Swap executed successfully!"); // todo: replace with proper toast
  };

  const handleAmountChange = (value: string, isFrom: boolean) => {
    if (isFrom) {
      setFromAmount(value);
      setToAmount((parseFloat(value || "0") * tokenPrice).toFixed(6));
    } else {
      setToAmount(value);
      setFromAmount((parseFloat(value || "0") / tokenPrice).toFixed(6));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Trade NASCORN</h1>
        <p className="text-muted-foreground">Swap tokens on Base network</p>
      </div>

      {/* Price Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">NASCORN Price</p>
              <p className="text-2xl font-bold">${tokenPrice}</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${priceChange > 0 ? 'text-destructive' : 'text-red-500'}`}>
                {priceChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">+{priceChange}%</span>
              </div>
              <p className="text-sm text-muted-foreground">24h Volume: ${volume24h}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Swap Tokens
            <Button variant="ghost" size="icon" data-testid="button-refresh">
              <RefreshCw size={16} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <Label htmlFor="from-amount">From</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="from-amount"
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value, true)}
                  data-testid="input-from-amount"
                />
              </div>
              <div className="flex items-center px-3 py-2 bg-muted rounded-lg min-w-16">
                <span className="font-medium text-sm">ETH</span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-swap-direction">
              <ArrowUpDown size={16} />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label htmlFor="to-amount">To</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="to-amount"
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  onChange={(e) => handleAmountChange(e.target.value, false)}
                  data-testid="input-to-amount"
                />
              </div>
              <div className="flex items-center px-3 py-2 bg-muted rounded-lg min-w-20">
                <span className="font-medium text-sm">NASCORN</span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSwap}
            disabled={!fromAmount || isLoading}
            data-testid="button-execute-swap"
          >
            {isLoading ? "Swapping..." : "Swap Tokens"}
          </Button>

          {/* Transaction Details */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>1 ETH = {(1 / tokenPrice).toFixed(0)} NASCORN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span>~$2.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slippage</span>
              <span>0.5%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Contract: 0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07
        </p>
      </div>
    </div>
  );
}